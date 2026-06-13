// ============================================================
// DATAMAP — titolo animato (formato verticale 9:16)
//
// Replica del manifesto datamapvid.pdf, animato come video.gif.
// Una griglia di parole "DATAMAP" (3 colonne x N righe). Una sola
// FASCIA DIAGONALE alla volta ha le lettere DISTANZIATE
// ( D A T A M A P ); tutte le altre parole sono COMPATTE ( DATAMAP ).
// La fascia scorre lateralmente tra le colonne, in loop, con una
// leggera inclinazione (la colonna "aperta" slitta scendendo).
// ============================================================

// ---------------- PARAMETRI REGOLABILI ----------------

const WORD = "DATAMAP";   // la parola dentro la griglia
const NCOLS = 3;          // colonne di parole per riga
const NROWS = 30;         // righe della griglia

// movimento dell'allungamento che scorre tra le 3 parole
const TRAVEL_PERIOD = 1.5;   // secondi per passare da una parola alla successiva
const BAND_HALF = 0.92;      // mezza-larghezza della fascia (in parole)
const BAND_TILT = 1.2;       // di quante parole si inclina lungo tutta l'altezza
const SPREAD_EASE = 1.0;     // morbidezza dell'apertura (1 = coseno)

// distanza standard tra le lettere delle parole COMPATTE (px aggiuntivi
// oltre al passo naturale del monospace). 0 = lettere attaccate.
const TRACKING = 2;

// ---- geometria (riferimento 9:16, poi scalata alla finestra) ----
const REF_W = 540;
const REF_H = 960;

const GRID_LEFT = 30;
const GRID_RIGHT = 510;
const GRID_TOP = 34;
const GRID_BOTTOM = 772;
const FONT_FRAC = 0.74;      // dimensione testo in frazione dell'altezza riga

// ---- footer (come nel pdf) ----
const FOOT_SIZE = 12.5;
const FOOT_LH = 22;          // interlinea
const FOOT_Y = 858;          // prima riga del footer
const FOOT_L1 = "DATAMAP LAB";
const FOOT_L2 = "MINIMETRÒ PERUGIA";
const FOOT_R1 = "PERIFERICA APS";
const FOOT_R2 = "PROGETTO TRACCIATI 2026";

// ---- QR (in basso a sinistra, prima delle scritte del footer) ----
const QR_GAP = 14;           // spazio tra QR e testo del footer

// ------------------------------------------------------

let ROWH, FONT, CHADV, QR;
let sourceCodeProRegular, sourceCodeProBold;

function preload() {
  sourceCodeProRegular = loadFont("../fonts/SourceCodePro-Regular.ttf");
  sourceCodeProBold = loadFont("../fonts/SourceCodePro-Bold.ttf");
  QR = loadImage("qr.png");
}

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  textFont(sourceCodeProRegular);
  ROWH = (GRID_BOTTOM - GRID_TOP) / NROWS;
  FONT = ROWH * FONT_FRAC;
}

function draw() {
  background(0);

  // palco 9:16 centrato nella finestra
  const s = min(width / REF_W, height / REF_H);
  const ox = (width - REF_W * s) / 2;
  const oy = (height - REF_H * s) / 2;
  const T = millis() * 0.001;

  push();
  translate(ox, oy);
  scale(s);

  // sfondo del palco (nero pieno)
  noStroke();
  fill(0);
  rect(0, 0, REF_W, REF_H);

  // centro della fascia aperta che scorre tra le colonne, in loop.
  // periodo intero = attraversare tutte le colonne e ricominciare.
  const W = (T / TRAVEL_PERIOD) % NCOLS;

  textSize(FONT);
  textStyle(NORMAL);
  CHADV = textWidth("D"); // monospace: avanzamento costante per lettera

  fill('#FFFFFF');
  textAlign(LEFT, CENTER);

  const chars = [...WORD];
  const wordLen = chars.length;
  const gaps = wordLen - 1;            // spazi interni alla parola
  const restGap = CHADV + TRACKING;    // passo standard tra lettere (a riposo)
  const sepW = CHADV + TRACKING;       // separatore tra le parole (uno spazio)

  // la riga è UN unico flusso continuo: NCOLS parole compatte affiancate.
  // tutto lo spazio che avanza viene "donato" alla parola allungata, così
  // la riga riempie sempre l'intera larghezza senza buchi tra le colonne.
  const gridW = GRID_RIGHT - GRID_LEFT;
  const baseW = NCOLS * (wordLen * CHADV + gaps * TRACKING) + (NCOLS - 1) * sepW;
  const extra = max(0, gridW - baseW); // spazio totale da distribuire

  for (let r = 0; r < NROWS; r++) {
    const cy = GRID_TOP + (r + 0.5) * ROWH;
    // la parola "aperta" slitta scendendo (allungamento diagonale)
    const center = W + (r / (NROWS - 1)) * BAND_TILT;

    // peso di apertura di ciascuna parola; normalizzato così che la somma
    // dell'extra distribuito sia sempre = extra (riga sempre piena).
    let weights = [];
    let sumW = 0;
    for (let c = 0; c < NCOLS; c++) {
      const w = bandSpread(c, center);
      weights.push(w);
      sumW += w;
    }
    if (sumW < 1e-6) sumW = 1;

    let cursor = GRID_LEFT;
    for (let c = 0; c < NCOLS; c++) {
      const add = extra * (weights[c] / sumW); // larghezza extra di questa parola
      const gapAdd = add / gaps;               // distribuita tra le sue lettere
      for (let i = 0; i < wordLen; i++) {
        text(chars[i], cursor, cy);
        cursor += CHADV;
        if (i < gaps) cursor += restGap - CHADV + gapAdd; // tracking + extra
      }
      if (c < NCOLS - 1) cursor += sepW;       // spazio tra le parole
    }
  }

  drawFooter();
  pop();
}

// quanta apertura ha una cella in colonna c rispetto al centro della
// fascia. Distanza calcolata sul cerchio delle colonne -> loop continuo.
function bandSpread(c, center) {
  let d = abs(((c - center) % NCOLS + NCOLS) % NCOLS);
  d = min(d, NCOLS - d);               // distanza circolare
  if (d >= BAND_HALF) return 0;
  const t = d / BAND_HALF;             // 0 al centro, 1 al bordo
  const v = 0.5 * (1 + cos(PI * t));   // bump morbido
  return pow(v, SPREAD_EASE);
}

function drawFooter() {
  textStyle(NORMAL);
  textSize(FOOT_SIZE);

  // QR in basso a sinistra, alto esattamente quanto il blocco di due righe:
  // dal bordo superiore della 1ª riga (DATAMAP LAB) alla base della 2ª (PERIFERICA APS)
  const qrTop = FOOT_Y - textAscent();
  const qrBot = FOOT_Y + FOOT_LH;
  const qrSize = qrBot - qrTop;
  if (QR) image(QR, GRID_LEFT, qrTop, qrSize, qrSize);

  const textLeft = GRID_LEFT + qrSize + QR_GAP; // testo dopo il QR

  fill('#FFFFFF');

  textAlign(LEFT, BASELINE);
  text(FOOT_L1, textLeft, FOOT_Y);
  text(FOOT_L2, textLeft, FOOT_Y + FOOT_LH);

  textAlign(RIGHT, BASELINE);
  text(FOOT_R1, GRID_RIGHT, FOOT_Y);
  text(FOOT_R2, GRID_RIGHT, FOOT_Y + FOOT_LH);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
