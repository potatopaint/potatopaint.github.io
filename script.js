let items = [];
const canvas = document.getElementById("the-canvas");
const drawCtx = canvas.getContext("2d");
const previewCanvas = document.getElementById("preview-canvas");
const previewCtx = previewCanvas.getContext("2d");
const rc = rough.canvas(canvas, {options: { roughness: 1.5 }});
const prc = rough.canvas(previewCanvas, {options: { roughness: 1.5 }});
let dragStart = null;
let lastGeneratedItem = null;
const tools = {
  line: { label: "Line", type: "directional" },
  rectangle: { label: "Rectangle", type: "shape" },
  ellipse: { label: "Ellipse", type: "shape" },
  arrowthin: { label: "Arrow (thin)", type: "directional", svgGenerate: generateArrowThinSvgPath },
  arrowthick: { label: "Arrow (thick)", type: "directional", svgGenerate: generateArrowThickSvgPath },
  doublearrowthick: { label: "Doublesided Arrow (thick)", type: "directional", svgGenerate: generateDoubleArrowThickSvgPath },
  windrose: { label: "Windrose", type: "shape", svgGenerate: generateWindroseSvgPath },
  band: { label: "Band", type: "shape", svgGenerate: generateBandaroleSvgPath },
  diamond: { label: "Diamond", type: "shape", svgGenerate: generateDiamondSvgPath },
  cross: { label: "Cross", type: "shape", svgGenerate: generateCrossSvgPath },
  grid: { label: "Grid/Table", type:"shape", svgGenerate: generateGridSvgPath }
};

function generateToolRadioNodes() {
  var nodes = [];
  for (var toolKey in tools) {
    var tool = tools[toolKey];
    var node = document.createElement("label");
    var input = document.createElement("input");
    var t = document.createTextNode(" " + tool.label);
    input.type = "radio";
    input.name = "tool";
    input.id = toolKey;
    input.classList.add("setting");
    node.appendChild(input);
    node.appendChild(t);
    
    nodes.push(node);
    nodes.push(document.createElement("br"))
  }
  nodes.forEach(n => document.getElementById("toolselection").appendChild(n));
  nodes[0].children[0].checked = true; // preselect line
}
generateToolRadioNodes();

function fitCanvasToWindow() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawAll();
}
window.onresize = fitCanvasToWindow;
fitCanvasToWindow();

function clearEverything() {
  items = [];
  drawAll();
}
document.querySelector("#btn-reset").onclick = clearEverything;
document.querySelector("#btn-dl").onclick = function() {
  var dataUrl = canvas.toDataURL();
  var dlLink = document.createElement("a");
  dlLink.href = dataUrl;
  dlLink.download = "canvas.png";
  dlLink.click();
};

items.push(rc.generator.rectangle(20, 20, 110, 80));
// M50,100 A 18 18,1,1,0,70,130 l0,0 A15 15,1,1,0,110,140
//items.push(rc.generator.path("M50,100    A 18 18,1,1,0,70,130 l0,0      A 15, 15,1,1,0,110,140  ", {fill: "red"}));
//items.push(rc.generator.path("M 25,25 a20,20, 1, 0,0, 0,40 h 50 a 20,20 1 0,0, 0,-40 a 10,10, 1, 0,0 -15,-10 a 15,15, 1, 0,0, -35,10 ", {fill: "red"}));

function getCurrentTool() {
  return document.querySelector("[name=tool]:checked").id;
}

function getBgColor() {
  var doBg = document.querySelector("#do-bg").checked;
  if (doBg) {
    return document.querySelector("#bg-color").value;
  }
  return false;
}

function getFillColor() {
  var tool = getCurrentTool();
  if (tool == "line" || tool == "arrowthin")
    return false;
  
  var doFill = document.querySelector("#do-fill").checked;
  if (doFill) {
    var color = document.querySelector("#color-fill").value;
    return color;
  }
  return false;
}

function getLineColor() {
  var doLine = document.querySelector("#do-line").checked;
  if (doLine) {
    var color = document.querySelector("#color-line").value;
    return color;
  }
  return "transparent";
}

function getHachureAngle() {
  return document.querySelector("#hachure-angle").value;
}

