/* ============================================================
   CORTONESE — "AFFECT GRID ORBITALE"
   Progetto Tracciati 2026 · DATA MAP LAB · Periferica APS
   Stazione Minimetrò di Perugia · formato verticale 9:16

   Autori:
     Giacomo Lazzerini
     Caterina Cardinali  (studentessa)
     Valentina Gaggia    (studentessa)

   ------------------------------------------------------------
   COSA FA L'ANIMAZIONE
   ------------------------------------------------------------
   I dati su interazione e condivisione dello spazio nel Minimetrò
   sono disposti su un GRAFICO A QUATTRO QUADRANTI (una griglia 5×5):
     • asse X = ENERGIA   -> quanto la persona si sente attiva
     • asse Y = CONTENTEZZA -> quanto la persona si sente contenta
   Le due risposte (energia, contentezza), arrotondate a 1..5,
   collocano ogni questionario in una delle 25 celle.

   Niente "entrata in scena": i nuclei si FORMANO nel tempo. Le
   risposte compaiono in ordine cronologico (colonna "Submitted At");
   ognuna è un PUNTO = una persona, colorato per STAZIONE DI PARTENZA.
   Più risposte cadono in una cella, più il suo nucleo cresce e si fa
   irregolare; il MIX di colori dentro il nucleo racconta da quali
   stazioni arrivano le persone di quel quadrante.

   Attorno a ogni nucleo ruotano ORBITE fatte con le PAROLE-emozione
   lasciate dai passeggeri (parole diverse, non una sola ripetuta).
   Le codifiche (vedi legenda):
     • GRANDEZZA del nucleo  -> numero di persone in quella cella
     • N° di ANELLI/orbite   -> voglia media di scambiare parole con
                                gli altri (disponibilità a relazionarsi)
     • VELOCITÀ di rotazione -> "velocità percepita" media del viaggio
     • COLORE dei punti/lettere -> stazione di partenza

   Quando tutte le risposte sono comparse: breve pausa (hold), poi il
   grafico si svuota rapidamente (shrink) e il loop riparte da capo.

   Stile: motion design pulito. Tinte piatte, niente gradienti /
   trasparenze decorative / contorni / linee nere.

   ------------------------------------------------------------
   COME È FATTO (per chi vuole riutilizzarlo)
   ------------------------------------------------------------
   • I dati sono letti da ../dati.csv e aggregati a runtime in
     parseData(): le risposte vengono ordinate per tempo e suddivise
     in "celle" (combinazioni energia,contentezza).
   • Il LOOP TEMPORALE ha 4 fasi (CFG: buildDur/holdDur/outDur/gapDur)
     gestite da loopState(): build (accumulo) → hold (fermo) → out
     (svuotamento) → gap (pausa). È pensato per esportare un video
     in loop seamless (vedi setupExport / export.html).
   • Tutto è disegnato nello spazio nativo W×H e poi scalato dentro la
     cornice condivisa (drawSketchScaled + templateFrame.js).
   • I punti sono impacchettati con disposizione a phyllotaxis (angolo
     aureo) in buildLayout; le orbite seguono la silhouette del nucleo
     (ropeRadiusAt) e prendono colore da una "maschera angolare"
     proporzionale alla composizione di stazioni (angularColor).

   Tasti (solo in anteprima): SPAZIO = pausa · R = riavvia · ↑/↓ = velocità · F = fullscreen
   ============================================================ */

const CSV_NAME = '../dati.csv';

const EXPORT_MODE = true;
const EXPORT_W = 1080;
const EXPORT_H = 1920;

// --- integrazione cornice (templateFrame.js) ---
const OUT_W = 1080, OUT_H = 1920;   // canvas finale (cornice)
const W = 1080, H = 1920;           // spazio nativo dello sketch (createCanvas originale)

// --- EXPORT offline deterministico ---
// Attivo SOLO se la pagina (export.html) definisce window.__EXPORT prima di
// caricare questo file. Nell'uso normale (index.html) resta null → zero effetti.
const EXPORT = (typeof window !== 'undefined' && window.__EXPORT) ? window.__EXPORT : null;
let exportFrameIdx = 0;

