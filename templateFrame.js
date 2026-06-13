// ============================================================
// templateFrame.js
// ============================================================

const FRAME_MARGIN_X = 50;        // margini laterali dello sketch
const FRAME_MARGIN_TOP = 200;      // margine superiore dello sketch
const FRAME_MARGIN_BOTTOM = 200;   // margine inferiore dello sketch

function loadFrameAssets() {}

// La cornice conserva soltanto lo spazio vuoto attorno allo sketch.
// Header e footer sono intenzionalmente assenti nelle tavole animate.
function drawTemplateFrame() {}

function getSketchArea() {
  return {
    x: FRAME_MARGIN_X,
    y: FRAME_MARGIN_TOP,
    w: width - FRAME_MARGIN_X * 2,
    h: height - FRAME_MARGIN_TOP - FRAME_MARGIN_BOTTOM
  };
}

function applySketchClip() {
  const area = getSketchArea();

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(area.x, area.y, area.w, area.h);
  drawingContext.clip();

  return area;
}

function removeSketchClip() {
  drawingContext.restore();
}