function generateArrowThinSvgPath(startX, startY, endX, endY) {
  var tipLength = 25;
  var vector = { x:endX - startX, y:endY - startY };
  var length = Math.hypot(vector.x, vector.y);
  var acos = Math.acos(vector.x / length);
  var asin = Math.asin(vector.y / length);
  var rotateAngle = asin == 0 ? acos : acos * Math.sign(asin);
  
  var vectors = [{type:"M",x:startX,y:startY},{type:"l",x:length,y:0},{x:-tipLength,y:-tipLength},{type:"M",x:endX,y:endY},{x:-tipLength,y:tipLength}];
  
  var transformedVectors = rotateMultipleVectors(vectors, rotateAngle);
  return joinVectorsToSvgPath(transformedVectors);  
// legacy method
//  var length = 30;
//  var angle = Math.PI - Math.PI/4;
//  var vector = {x:endX-startX, y:endY-startY};
//  var right = {x:(vector.x * Math.cos(angle) - vector.y*Math.sin(angle))/Math.hypot(vector.x, vector.y)*length,
//             y:(vector.x * Math.sin(angle) + vector.y*Math.cos(angle))/Math.hypot(vector.x, vector.y)*length};
//  var left = {x:(vector.x * Math.cos(-angle) - vector.y*Math.sin(-angle))/Math.hypot(vector.x, vector.y)*length,
//             y:(vector.x * Math.sin(-angle) + vector.y*Math.cos(-angle))/Math.hypot(vector.x, vector.y)*length};
//  return "M"+startX+","+startY+" l"+vector.x+","+vector.y+" "+
//                          "l"+left.x+","+left.y+" M"+endX+","+endY+" "+
//                           "l"+right.x+","+right.y;
}

function generateArrowThickSvgPath(startX, startY, endX, endY) {
  var vector = { x:endX - startX, y:endY - startY };
  var acos = Math.acos(vector.x / Math.hypot(vector.x, vector.y));
  var asin = Math.asin(vector.y / Math.hypot(vector.x, vector.y));
  var rotateAngle = asin == 0 ? acos : acos * Math.sign(asin);
  var length = Math.hypot(vector.x, vector.y);
  var tipSize = 30;
  var stemWidth = 35;
  var lengthWithoutTip = length < tipSize ? 0 : length-tipSize; // limit length without tip to tip-size
  
  // starte mit spitze
  // 200,200 ist hier endpunkt
  // länge ist hier 130
  // M200,200 l-30,30 l0,-15 l-100,0 l0,-30 l100,0 l0,-15 z
  // vectoren:
  // -30,30 spitzendicke
  // 0,-15
  // -100,0 -(länge-spitzendicke)
  // 0,-30 -spitzendicke
  // 100,0 = länge-spitzendicke
  // 0,-15
  
  // vectors starting from end-point
  var vectors = [{type:"M",x:endX,y:endY},
                 {x:-tipSize,y:tipSize},{x:0,y:-(2*tipSize-stemWidth)/2},{x:-lengthWithoutTip,y:0},
                 {x:0,y:-stemWidth},
                 {x:lengthWithoutTip,y:0},{x:0,y:-(2*tipSize-stemWidth)/2}];

  // rotate vectors to mouse-direction
  var transformedVectors = rotateMultipleVectors(vectors, rotateAngle);
  return joinVectorsToSvgPath(transformedVectors) + " Z";
}

function generateDoubleArrowThickSvgPath(startX, startY, endX, endY) {
  // M220,150 l-30,30 l0,-15 l-100,0 l0,15 l-30,-30 l30,-30 l0,15 l100,0 l0,-15 z
  // hier ist 100 die länge ohne spitzen, 30 die spitzendicke
  var vector = { x:endX - startX, y:endY - startY };
  var acos = Math.acos(vector.x / Math.hypot(vector.x, vector.y));
  var asin = Math.asin(vector.y / Math.hypot(vector.x, vector.y));
  var rotateAngle = asin == 0 ? acos : acos * Math.sign(asin);
  var length = Math.hypot(vector.x, vector.y);
  var tipSize = 30;
  var stemWidth = 35;
  var lengthWithoutTips = length - 2 * tipSize;
  
  // vectors starting from end-point
  var vectors = [{type:"M",x:endX,y:endY},
                 {x:-tipSize,y:tipSize},{x:0,y:-(2*tipSize-stemWidth)/2},{x:-lengthWithoutTips,y:0},
                 {x:0,y:(2*tipSize-stemWidth)/2},{x:-tipSize,y:-tipSize},{x:tipSize,y:-tipSize},{x:0,y:(2*tipSize-stemWidth)/2},
                 {x:lengthWithoutTips,y:0},{x:0,y:-(2*tipSize-stemWidth)/2}];

  // rotate vectors to mouse-direction
  var transformedVectors = rotateMultipleVectors(vectors, rotateAngle);
  return joinVectorsToSvgPath(transformedVectors) + " Z";
}