// indici colonne CSV
const COL = {
  station:  0,
  energy:   12,
  happy:    13,
  word:     15,   // "C'è una parola che si avvicina a quello che senti?"
  exchange: 22,   // "...a mio agio nello scambiare qualche parola..."
  speed:    25,   // "Quanto ti sembra veloce questo viaggio?" (1..10)
  time:     27    // "Submitted At"  (gg/mm/aaaa hh.mm.ss)
};

const CFG = {
  ratioW: 9,
  ratioH: 16,
  bg: '#000000',

  // palette piatta, coesa, non neon (tipo Tableau)
  stationColors: {
    'Pian Di Massiano': '#3D7BD9',
    'Cortonese':        '#9B59B6',
    'Madonna Alta':     '#2ECC71',
    'Fontivegge':       '#F1C40F',
    'Case Bruciate':    '#E74C3C',
    'Cupa':             '#1ABC9C',
    'Pincetto':         '#E67E22'
  },
  defaultStationColor: '#9aa0a6',

  // ---- GRIGLIA DATI (inset, così i blob non coprono le etichette) ----
  grid: { left: 0.18, right: 0.82, top: 0.120, bottom: 0.73 },
  xAxisLabelMargin: 0.04, // distanza etichette asse x dal bordo (quota della larghezza)

  // ---- DOT PACKING ----
  clusterMaxFrac:  0.25,   // raggio del cluster più grande (× cellUnit)
  discSpacing:     1.45,   // packing phyllotaxis (× discR) — <1.6 = punti agglomerati
  discJitterR:     0.30,  // disordine raggio per punto
  discJitterA:     0.20,   // disordine angolo per punto (rad)
  dotDiameterMul:  2.35,   // diametro visivo punto = discR × questo valore
  popSpanIdx:      2.0,    // su quante "risposte" si distende il pop di un punto

  // ---- ANELLI DI PAROLE ----
  wordColor:     '#E8E8E8',
  wordSizeFrac:  0.078,    // × cellUnit
  wordWeight:    600,
  uppercase:     true,
  firstGapFrac:  0.75,     // × wordSize (stacco cluster → 1° anello)
  firstGapGrowFrac: 0.28,  // stacco extra 1° anello mentre il blob cresce (× raggio blob)
  ringGapFrac:   1.30,     // × wordSize (stacco tra anelli)
  wordGapFrac:   1.10,     // × wordSize (stacco minimo tra parole su un anello)
  letterGapFrac: 0.08,     // × wordSize (respiro tra lettere sulle orbite curve)
  wordRevealSpanIdx: 3.2,  // tempo di comparsa parola, in numero di risposte
  ringFadeSpan: 0.65,      // morbidezza ingresso di un nuovo anello
  orbitConformEase: 0.055, // inerzia con cui le orbite seguono nuove conformazioni del blob
  silhouetteFollowFrac: 0.80, // quanto la corda segue davvero la silhouette del blob
  silhouetteSpread: 0.58, // morbidezza angolare della silhouette
  baseAngularSpeed: 0.16,  // rad/s
  speedScale:       0.20, // contributo della velocità percepita

  // ---- LOOP TEMPORALE (secondi) ----
  buildDur: 36,            // accumulo di tutte le risposte
  holdDur:  36,           // grafico completo fermo (orbite continuano)
  outDur:   1.0,           // svuotamento rapido (shrink)
  gapDur:   2.3,           // pausa a grafico vuoto prima di ripartire

  fontFamily: "Source Code Pro",
  showLegend: true,

  // ---- RENDERING NITIDO ----
  // moltiplicatore di supersampling: la pixelDensity reale =
  // densità del display × superSample. >1 = backing buffer più fitto del
  // display → testi ruotati e curve antialiased (più liscio, più costoso).
  superSample: 1
};

let table;
let RESPONSES = [];          // tutte le risposte, ordinate per tempo
let CELLS = [];              // celle (energia,contentezza)
let dataReady = false;
let fontReady = false;
let total = 0;
let maxCount = 1;

let discR = 4;
let cellUnitPx = 0;
let layoutKey = '';

let tStart = 0;
let paused = false, pausedAt = 0;
let speedMul = 1;
let sourceCodeProRegular, sourceCodeProBold;

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/* ---------- preload / setup ---------- */

