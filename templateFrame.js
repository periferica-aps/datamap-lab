// ============================================================
// templateFrame.js
// ============================================================

const FRAME_MARGIN_X = 50;        // margini laterali dello sketch
const FRAME_MARGIN_TOP = 200;      // margine superiore dello sketch
const FRAME_MARGIN_BOTTOM = 200;   // margine inferiore dello sketch

const FRAME_HEADER_Y = 70;        // distanza del testo HEADER dal bordo superiore
const FRAME_FOOTER_Y = 70;        // distanza del testo FOOTER dal bordo inferiore

const TOP_LEFT_TEXT = "PERIFERICA APS";
const TOP_RIGHT_TEXT = "MINIMETRÒ PERUGIA";

const BOTTOM_LEFT_TEXT = "MINIMETRÒ PERUGIA";
const BOTTOM_RIGHT_TEXT = "TRACCIATI 2026";

const FRAME_TEXT_COLOR = '#FFFFFF';
const FRAME_FONT_SIZE = 25;
const FRAME_LETTER_SPACING = 1.1;

function loadFrameAssets() {}

function drawTemplateFrame() {
  push();

  noStroke();
  fill(FRAME_TEXT_COLOR);

  if (typeof sourceCodeProRegular !== "undefined" && sourceCodeProRegular) {
    textFont(sourceCodeProRegular);
  } else {
    textFont("Source Code Pro");
  }
  textSize(FRAME_FONT_SIZE);
  textStyle(NORMAL);
  textLeading(FRAME_FONT_SIZE);

  // header allineato in ALTO: FRAME_HEADER_Y = distanza schermo→cima del testo
  textAlign(LEFT, TOP);
  drawTrackedText(
    TOP_LEFT_TEXT,
    FRAME_MARGIN_X,
    FRAME_HEADER_Y,
    FRAME_LETTER_SPACING
  );

  drawTrackedTextRight(
    TOP_RIGHT_TEXT,
    width - FRAME_MARGIN_X,
    FRAME_HEADER_Y,
    FRAME_LETTER_SPACING
  );

  // footer allineato in BASSO: FRAME_FOOTER_Y = distanza fondo del testo→schermo,
  // così il margine sotto è simmetrico a quello sopra
  textAlign(LEFT, BOTTOM);

  const footerBaseY = height - FRAME_FOOTER_Y;
  fill(FRAME_TEXT_COLOR);
  drawTrackedText(
    BOTTOM_LEFT_TEXT,
    FRAME_MARGIN_X,
    footerBaseY,
    FRAME_LETTER_SPACING
  );

  drawTrackedTextRight(
    BOTTOM_RIGHT_TEXT,
    width - FRAME_MARGIN_X,
    height - FRAME_FOOTER_Y,
    FRAME_LETTER_SPACING
  );

  pop();
}

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

function drawTrackedText(str, x, y, spacing) {
  let cx = x;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    text(ch, cx, y);
    cx += textWidth(ch) + spacing;
  }
}

function drawTrackedTextRight(str, rightX, y, spacing) {
  const totalW = trackedTextWidth(str, spacing);
  drawTrackedText(str, rightX - totalW, y, spacing);
}

function trackedTextWidth(str, spacing) {
  let w = 0;

  for (let i = 0; i < str.length; i++) {
    w += textWidth(str[i]);

    if (i < str.length - 1) {
      w += spacing;
    }
  }

  return w;
}