function generateCrossSvgPath(startX, startY, endX, endY) {
  // M100,100 l10,0 l0,10 l10,0 l0,10 l-10,0 l0,10 l-10,0 l0,-10 l-10,0 l0,-10 l10,0 z
  var hScale = (endX-startX)/30;
  var vScale = (endY-startY)/30;
  var vectors = [{type:"M",x:(startX+10*hScale),y:startY},{x:10,y:0},{x:0,y:10},{x:10,y:0},{x:0,y:10},{x:-10,y:0},{x:0,y:10},{x:-10,y:0},{x:0,y:-10},{x:-10,y:0},{x:0,y:-10},{x:10,y:0}];
  
  var transformedVectors = scaleMultipleVectors(vectors, hScale, vScale);
  return joinVectorsToSvgPath(transformedVectors) + " Z";
}

function generateGridSvgPath(startX, startY, endX, endY) {
  var colCount = document.getElementById("grid-cols").value;
  var rowCount = document.getElementById("grid-rows").value;
  var drawOutline = document.getElementById("grid-outline").checked;
  var horLines = rowCount - 1;
  var verLines = colCount - 1;
  var width = endX - startX;
  var height = endY - startY;

  // border rectangle
  var vectors = [{type:"M",x:startX,y:startY}];
  if (drawOutline)
    vectors = vectors.concat([{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}]);

  // horizontal lines
  var addHorizontalLine = [{type:"m",x:0,y:(1/rowCount)},{x:1,y:0},{type:"m",x:-1,y:0}];
  for (var i = 0; i < horLines; i++) {
    vectors = vectors.concat(addHorizontalLine);
  }

  // move back to origin
  vectors.push({type:"M",x:startX,y:startY});

  // vertical lines
  var addVerticalLine = [{type:"m",x:(1/colCount),y:0},{x:0,y:1},{type:"m",x:0,y:-1}];
  for (var i = 0; i < verLines; i++) {
    vectors = vectors.concat(addVerticalLine);
  }

  var transformedVectors = scaleMultipleVectors(vectors, width, height);
  return joinVectorsToSvgPath(transformedVectors);
};

function generateWindroseSvgPath(startX, startY, endX, endY) {
  // M50,0 l10,30 l18,-8 l-8,18 l30,10 l-30,10 l8,18 l-18,-8 l-10,30 l-10,-30 l-18,8 l8,-18 l-30,-10 l30,-10 l-8,-18 l18,8 z
  var hScale = (endX-startX)/100;
  var vScale = (endY-startY)/100;
  var vectors = [{type:"M",x:(startX+50*hScale),y:startY},{x:10,y:30},{x:18,y:-8}, {x:-8,y:18}, {x:30,y:10}, {x:-30,y:10}, {x:8,y:18}, {x:-18,y:-8}, {x:-10,y:30}, {x:-10,y:-30}, {x:-18,y:8}, {x:8,y:-18}, {x:-30,y:-10}, {x:30,y:-10}, {x:-8,y:-18}, {x:18,y:8}];
  
  var transformedVectors = scaleMultipleVectors(vectors, hScale, vScale);
  return joinVectorsToSvgPath(transformedVectors) + " Z";
}

function generateBandaroleSvgPath(startX, startY, endX, endY) {
  // M50,100 l40,0 l-10,10 l150,0 l-10,-10 l40,0 l5,30 l-5,30 l-30,0 m0,-50 l0,60 l-150,0 l0,-60 l0,50 l-30,0 l-5,-30 l5,-30
  var widthWithoutEnds = endX-startX - 2*30;
  var vectors = [{type:"M",x:startX,y:startY},{x:40,y:0}, {x:-10,y:10}, {x:widthWithoutEnds,y:0}, {x:-10,y:-10}, {x:40,y:0}, {x:5,y:30}, {x:-5,y:30}, {x:-30,y:0}, {x:0,y:-50,type:"m"}, {x:0,y:60}, {x:-widthWithoutEnds,y:0}, {x:0,y:-60}, {x:0,y:50}, {x:-30,y:0}, {x:-5,y:-30}, {x:5,y:-30}];
  var vScale = (endY-startY)/70;
  var transformedVectors = scaleMultipleVectors(vectors, 1, vScale);
  return joinVectorsToSvgPath(transformedVectors);
}

function generateDiamondSvgPath(startX, startY, endX, endY) {
  var vectors = [{type:"M",x:(startX+0.5*(endX-startX)),y:startY},{x:1,y:1},{x:-1,y:1},{x:-1,y:-1},{x:1,y:-1}];
  var transformedVectors = scaleMultipleVectors(vectors, (endX-startX)/2, (endY-startY)/2);
  return joinVectorsToSvgPath(transformedVectors);
}

function rotateMultipleVectors(vectors, angle) {
  return vectors.map(v => {
    if (v.type && v.type === v.type.toUpperCase())
      return v;
    return {
      ...v,
      x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
      y: v.x * Math.sin(angle) + v.y * Math.cos(angle)
    };
  });
}

function scaleMultipleVectors(vectors, hScale, vScale) {
  return vectors.map(v => {
    if (v.type && v.type === v.type.toUpperCase())
      return v;
    return {
      ...v,
      x: v.x * hScale,
      y: v.y * vScale
    };
  });
}