function preload(){
  sourceCodeProRegular = loadFont('../fonts/SourceCodePro-Regular.ttf');
  sourceCodeProBold = loadFont('../fonts/SourceCodePro-Bold.ttf');
  loadFrameAssets();
  table = loadTable(CSV_NAME, 'csv', 'header',
    () => { parseData(); dataReady = true; },
    (e) => { console.error('CSV non caricato:', e); }
  );
}

function setup(){
  if (EXPORT){
    // densità fissa (supersampling), indipendente dal display; le fasi del
    // loop possono essere ridefinite dalla pagina di export.
    pixelDensity(EXPORT.ss || 2);
    if (EXPORT.build != null) CFG.buildDur = EXPORT.build;
    if (EXPORT.hold  != null) CFG.holdDur  = EXPORT.hold;
    if (EXPORT.out   != null) CFG.outDur   = EXPORT.out;
    if (EXPORT.gap   != null) CFG.gapDur   = EXPORT.gap;
  } else {
    // Il canvas è già 1080×1920: densità 1 evita buffer GPU enormi nella landing.
    pixelDensity(1);
  }

  createCanvas(OUT_W, OUT_H);
  textFont(sourceCodeProRegular);
  frameRate(60);
  tStart = millis();
  if (dataReady) buildLayout();

  // L'animazione parte solo a font pronto: niente swap iniziale dal fallback.
  // Finché fontReady è false, draw() dipinge solo il nero (vedi draw()).
  waitForFont();

  if (EXPORT) setupExport();
}

// API per il rendering deterministico frame-by-frame usata da export.html.
// Ogni frame è calcolato dal suo indice (tempo = idx/fps), quindi l'output è
// identico a ogni esecuzione e non dipende dalla velocità reale di rendering.
function setupExport(){
  noLoop();
  EXPORT.fps = EXPORT.fps || 25;
  const cycle = CFG.buildDur + CFG.holdDur + CFG.outDur + CFG.gapDur;
  EXPORT.frames = Math.round(EXPORT.fps * cycle);   // un ciclo intero = loop seamless
  window.__exportReady     = () => fontReady && dataReady;
  window.__exportInfo      = () => ({ frames: EXPORT.frames, fps: EXPORT.fps, w: OUT_W, h: OUT_H, cycleSec: cycle });
  window.__exportDrawFrame = (i) => { exportFrameIdx = i; redraw(); };
}

// Carica davvero i pesi 400 e 700 di Source Code Pro (richiesti dal CDN via
// <link> in index.html) e sblocca il rendering solo quando sono disponibili.
function waitForFont(){
  const fam = '"' + CFG.fontFamily + '"';
  const startClock = () => {
    fontReady = true;
    tStart = millis();          // azzera il tempo: il loop parte da font pronto
  };

  if (document.fonts && document.fonts.load){
    Promise.all([
      document.fonts.load('400 16px ' + fam),
      document.fonts.load('700 16px ' + fam)
    ])
      .then(() => document.fonts.ready)
      .then(startClock)
      .catch(startClock);       // in caso di errore rete: parti comunque
  } else {
    startClock();               // ambienti senza Font Loading API
  }
}

function windowResized(){
  if (!EXPORT_MODE){
    const c = computeCanvas();
    resizeCanvas(c.w, c.h);
  }
}

/* ---------- parsing ---------- */

function num(s){
  const v = parseFloat(String(s).replace(',', '.'));
  return isNaN(v) ? null : v;
}
function cleanStr(s){ return String(s || '').trim(); }

// "08/05/2026 14,20,15" -> millisecondi
function parseTime(s){
  const m = cleanStr(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[.,:\s](\d{1,2})[.,:\s](\d{1,2})$/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime();
}

// Legge il CSV grezzo e lo trasforma in:
//   RESPONSES = elenco di risposte ordinate per tempo (guida l'accumulo)
//   CELLS     = celle della griglia (energia,contentezza) con i loro punti
// Qui si fa anche il "packing slot" (posizione del punto nel cluster) e si
// assegna il colore di stazione a ogni risposta.
function parseData(){
  const rows = table.getRowCount();
  const list = [];

  for (let r = 0; r < rows; r++){
    const energy = num(table.getString(r, COL.energy));
    const happy  = num(table.getString(r, COL.happy));
    if (energy === null || happy === null) continue;

    const e = constrain(Math.round(energy), 1, 5);
    const h = constrain(Math.round(happy),  1, 5);
    const exchange = num(table.getString(r, COL.exchange));
    const speed    = num(table.getString(r, COL.speed));
    const t        = parseTime(table.getString(r, COL.time));

    let word = cleanStr(table.getString(r, COL.word));
    if (CFG.uppercase) word = word.toUpperCase();

    list.push({
      energy: e, happy: h,
      exchange: exchange === null ? null : constrain(Math.round(exchange), 1, 5),
      speed:    speed === null ? null : constrain(speed, 1, 10),
      word,
      station:  cleanStr(table.getString(r, COL.station)) || 'Sconosciuta',
      time:     t === null ? 0 : t
    });
  }

  // ordine cronologico: guida l'accumulo
  list.sort((a, b) => a.time - b.time);

  const buckets = new Map();
  RESPONSES = [];
  for (let i = 0; i < list.length; i++){
    const resp = list[i];
    resp.gi = i;                              // indice globale (tempo)
    RESPONSES.push(resp);

    const key = resp.energy + ',' + resp.happy;
    if (!buckets.has(key)) buckets.set(key, []);
    const arr = buckets.get(key);
    resp.slot = arr.length;                   // posizione di packing nel cluster
    resp.col  = CFG.stationColors[resp.station] || CFG.defaultStationColor;
    arr.push(resp);
  }

  total = RESPONSES.length;
  maxCount = 1;
  CELLS = [];
  for (const [key, items] of buckets){
    const [e, h] = key.split(',').map(Number);
    maxCount = Math.max(maxCount, items.length);
    CELLS.push({
      energy: e, happy: h,
      items,
      center: null,
      phase: hash01(e * 31 + h * 7) * TWO_PI,  // angolo base anelli, stabile
      orbitReveal: 0,
      orbitLastT: null,
      ringAngles: [0, 0, 0, 0]
    });
  }

  console.log('Risposte:', total, '· celle:', CELLS.length, '· n max cella:', maxCount);
}

/* ---------- hash deterministico (jitter stabile) ---------- */

function hash01(n){
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hashString01(s){
  let h = 2166136261;
  for (let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/* ---------- layout ---------- */

function computeCanvas(){
  if (EXPORT_MODE) return { w: EXPORT_W, h: EXPORT_H };
  let h = windowHeight;
  let w = h * CFG.ratioW / CFG.ratioH;
  if (w > windowWidth){ w = windowWidth; h = w * CFG.ratioH / CFG.ratioW; }
  return { w: Math.floor(w), h: Math.floor(h) };
}

function gridBounds(){
  const g = CFG.grid;
  return { left: W * g.left, right: W * g.right,
           top: H * g.top, bottom: H * g.bottom };
}

function cellUnit(){
  const b = gridBounds();
  return Math.min((b.right - b.left) / 4, (b.bottom - b.top) / 4);
}

// Centro a schermo della cella (e,h): X dall'energia, Y dalla contentezza.
// e,h in 1..5 vengono rimappati su [-1,+1] rispetto al centro 3 della griglia.
function cellCenter(e, h){
  const b = gridBounds();
  const cx = (b.left + b.right) / 2;
  const cy = (b.top + b.bottom) / 2;
  const halfW = (b.right - b.left) / 2;
  const halfH = (b.bottom - b.top) / 2;
  return { x: cx + ((e - 3) / 2) * halfW, y: cy - ((h - 3) / 2) * halfH };
}

function buildLayout(){
  cellUnitPx = cellUnit();
  const u = cellUnitPx;

  // discR tale che il cluster più grande ≈ clusterMaxFrac × cellUnit
  const denom = CFG.discSpacing * Math.sqrt(Math.max(0, maxCount - 1)) + 1;
  discR = constrain((u * CFG.clusterMaxFrac) / denom, 2.5, u * 0.11);

  const c = discR * CFG.discSpacing;

  for (const cell of CELLS){
    cell.center = cellCenter(cell.energy, cell.happy);
    for (const resp of cell.items){
      const i = resp.slot;
      const jr = 1 + (hash01(resp.gi * 1.7 + 3.1) * 2 - 1) * CFG.discJitterR;
      const ja = (hash01(resp.gi * 2.3 + 9.7) * 2 - 1) * CFG.discJitterA;
      const ang = i * GOLDEN + ja;
      const rad = c * Math.sqrt(i) * jr;
      resp.px = Math.cos(ang) * rad;
      resp.py = Math.sin(ang) * rad;
    }
  }

  layoutKey = W + 'x' + H;
}

// raggio del cluster con `n` punti già comparsi (per posizionare gli anelli)
function clusterRadius(n){
  if (n <= 0) return 0;
  const c = discR * CFG.discSpacing;
  return c * Math.sqrt(Math.max(0, n - 1)) + dotVisualRadius() * 1.1;
}

function dotVisualRadius(){
  return discR * CFG.dotDiameterMul * 0.5;
}

function cellSoftCount(cell, revealedFloat){
  let nSoft = 0;
  for (const resp of cell.items){
    const local = (revealedFloat - resp.gi) / CFG.popSpanIdx;
    if (local <= 0) continue;
    nSoft += constrain(local, 0, 1);
  }
  return nSoft;
}

function angleDistance(a, b){
  let d = Math.abs(a - b) % TWO_PI;
  return d > PI ? TWO_PI - d : d;
}

// Profilo morbido tipo corda: cresce con il blob e segue la silhouette reale
// dei punti visibili senza agganciarsi in modo nervoso a un singolo punto.
function ropeRadiusAt(cell, revealedFloat, a){
  const nSoft = cellSoftCount(cell, revealedFloat);
  if (nSoft <= 0) return 0;

  const baseR = clusterRadius(nSoft);
  const spread = CFG.silhouetteSpread * constrain(1.7 / Math.sqrt(nSoft), 0.55, 1.25);
  let shapedR = baseR * 0.78;

  for (const resp of cell.items){
    const local = (revealedFloat - resp.gi) / CFG.popSpanIdx;
    if (local <= 0) continue;

    const grow = constrain(local, 0, 1);
    const pa = Math.atan2(resp.py, resp.px);
    const d = angleDistance(a, pa);
    if (d > spread) continue;

    const influence = 0.5 + 0.5 * Math.cos(PI * d / spread);
    const pointR = Math.sqrt(resp.px * resp.px + resp.py * resp.py) + dotVisualRadius() * (0.9 + 0.25 * grow);
    shapedR = Math.max(shapedR, lerp(baseR * 0.72, pointR, influence * grow));
  }

  return lerp(baseR, shapedR, CFG.silhouetteFollowFrac);
}

function orbitPoint(cell, revealedFloat, a, orbitOffset){
  const R = ropeRadiusAt(cell, revealedFloat, a) + orbitOffset;
  return { x: Math.cos(a) * R, y: Math.sin(a) * R, r: R };
}

function updateOrbitMotion(cell, targetReveal, tSec, omega){
  if (cell.orbitLastT === null || tSec < cell.orbitLastT || targetReveal < cell.orbitReveal){
    cell.orbitReveal = targetReveal;
    cell.orbitLastT = tSec;
    return;
  }

  const dt = constrain(tSec - cell.orbitLastT, 0, 0.12);
  cell.orbitLastT = tSec;
  cell.orbitReveal = lerp(cell.orbitReveal, targetReveal, CFG.orbitConformEase);

  for (let j = 0; j < cell.ringAngles.length; j++){
    const dir = (j % 2 === 0) ? 1 : -1;
    cell.ringAngles[j] += omega * dir * dt;
  }
}

/* ---------- easing ---------- */

function easeOutBack(t){
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeInCubic(t){ return t * t * t; }

/* ---------- stato del loop ---------- */

// Dato il tempo in secondi, restituisce lo stato dell'animazione dentro il
// ciclo (build/hold/out/gap):
//   revealedFloat = quante risposte sono "comparse" finora (frazionario)
//   gOut          = fattore di scala 1→0 durante lo svuotamento finale
//   phase         = nome della fase corrente
function loopState(tSec){
  const { buildDur: TB, holdDur: TH, outDur: TO, gapDur: TG } = CFG;
  const cycle = TB + TH + TO + TG;
  const t = ((tSec % cycle) + cycle) % cycle;

  let revealedFloat = total, gOut = 1, phase = 'build';
  if (t < TB){
    revealedFloat = (t / TB) * total;
    phase = 'build';
  } else if (t < TB + TH){
    phase = 'hold';
  } else if (t < TB + TH + TO){
    gOut = 1 - easeInCubic((t - TB - TH) / TO);
    phase = 'out';
  } else {
    gOut = 0;
    phase = 'gap';
  }
  return { revealedFloat, gOut, phase };
}

/* ---------- draw ---------- */

function draw(){
  background(0);                  // sfondo della cornice (era CFG.bg = nero)
  drawTemplateFrame();            // cornice fissa
  drawSketchScaled(drawContent);  // lo sketch, scalato dentro l'area
}

// inserisce il contenuto (W×H) nella cornice: scala vettoriale sulla
// larghezza utile, centrato. NON modificare.
function drawSketchScaled(render){
  push();
  const area = applySketchClip();
  const s = area.w / W;
  translate(area.x, area.y + (area.h - H * s) / 2);
  scale(s);
  render();
  removeSketchClip();
  pop();
}

function drawContent(){
  // Niente testo finché il font non è caricato: evita il flash/swap dal
  // fallback di sistema. Il canvas resta nero fino a font pronto.
  if (!fontReady) return;

  if (!dataReady){
    fill('#7d7d7d'); noStroke();
    textAlign(CENTER, CENTER); textSize(W * 0.026);
    text('Carico ' + CSV_NAME + ' …', W / 2, H / 2);
    return;
  }
  if (layoutKey !== (W + 'x' + H)) buildLayout();

  const tSec = EXPORT
    ? exportFrameIdx / EXPORT.fps
    : (paused ? pausedAt : (millis() - tStart)) / 1000 * speedMul;
  const st = loopState(tSec);

  drawAxesLabels();
  drawBlobs(tSec, st);
  if (CFG.showLegend) drawLegend();
}

/* ---------- testo / assi (solo etichette ai bordi, niente linee) ---------- */

function drawAxesLabels(){
  const b = gridBounds();
  const cy = (b.top + b.bottom) / 2;

  push();
  noStroke();
  fill('#FFFFFF');
  const ts = Math.round(W * 0.019);
  textSize(ts);
  drawingContext.font = '400 ' + ts + 'px "' + CFG.fontFamily + '"';
  textLeading(ts * 1.18);

  // asse orizzontale — allineato al margine della cornice (x=0 a sx, x=W a dx,
  // cioè dove stanno header/footer del frame)
  textAlign(LEFT, CENTER);
  text('MI SENTO\nSPENT3\n←', 0, cy);
  textAlign(RIGHT, CENTER);
  text('MI SENTO\nATTIV3\n→', W, cy);

  // asse contentezza (verticale)
  textAlign(CENTER, CENTER);
  text('↑ MI SENTO CONTENT3', W / 2, b.top - H * 0.052);
  text('↓ MI SENTO GIÙ',  W / 2, b.bottom + H * 0.052);
  pop();
}

/* ---------- blob (cluster di punti) + anelli di parole ---------- */

function drawBlobs(tSec, st){
  const revealedFloat = st.revealedFloat;
  const gOut = st.gOut;
  if (gOut <= 0.001) return;

  for (const cell of CELLS){
    // quante risposte di questa cella sono già comparse
    let nRevealed = 0;
    for (const resp of cell.items) if (resp.gi < revealedFloat) nRevealed++;
    if (nRevealed === 0) continue;

    push();
    translate(cell.center.x, cell.center.y);
    scale(gOut);                 // svuotamento rapido = shrink uniforme

    // ----- anelli di parole: la rotazione attraverso la maschera
    //       angolare (settori = composizione stazioni) li colora -----
    drawCellRings(cell, nRevealed, revealedFloat, tSec);
    pop();
  }
}

/* ---------- composizione (mix stazioni di una cella) ---------- */

function cellComposition(cell, revealedFloat){
  const map = new Map();
  let total = 0;
  for (const resp of cell.items){
    const w = constrain((revealedFloat - resp.gi) / CFG.popSpanIdx, 0, 1);
    if (w <= 0) continue;
    total += w;
    map.set(resp.station, (map.get(resp.station) || 0) + w);
  }

  // ordine stabile = ordine delle stazioni in palette (archi non saltano)
  const order = Object.keys(CFG.stationColors);
  const slices = [];
  for (const st of order){
    if (map.has(st)) slices.push({ station: st, color: CFG.stationColors[st], w: map.get(st) });
  }
  for (const [st, w] of map){
    if (!order.includes(st)) slices.push({ station: st, color: CFG.defaultStationColor, w });
  }
  return { slices, total };
}

// MASCHERA ANGOLARE invisibile: i settori (proporzionali alla composizione)
// dividono il cerchio; una lettera all'angolo `angle` prende il colore del
// settore che attraversa. Le parole ruotano → cambiano colore scorrendo.
function angularColor(comp, angle){
  if (comp.total <= 0 || comp.slices.length === 0) return CFG.wordColor;
  const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  let acc = 0;
  for (const s of comp.slices){
    acc += (s.w / comp.total) * TWO_PI;
    if (a < acc) return s.color;
  }
  return comp.slices[comp.slices.length - 1].color;
}

function drawCellRings(cell, nRevealed, revealedFloat, tSec){
  // medie correnti (solo sulle risposte comparse)
  let exSum = 0, exN = 0, spSum = 0, spN = 0;
  const wordMap = new Map();
  for (const resp of cell.items){
    const metricWeight = constrain((revealedFloat - resp.gi) / CFG.popSpanIdx, 0, 1);
    if (metricWeight <= 0) continue;

    if (resp.exchange !== null){ exSum += resp.exchange * metricWeight; exN += metricWeight; }
    if (resp.speed    !== null){ spSum += resp.speed * metricWeight;    spN += metricWeight; }

    const wordLocal = (revealedFloat - resp.gi) / CFG.wordRevealSpanIdx;
    if (wordLocal <= 0) continue;
    if (resp.word && !wordMap.has(resp.word)){
      wordMap.set(resp.word, {
        word: resp.word,
        firstGi: resp.gi,
        reveal: constrain(wordLocal, 0, 1)
      });
    }
  }
  const words = Array.from(wordMap.values());
  if (words.length === 0) return;

  const comp = cellComposition(cell, revealedFloat);

  const avgEx = exN ? exSum / exN : 1;
  const avgSp = spN ? spSum / spN : 5;
  const ringTarget = constrain(avgEx - 1, 1, 4);
  const omega = CFG.baseAngularSpeed + (avgSp - 5) * CFG.speedScale;
  updateOrbitMotion(cell, revealedFloat, tSec, omega);
  const orbitReveal = cell.orbitReveal;

  const wordSize = Math.max(11, cellUnitPx * CFG.wordSizeFrac);
  const softCount = cellSoftCount(cell, orbitReveal);
  const blobR = clusterRadius(softCount);

  // "formazione" della cella (0→1 mentre i punti compaiono). avgEx è una media,
  // quindi ringTarget sarebbe pieno all'istante anche con un solo punto: legandolo
  // alla presenza dei punti gli anelli si formano pian piano, dall'interno in fuori.
  const formation = constrain(softCount, 0, 1);
  const ringsNow  = ringTarget * formation;
  const firstGap = wordSize * CFG.firstGapFrac + blobR * CFG.firstGapGrowFrac;
  const ringGap   = wordSize * CFG.ringGapFrac;
  const letterGap = wordSize * CFG.letterGapFrac;
  const sepGap    = wordSize * CFG.wordGapFrac;

  push();
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(wordSize);                 // dimensione SEMPRE costante
  drawingContext.font = CFG.wordWeight + ' ' + wordSize + 'px "' + CFG.fontFamily + '"';

  // ordine per comparsa: le parole nuove si accodano, mai inserite in mezzo →
  // le posizioni già disposte non saltano quando ne arriva una nuova
  const order = words.slice().sort((a, b) => a.firstGi - b.firstGi);

  // "unità" di glifi = PAROLA · PAROLA · … (ripetuta per riempire l'anello).
  // Ogni glifo ha la sua larghezza fissa; le parole sono separate da un punto.
  const unit = [];
  for (const item of order){
    for (const ch of Array.from(item.word)) unit.push({ ch, w: textWidth(ch) + letterGap });
    unit.push({ ch: '·', w: textWidth('·') + sepGap });
  }
  if (unit.length === 0){ pop(); return; }

  for (let j = 0; j < 4; j++){
    // anelli interni prima, esterni dopo: ognuno entra quando ringsNow supera j
    const ringStrength = constrain((ringsNow - j) / CFG.ringFadeSpan, 0, 1);
    if (ringStrength <= 0.01) continue;

    const orbitOffset = firstGap + j * ringGap;
    const avgR = blobR + orbitOffset;
    if (avgR <= 0) continue;

    const rot  = cell.ringAngles[j];
    const base = cell.phase + j * 0.6;

    // l'anello "si disegna" da 0 a tutto il giro mentre entra (ringStrength),
    // poi si riempie glifo-per-glifo (ticker) → mai resize, mai reflow globale
    const maxAng = TWO_PI * ringStrength;
    let ang = 0;
    for (let i = 0; i < 4000; i++){
      const g  = unit[i % unit.length];
      const aw = g.w / avgR;
      if (ang + aw > maxAng || ang + aw > TWO_PI) break;
      const a = base + rot + ang + aw / 2;
      drawGlyphOnOrbit(g.ch, cell, orbitReveal, a, orbitOffset, comp);
      ang += aw;
    }
  }
  pop();
}

// un singolo glifo sull'orbita, dimensione costante, colore dalla maschera angolare
function drawGlyphOnOrbit(ch, cell, revealedFloat, a, orbitOffset, comp){
  const p = orbitPoint(cell, revealedFloat, a, orbitOffset);
  push();
  translate(p.x, p.y);
  rotate(a + HALF_PI);
  fill(angularColor(comp, a));
  text(ch, 0, 0);
  pop();
}

/* ---------- legenda ---------- */

function drawLegend(){
  const x0 = 0;                     // margine sinistro della cornice (come label assi e header/footer)
  const grey = '#FFFFFF';

  push();
  noStroke();
  textAlign(LEFT, TOP);

  const fs = Math.round(W * 0.019); // un'unica dimensione testo
  const lh = fs * 1.5;              // interlinea
  textSize(fs);
  drawingContext.font = '400 ' + fs + 'px "' + CFG.fontFamily + '"';
  fill(grey);

  // Ancoraggio al fondo della GRIGLIA: se aumenti CFG.grid.bottom la legenda
  // scende di conseguenza. Parte sotto l'etichetta "↓ MI SENTO GIÙ"
  // (che sta a gridBounds().bottom + H*0.052).
  const gb = gridBounds();
  let y = gb.bottom + H * 0.10;

  // righe descrittive (semplice testo, nessun simbolo/diagramma)
  text('N° DI ANELLI = VOLONTÀ DI INTERAGIRE CON GLI ALTRI DURANTE IL VIAGGIO', x0, y);
  y += lh;
  text('VELOCITÀ DI ROTAZIONE = PERCEZIONE DI RAPIDITÀ DEL VIAGGIO', x0, y);
  y += lh;
  text('GRANDEZZA INTERNA = NUMERO DI PERSONE', x0, y);
  y += lh * 1.7;

  text('STAZIONE DI PARTENZA', x0, y);
  y += lh * 1.15;

  // stazioni: quadratino colorato + nome, max 4 per riga (a capo automatico)
  const stations = Object.keys(CFG.stationColors);
  const sq = fs * 0.78;            // lato del quadratino
  const gapSq = fs * 0.5;          // spazio quadratino → nome
  const gapItem = fs * 1.3;        // spazio dopo il nome
  const perRow = 4;

  let cx = x0;
  for (let i = 0; i < stations.length; i++){
    if (i % perRow === 0 && i > 0){ cx = x0; y += lh; }
    const name = stations[i].toUpperCase();

    fill(CFG.stationColors[stations[i]]);
    rect(cx, y + (fs - sq) / 2, sq, sq);     // l'unico elemento colorato
    cx += sq + gapSq;

    fill(grey);
    text(name, cx, y);
    cx += textWidth(name) + gapItem;
  }
  pop();
}

/* ---------- controlli ---------- */

function keyPressed(){
  if (key === ' '){
    if (!paused){ paused = true; pausedAt = millis() - tStart; }
    else { paused = false; tStart = millis() - pausedAt; }
  }
  if (key === 'r' || key === 'R'){ tStart = millis(); paused = false; }
  if (keyCode === UP_ARROW)   speedMul = Math.min(8, speedMul * 1.5);
  if (keyCode === DOWN_ARROW) speedMul = Math.max(0.15, speedMul / 1.5);
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
}