function joinVectorsToSvgPath(vectors) {
  var path = vectors.map(v => (v.type ? v.type : "l") + v.x + "," + v.y).join(" ");
  return path;
}

function generateItemWithCurrentSettings(currentDrag) {
  return generateItem(dragStart.x, dragStart.y, currentDrag.offsetX, currentDrag.offsetY, currentDrag.shiftKey);
}

function createCurrentOptionsObject() {
  var options = {};
  var fillColor = getFillColor();
  if (fillColor != false) {
    options = {
      ...options,
      fill: fillColor
    };
  }
  options = {
    ...options,
    stroke: getLineColor(),
    hachureAngle: getHachureAngle()
  };
  return options;
}

function generateItem(startX, startY, endX, endY, forceAngular) {
  var toolKey = getCurrentTool();
  var tool = tools[toolKey];
  var options = createCurrentOptionsObject();
  var w = endX-startX;
  var h = endY-startY;
  
  if (forceAngular) {
    if (tool.type === "shape") {
      var abs = Math.max(Math.abs(w), Math.abs(h));
      w = abs * (w / Math.abs(w));
      h = abs * (h / Math.abs(h));
    } else if (tool.type === "directional") {
      var abs = Math.max(Math.abs(w), Math.abs(h));
      var WHratio = w / h;
      var HWratio = h / w;
      
      // corners topleft, topright, bottomleft, bottomright
      w = abs * (w / Math.abs(w));
      h = abs * (h / Math.abs(h));
      
      // special cases for far-right, far-left, far-top, far-bottom
      if (Math.abs(WHratio) > 2.41) {
        // left and right fixed
        h = 0;
      } else if (Math.abs(HWratio) > 2.41) {
        w = 0;
      }
    }
  }
  
  var x = startX;
  var y = startY;
  if (toolKey == "line") {
    return rc.generator.line(x, y, x+w, y+h, options);
  } else if (toolKey == "rectangle") {
    return rc.generator.rectangle(x, y, w, h, options);
  } else if (toolKey == "ellipse") {
    return rc.generator.ellipse(x + w/2, y + h/2, w, h, options);
  } else if(typeof(tool.svgGenerate) === "function") {
    var svgPath = tool.svgGenerate(x, y, x+w, y+h);
    return rc.generator.path(svgPath, options);
  }
  return false;
}

function drawCurrent(currentDrag) {
  if (dragStart && currentDrag) {
    lastGeneratedItem = generateItemWithCurrentSettings(currentDrag);
    if (lastGeneratedItem) {
      rc.draw(lastGeneratedItem);
    }
  }
}

function drawAll(currentDrag) {
  var bgColor = getBgColor();
  if (bgColor == false) {
    drawCtx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    drawCtx.fillStyle = bgColor;
    drawCtx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  items.forEach(r => {
    rc.draw(r);
  });
  
  drawCurrent(currentDrag);
  
  //drawCtx.fillStyle = "#00ff00";
  //drawCtx.strokeStyle="#000000";
  //drawCtx.fillRect(17, 17, 6, 6);
  //drawCtx.strokeRect(17, 17, 6, 6);
}
drawAll();

function drawPreview() {
  var bgColor = getBgColor();
  if (bgColor == false) {
    previewCtx.clearRect(0, 0, previewCanvas.width, canvas.height);
  } else {
    previewCtx.fillStyle = bgColor;
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  }
  
  var item = false;
  switch(getCurrentTool()) {
    case "windrose":
    case "diamond":
    case "cross":
      item = generateItem(90, 5, 160, 65);
      break;
    case "band":
      item = generateItem(30, 10, 200, 60);
      break;
    default:
      item = generateItem(30, 50, 200, 20);
      break;
  }
  if (item) {
    prc.draw(item);
  }
}
document.querySelectorAll(".setting").forEach(e => e.addEventListener("change", drawPreview));
drawPreview();

canvas.onmousedown = function(evt) {
  dragStart = {
    x: evt.offsetX,
    y: evt.offsetY
  }
};

canvas.onmousemove = function(evt) {
  document.getElementById("mouse").innerText = evt.offsetX + " | " + evt.offsetY;
  if (dragStart) {
    drawAll(evt);
    // TODO this currently does not take into account when user presses shift!!!
    document.getElementById("draw").innerText = (evt.offsetX-dragStart.x) + " | " + (evt.offsetY-dragStart.y);
  }
};

canvas.onmouseup = function(evt) {
  var item = lastGeneratedItem;
  dragStart = null;
  document.getElementById("draw").innerText = "- | -";
  if (item) {
    items.push(item);
    lastGeneratedItem = false;
    drawAll();
  }
};
