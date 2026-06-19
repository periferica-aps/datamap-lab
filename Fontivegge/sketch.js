// =====================================================================
//  FONTIVEGGE — "IL VIAGGIO IN MINIMETRÒ" (albero di flussi)
//  Progetto Tracciati 2026 · DATA MAP LAB · Periferica APS
//  Stazione Minimetrò di Perugia · formato verticale 9:16
//
//  Autori:
//    Giacomo Lazzerini
//    Fabjona Ndreca        (studentessa)
//    Federica Smarrocchio  (studentessa)
//
//  ------------------------------------------------------------------
//  COSA FA L'ANIMAZIONE
//  ------------------------------------------------------------------
//  Il tragitto dei passeggeri è tradotto in una forma ad ALBERO, su
//  tre righe orizzontali collegate da flussi di parole curvi:
//    • RADICI (A, in basso) = STAZIONE DI PARTENZA
//    • TRONCO (B, al centro) = LUNGHEZZA DEL VIAGGIO (BREVI/MEDI/LUNGHI,
//      cioè il numero di fermate percorse)
//    • CHIOMA (C, in alto)  = STAZIONE DI ARRIVO
//  Ogni risposta è un "filo" che sale dalla sua stazione di partenza,
//  attraversa la categoria di durata e arriva alla stazione di arrivo,
//  collegando graficamente le fermate della linea (da Pian di Massiano
//  a Pincetto).
//
//  Le PAROLE che compongono i fili sono quelle lasciate nel questionario:
//    • nel tratto BASSO (radici→tronco) scorrono le parole che il
//      passeggero vorrebbe LASCIARE agli altri (colore = partenza)
//    • nel tratto ALTO (tronco→chioma) quelle che vorrebbe RICEVERE
//      (colore = arrivo)
//  Sotto ogni nome di stazione, dei segni codificano:
//    • alle RADICI: quanto sono ABITUDINARI i passeggeri partiti da lì
//      (frequenza d'uso, trattini)
//    • sulla CHIOMA: il livello medio di CONTENTEZZA all'arrivo (puntini)
//  Le percentuali (a dimensione fissa) indicano la quota di risposte per
//  ogni stazione/categoria.
//
//  RIVELAZIONE CRONOLOGICA: col passare del tempo le risposte vengono
//  "consumate" in ordine di compilazione e le % si aggiornano; i flussi
//  nello spazio NON sono cronologici (sono mappe fisse), ma il loro
//  riempimento sì.
//
//  ------------------------------------------------------------------
//  COME È FATTO (per chi vuole riutilizzarlo)
//  ------------------------------------------------------------------
//  • Dati letti da ../dati.csv (prepareData): partenza, arrivo, durata
//    ricalcolata (computeTripCategory), parole, frequenza, contentezza,
//    data; risposte ordinate cronologicamente.
//  • Layout simmetrico sull'asse centrale, costruito in spazio nativo
//    BASE_W×BASE_H e scalato nella cornice (drawSketchScaled).
//  • Ogni risposta diventa due "strand": A→B e B→C (buildStrands), curve
//    di Bézier su cui le parole scorrono per lunghezza d'arco.
//  • La TIMELINE (getTimeline) ha 4 fasi: delay → reveal (accumulo) →
//    settle (fronte di svuotamento dal basso) → reset, per un loop
//    seamless esportabile.
//  • Nessuna trasparenza: le lettere si rivelano carattere per carattere
//    lungo un inviluppo, non in dissolvenza.
// =====================================================================

let table;

// Canvas finale dentro la cornice (9:16). Lo sketch continua a ragionare nel suo
// spazio nativo BASE_W × BASE_H; la cornice (templateFrame.js) lo scala e centra.
const OUT_W = 1080, OUT_H = 1920;

const BASE_W = 960;          // larghezza nativa (= W)
let BASE_H = 1707;           // altezza nativa (= H), ricalcolata in computeVerticalLayout()
const DATA_SOURCE = "../dati.csv";

const CFG = {
  // RESA / EXPORT
  export4K: false,
  fps: 30,
  capture: false,
  captureFormat: 'webm',
  screenPixelDensity: "auto", // "auto" = nitido su HiDPI/Retina, 1 = resa legacy
  superSample: 1,             // 1 mantiene fluida la landing; aumentare solo per export offline

  // STILE GLOBALE
  bg: 0,
  strandGap: 3.0,        // distanza tra le strand (più alto = più distinte)
  fontSize: 10,          // grandezza parole sui flussi
  wordSpacing: 0.14,     // distanza tra parole consecutive (più alto = meno affollato)
  uprightWords: true,

  // PERCENTUALI: dimensione FISSA (non più variabile)
  pctSizeA: 28,
  pctSizeB: 30,
  pctSizeC: 28,

  // LAYOUT VERTICALE — margini sopra/sotto UGUALI e regolabili (allungano il grafico).
  // rowC_y / rowB_y / rowA_y sono derivati in computeVerticalLayout().
  marginY: 5,          // spazio bianco identico sopra (chioma) e sotto (radici)
  gapCtoB: 890,          // distanza verticale: chioma (alto) -> tronco (centro)
  gapBtoA: 520,          // distanza verticale: tronco -> radici (basso)

  // LAYOUT ORIZZONTALE — margini dx/sx uguali (simmetrici sull'asse centrale)
  marginXA: 185,         // stazioni in basso più compatte: base raccolta
  marginXC: 90,          // stazioni in alto più ampie: chioma aperta
  bSpread: 0.16,         // larghezza zona B
  bGap: 6,               // separazione ingresso/uscita B (interna alla %)
  bFunnelWidth: 54,      // ampiezza massima del collo dentro le % di durata

  // CURVE BEZIER (cy1, cy2 in [0..1] dall'origine all'arrivo)
  // valori vicino a 0.5 -> molto a S; vicino a 0 e 1 -> più lineare
  bezT1: 0.30,
  bezT2: 0.70,

  // INVILUPPO PAROLE: parte quasi dal cuore delle stazioni e rientra
  // negli arrivi. I nodi, disegnati sopra, mascherano l'innesco.
  tShow0: 0.005,
  tShow1: 0.995,
  revealPower: 0.45,     // più basso = lettere leggibili prima vicino ai nodi

  // RIVELAZIONE CRONOLOGICA
  reveal: {
    duration: 70,        // secondi per arrivare al 100% delle risposte
    startDelay: 0.5,     // pausa iniziale (con legenda visibile)
    travelSeconds: 25,   // tempo perché una risposta salga da partenza ad arrivo (più alto = più lenta)
    settleSeconds: 12,   // fronte di svuotamento dal basso alla cima (sorgenti spente)
    settleFlowSpeed: 1.0,
    resetSeconds: 1.4    // reset rapido di percentuali, codifiche e contatori
  },

  // LEGENDA FISSA
  legend: {
    show: true,
    x: 5,
    y: null,             // null = centrata sulla riga delle durate viaggio
    width: 200,
    height: 470,
    pad: 16,
    progressGap: 40      // spazio regolabile tra la nota e i contatori giorno/risposte
  }
};

const ORDER = ["Pian Di Massiano","Cortonese","Madonna Alta",
              "Fontivegge","Case Bruciate","Cupa","Pincetto"];
const CATS  = ["BREVI","MEDI","LUNGHI"];
const CAT_SUB = { BREVI:"1–2 stazioni", MEDI:"3–4 stazioni", LUNGHI:"5–6 stazioni" };
const RAW_COL = {
  dep: 0,
  arr: 2,
  frequency: 5,
  happiness: 13,
  receive: 23,
  leave: 24,
  submitted: 27
};

const PALETTE = {
  "Pian Di Massiano":[61,123,217],   // #3D7BD9
  "Cortonese":       [155,89,182],   // #9B59B6
  "Madonna Alta":    [46,204,113],   // #2ECC71
  "Fontivegge":      [241,196,15],   // #F1C40F
  "Case Bruciate":   [231,76,60],    // #E74C3C
  "Cupa":            [26,188,156],   // #1ABC9C
  "Pincetto":        [230,126,34]    // #E67E22
};

let responses = [];
let posA = {}, posC = {}, posB = {};
let abStrands = [], bcStrands = [];
let firstSubmittedAt = 0;
let lastSubmittedAt = 0;

let LOOP_FRAMES = 240;
let NTOK = 5;
let cnv, capturer, capturing = false;
let paused = false;
let sourceCodeProRegular, sourceCodeProBold;

function preload(){
  sourceCodeProRegular = loadFont('../fonts/SourceCodePro-Regular.ttf');
  sourceCodeProBold = loadFont('../fonts/SourceCodePro-Bold.ttf');
  table = loadTable(DATA_SOURCE, "csv", "header");
  loadFrameAssets();
}

function setup(){
  computeVerticalLayout();
  cnv = createCanvas(OUT_W, OUT_H);
  applyCanvasPixelDensity();
  textFont(sourceCodeProRegular);
  frameRate(CFG.fps);
  randomSeed(7);

  LOOP_FRAMES = Math.max(2, Math.round(getCycleSeconds() * CFG.fps));
  NTOK = Math.max(2, Math.round(1 / CFG.wordSpacing));

  prepareData();
  computeLayout();
  assignStrandAnchors();
  buildStrands();

  if (CFG.capture && typeof CCapture !== 'undefined'){
    capturer = new CCapture({
      format: CFG.captureFormat, framerate: CFG.fps,
      quality: 0.99, name: 'minimetro_albero'
    });
    capturer.start();
    capturing = true;
  }
}

function applyCanvasPixelDensity(){
  if (CFG.export4K || CFG.capture){
    pixelDensity(1);
    return;
  }
  const density = CFG.screenPixelDensity === "auto"
    ? Math.min(displayDensity(), 2)
    : CFG.screenPixelDensity;
  // Il supersampling moltiplica la densità del display: si disegna a risoluzione
  // più alta e il browser la rimpicciolisce, levigando bordi e testi ruotati.
  pixelDensity(CFG.capture ? Math.max(1, density) * Math.max(1, CFG.superSample) : 1);
}

// --------------------- lettura dati ---------------------
// dati.csv è l'export grezzo: leggiamo le colonne utili, ricalcoliamo
// la lunghezza viaggio e riordiniamo le risposte cronologicamente.
function prepareData(){
  for (let r = 0; r < table.getRowCount(); r++){
    const dep = table.getString(r, RAW_COL.dep).trim();
    const arr = table.getString(r, RAW_COL.arr).trim();
    if (!(dep in PALETTE) || !(arr in PALETTE)) continue;
    const cat = computeTripCategory(dep, arr);
    if (!cat) continue;
    let ric = table.getString(r, RAW_COL.receive).trim(); if (!ric) ric = "·";
    let las = table.getString(r, RAW_COL.leave).trim(); if (!las) las = "·";
    const frequency = parseScaleValue(table.getString(r, RAW_COL.frequency));
    const happiness = parseScaleValue(table.getString(r, RAW_COL.happiness));
    const submitted = table.getString(r, RAW_COL.submitted).trim();
    responses.push({ dep, arr, cat, ric, las, frequency, happiness, submitted, submittedSort: parseSubmittedAt(submitted) });
  }
  responses.sort((a, b) => a.submittedSort - b.submittedSort);
  firstSubmittedAt = responses.length ? responses[0].submittedSort : 0;
  lastSubmittedAt = responses.length ? responses[responses.length - 1].submittedSort : 0;
}

function parseScaleValue(value){
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : null;
}

// Categoria di durata dal numero di fermate tra partenza e arrivo
// (distanza degli indici nell'ORDER della linea): 1–2 BREVI, 3–4 MEDI,
// 5–6 LUNGHI. Stessa stazione o fuori scala -> null (risposta scartata).
function computeTripCategory(dep, arr){
  const stops = Math.abs(ORDER.indexOf(dep) - ORDER.indexOf(arr));
  if (stops >= 1 && stops <= 2) return "BREVI";
  if (stops >= 3 && stops <= 4) return "MEDI";
  if (stops >= 5 && stops <= 6) return "LUNGHI";
  return null;
}

function parseSubmittedAt(value){
  // L'export italiano usa DD/MM/YYYY e può separare l'orario con virgole.
  // Interpretiamolo prima di Date.parse, che tratta DD/MM in modo ambiguo.
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[,:.](\d{2})[,:.](\d{2})$/);
  if (m){
    return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// ------------------------- layout -----------------------
// Posiziona le tre righe partendo da margini verticali UGUALI sopra/sotto.
// topExtent/bottomExtent stimano quanto il testo sporge oltre il centro delle %
// (sopra: mezza altezza della %; sotto: nome + trattini), così lo spazio bianco
// ai bordi è davvero identico. BASE_H si allunga di conseguenza.
function computeVerticalLayout(){
  const topExtent = CFG.pctSizeC * 0.5;
  const bottomExtent = CFG.pctSizeA * 0.55 + 27;
  CFG.rowC_y = CFG.marginY + topExtent;
  CFG.rowB_y = CFG.rowC_y + CFG.gapCtoB;
  CFG.rowA_y = CFG.rowB_y + CFG.gapBtoA;
  BASE_H = Math.round(CFG.rowA_y + bottomExtent + CFG.marginY);
}

function computeLayout(){
  ORDER.forEach((s, i) => {
    const t = i / (ORDER.length - 1);
    posA[s] = { x: lerp(CFG.marginXA, BASE_W - CFG.marginXA, t), y: CFG.rowA_y };
    posC[s] = { x: lerp(CFG.marginXC, BASE_W - CFG.marginXC, t), y: CFG.rowC_y };
  });
  const bx = [
    BASE_W * (0.5 - CFG.bSpread),
    BASE_W * 0.5,
    BASE_W * (0.5 + CFG.bSpread)
  ];
  CATS.forEach((c, i) => { posB[c] = { x: bx[i], y: CFG.rowB_y }; });
}

// -------------------- ancoraggi strand ------------------
// Gli endpoint sono agganciati ai punti visivi dei testi:
// partenza dalla punta alta della %, ingresso nella parte bassa della durata,
// uscita dalla parte alta della durata, arrivo sotto al nome della stazione.
function assignStrandAnchors(){
  const g = CFG.strandGap;
  const start = (cx, n) => cx - (n - 1) * g / 2;
  const funnelX = (cx, n, i, width) => {
    if (n <= 1) return cx;
    const localGap = Math.min(g, width / (n - 1));
    return cx - localGap * (n - 1) / 2 + i * localGap;
  };

  // A (basso, radici): partenza dalla punta alta della percentuale.
  const aTipY = CFG.pctSizeA * 0.52;
  for (const s of ORDER){
    const list = responses.filter(r => r.dep === s)
      .sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat));
    const x0 = start(posA[s].x, list.length);
    list.forEach((r, i) => {
      r.abx = x0 + i * g;
      r.aby = posA[s].y - aTipY;
    });
  }

  // B input (da sotto): ingresso nella parte bassa della percentuale durata.
  const bLowerY = CFG.pctSizeB * 0.46;
  for (const c of CATS){
    const list = responses.filter(r => r.cat === c)
      .sort((a, b) => ORDER.indexOf(a.dep) - ORDER.indexOf(b.dep));
    list.forEach((r, i) => {
      r.bInX = funnelX(posB[c].x, list.length, i, CFG.bFunnelWidth);
      r.bInY = posB[c].y + bLowerY;
    });
  }

  // B output (verso l'alto): origine dalla parte alta della percentuale durata.
  const bUpperY = CFG.pctSizeB * 0.46;
  for (const c of CATS){
    const list = responses.filter(r => r.cat === c)
      .sort((a, b) => ORDER.indexOf(a.arr) - ORDER.indexOf(b.arr));
    list.forEach((r, i) => {
      r.bOutX = funnelX(posB[c].x, list.length, i, CFG.bFunnelWidth);
      r.bOutY = posB[c].y - bUpperY;
    });
  }

  // C (alto, chioma): arrivo nella parte bassa del nome stazione.
  const cLabelLowerY = CFG.pctSizeC * 0.55 + 21;
  for (const s of ORDER){
    const list = responses.filter(r => r.arr === s)
      .sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat));
    const x0 = start(posC[s].x, list.length);
    list.forEach((r, i) => {
      r.cInX = x0 + i * g;
      r.cInY = posC[s].y + cLabelLowerY;
    });
  }
}

function makeStrand(x0, y0, x3, y3, phrase, col){
  const words = phrase.toUpperCase().split(/\s+/).filter(w => w.length);
  if (!words.length) words.push("·");
  return {
    x0, y0, x3, y3,
    cy1: y0 + (y3 - y0) * CFG.bezT1,
    cy2: y0 + (y3 - y0) * CFG.bezT2,
    words, col,
    phase: random()
  };
}

function buildStrands(){
  // L'ordine di abStrands/bcStrands == ordine cronologico di responses.
  for (const r of responses){
    const depCol = color(...PALETTE[r.dep]);
    const arrCol = color(...PALETTE[r.arr]);
    // RADICI -> TRONCO: parole RICEVERE, colore = stazione di partenza
    abStrands.push(makeStrand(r.abx, r.aby, r.bInX, r.bInY, r.ric, depCol));
    // TRONCO -> CHIOMA: parole LASCIARE, colore = stazione di arrivo
    bcStrands.push(makeStrand(r.bOutX, r.bOutY, r.cInX, r.cInY, r.las, arrCol));
  }
}

// ============== STATO TEMPORALE: rivelazione progressiva ==============
function getElapsedSeconds(){
  // Tempo a orologio reale (millis), non frameCount: così il videokit — che
  // "congela" e pilota l'orologio — rende ogni frame in modo deterministico a
  // t = i/fps, producendo un loop seamless. Interattivamente è identico
  // (l'animazione era già a tempo reale).
  return millis() / 1000;
}

function getCycleSeconds(){
  return CFG.reveal.startDelay +
    CFG.reveal.duration +
    CFG.reveal.settleSeconds +
    CFG.reveal.resetSeconds;
}

// Stato della timeline al tempo corrente, avvolto su un ciclo intero.
// Fasi: "delay" (pausa iniziale) → "reveal" (le risposte si accumulano,
// progress 0→1) → "settle" (un fronte risale dal basso e svuota i flussi) →
// "reset" (le percentuali e i contatori tornano a zero per ripartire).
function getTimeline(){
  const cycleSeconds = getCycleSeconds();
  const t = getElapsedSeconds() % cycleSeconds;
  const revealStart = CFG.reveal.startDelay;
  const revealEnd = revealStart + CFG.reveal.duration;
  const settleEnd = revealEnd + CFG.reveal.settleSeconds;

  if (t < revealStart){
    return { t, phase: "delay", progress: 0, displayFactor: 1, resetProgress: 0, flowTime: t, revealEnd, settleT: 0 };
  }
  if (t < revealEnd){
    const progress = (t - revealStart) / CFG.reveal.duration;
    return { t, phase: "reveal", progress, displayFactor: 1, resetProgress: 0, flowTime: t, revealEnd, settleT: 0 };
  }
  if (t < settleEnd){
    const settleT = (t - revealEnd) / CFG.reveal.settleSeconds;
    const flowTime = revealEnd + settleT * CFG.reveal.settleSeconds * CFG.reveal.settleFlowSpeed;
    return { t, phase: "settle", progress: 1, displayFactor: 1, resetProgress: 0, flowTime, revealEnd, settleT };
  }

  const resetProgress = (t - settleEnd) / CFG.reveal.resetSeconds;
  const displayFactor = Math.max(0, 1 - resetProgress);
  return { t, phase: "reset", progress: displayFactor, displayFactor, resetProgress, flowTime: settleEnd, revealEnd, settleT: 1 };
}

function getVisibleCount(timeline){
  if (timeline.phase === "settle" || timeline.phase === "reset"){
    return responses.length;
  }
  return Math.floor(Math.max(0, Math.min(1, timeline.progress)) * responses.length);
}

function getResponseJourney(i, timeline){
  return getResponseJourneyAtTime(i, timeline.flowTime);
}

function getResponseJourneyAtTime(i, flowTime){
  if (!responses.length) return 0;
  const launchGap = CFG.reveal.duration / responses.length;
  const launchedAt = CFG.reveal.startDelay + i * launchGap;
  const t = (flowTime - launchedAt) / CFG.reveal.travelSeconds;
  return Math.max(0, t);
}

function getSegmentHead(i, segment, timeline){
  const journey = getResponseJourney(i, timeline);
  return getSegmentHeadFromJourney(journey, segment);
}

function getSegmentHeadAtTime(i, segment, flowTime){
  const journey = getResponseJourneyAtTime(i, flowTime);
  return getSegmentHeadFromJourney(journey, segment);
}

function getSegmentHeadFromJourney(journey, segment){
  const head = segment === "ab" ? journey * 2 : journey * 2 - 1;
  return Math.max(0, head);
}

function computeCounts(visN){
  // Ricalcola conteggi e quindi percentuali sulle PRIME visN risposte cronologiche.
  const cA = {}, cB = {}, cC = {};
  const freqSumA = {}, freqCountA = {}, happySumC = {}, happyCountC = {};
  for (const s of ORDER){
    cA[s] = 0;
    cC[s] = 0;
    freqSumA[s] = 0;
    freqCountA[s] = 0;
    happySumC[s] = 0;
    happyCountC[s] = 0;
  }
  for (const c of CATS)  cB[c] = 0;
  for (let i = 0; i < visN; i++){
    const r = responses[i];
    cA[r.dep]++;
    cC[r.arr]++;
    cB[r.cat]++;
    if (r.frequency !== null){
      freqSumA[r.dep] += r.frequency;
      freqCountA[r.dep]++;
    }
    if (r.happiness !== null){
      happySumC[r.arr] += r.happiness;
      happyCountC[r.arr]++;
    }
  }
  return { cA, cB, cC, freqSumA, freqCountA, happySumC, happyCountC, total: visN, displayFactor: 1 };
}

function scaleLevel10(sum, count){
  if (!count) return 0;
  const avg = sum / count;
  return Math.max(1, Math.min(10, Math.round(avg * 2)));
}

// ------------------------------- DRAW --------------------------------
function draw(){
  background(0);
  drawTemplateFrame();
  drawSketchScaled(drawContent);

  if (capturing && capturer){
    capturer.capture(cnv.elt);
    if (frameCount >= LOOP_FRAMES){
      capturing = false;
      noLoop();
      capturer.stop();
      capturer.save();
    }
  }
}

// Disegna lo sketch nativo (BASE_W × BASE_H) scalato e centrato nell'area interna
// della cornice, con clip ai suoi bordi. Scala basata sulla larghezza.
function drawSketchScaled(render){
  push();
  const area = applySketchClip();
  const s = area.w / BASE_W;
  translate(area.x, area.y + (area.h - BASE_H * s) / 2);
  scale(s);
  render();
  removeSketchClip();
  pop();
}

// Corpo originale dello sketch, immutato salvo il background (ora un rect che
// riempie SOLO l'area nativa, per non cancellare la cornice).
function drawContent(){
  const timeline = getTimeline();
  const visN = getVisibleCount(timeline);
  const counts = computeCounts(visN);
  counts.displayFactor = timeline.displayFactor;

  noStroke();
  fill(CFG.bg);
  rect(0, 0, BASE_W, BASE_H);

  drawFlow(abStrands, timeline, "ab");
  drawFlow(bcStrands, timeline, "bc");
  drawNodesA(counts);
  drawNodesB(counts);
  drawNodesC(counts);

  if (CFG.legend.show){
    drawLegend(timeline, visN);
  }
}

function formatDayLabel(value){
  if (!value) return "--/--";
  const d = new Date(value);
  return `${nf(d.getDate(), 2)} / ${nf(d.getMonth() + 1, 2)}`;
}

function drawFlow(strands, timeline, segment){
  if (timeline.phase === "reset") return;
  noStroke();
  textFont(sourceCodeProRegular);
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  textSize(CFG.fontSize);

  const tRange = CFG.tShow1 - CFG.tShow0;
  const flowPeriod = Math.max(1 + CFG.wordSpacing, NTOK * CFG.wordSpacing);

  // Settle: le sorgenti si SPENGONO (niente ricicli, congelati a inizio settle) e
  // un FRONTE DI SVUOTAMENTO risale dal basso (radici) alla cima (chioma). Sotto il
  // fronte non c'è nulla — niente spunta da sotto, perché le sorgenti sono spente.
  // Sopra il fronte il flusso CONTINUA a scorrere: il basso sale nel tronco e lo
  // alimenta finché il fronte non supera il centro, poi l'alto si esaurisce. Così il
  // basso si svuota PER PRIMO senza maschere finte e senza blocchi. A inizio settle
  // il fronte è sotto le radici e le posizioni coincidono col reveal: nessuno scatto.
  let yCutoff = Infinity;
  if (timeline.phase === "settle"){
    const e = timeline.settleT * timeline.settleT * (3 - 2 * timeline.settleT); // smoothstep
    yCutoff = lerp(BASE_H + 40, CFG.rowC_y - 40, e);
  }

  for (let i = 0; i < strands.length; i++){
    const head = getSegmentHead(i, segment, timeline);
    if (head <= 0) continue;

    const s = strands[i];
    const W = s.words.length;
    const r = red(s.col), g = green(s.col), b = blue(s.col);

    // head a inizio settle: riferimento per congelare i ricicli (no rigenerazione).
    const head0 = timeline.phase === "settle"
      ? getSegmentHeadAtTime(i, segment, timeline.revealEnd)
      : 0;

    for (let k = 0; k < NTOK; k++){
      let t = head - k * CFG.wordSpacing;
      if (timeline.phase === "reveal"){
        while (t > 1) t -= flowPeriod;
      } else if (timeline.phase === "settle"){
        const t0 = head0 - k * CFG.wordSpacing;
        const wraps = Math.max(0, Math.ceil((t0 - 1) / flowPeriod));
        t -= wraps * flowPeriod;               // ricicli congelati: uscito (t≥1) non rientra
      }
      if (t <= 0 || t >= 1) continue;

      // Inviluppo clipped: parole visibili SOLO tra tShow0 e tShow1.
      // Fuori da quell'intervallo: 0 caratteri. Niente trasparenze.
      let env = 0;
      if (t > CFG.tShow0 && t < CFG.tShow1){
        const tn = (t - CFG.tShow0) / tRange;
        env = Math.pow(Math.sin(Math.PI * tn), CFG.revealPower);
      }
      const word = s.words[k % W];
      const nVis = Math.ceil(word.length * env);
      if (nVis <= 0) continue;
      const shown = word.substring(word.length - nVis);

      const x = bezierPoint(s.x0, s.x0, s.x3, s.x3, t);
      const y = bezierPoint(s.y0, s.cy1, s.cy2, s.y3, t);
      if (y > yCutoff) continue;   // sotto il fronte di svuotamento: già esaurito
      if (isInsideLegendZone(x, y, shown)) continue;

      let ang = Math.atan2(
        bezierTangent(s.y0, s.cy1, s.cy2, s.y3, t),
        bezierTangent(s.x0, s.x0,  s.x3,  s.x3,  t)
      );
      if (CFG.uprightWords){
        ang = leftToRightAngle(ang);
      }

      push();
      translate(x, y);
      rotate(ang);
      fill(r, g, b);     // colore PIENO, nessuna trasparenza
      text(shown, 0, 0);
      pop();
    }
  }
  textStyle(NORMAL);
}

function leftToRightAngle(ang){
  while (ang > PI) ang -= TWO_PI;
  while (ang < -PI) ang += TWO_PI;
  if (ang > HALF_PI) ang -= PI;
  else if (ang < -HALF_PI) ang += PI;
  return ang;
}

function drawSemiboldPercent(label, x, y, size){
  textStyle(NORMAL);
  textSize(size);
  textAlign(CENTER, CENTER);
  drawingContext.save();
  drawingContext.font = `600 ${size}px "Source Code Pro"`;
  drawingContext.textAlign = "center";
  drawingContext.textBaseline = "middle";
  drawingContext.fillText(label, x, y);
  drawingContext.restore();
}

// ------------------------------- nodi --------------------------------
function drawNodesA(counts){
  textFont(sourceCodeProRegular);
  noStroke();
  const total = counts.total;
  const ps = CFG.pctSizeA;
  for (const s of ORDER){
    const p = posA[s];
    const pct = total > 0 ? Math.round((100 * counts.cA[s] / total) * counts.displayFactor) : 0;

    fill('#FFFFFF');
    drawSemiboldPercent(`${pct}%`, p.x, p.y, ps);

    fill('#FFFFFF');
    textStyle(NORMAL);
    textSize(10);
    textAlign(CENTER, TOP);
    const labelY = p.y + ps * 0.55 + 8;
    text(s.toUpperCase(), p.x, labelY);
    drawUsageUnderline(
      p.x,
      labelY + 17,
      Math.round(scaleLevel10(counts.freqSumA[s], counts.freqCountA[s]) * counts.displayFactor),
      PALETTE[s]
    );
  }
  textStyle(NORMAL);
}

function drawUsageUnderline(cx, y, level, col){
  if (!level) return;
  const segW = 5;
  const gap = 2;
  const totalW = level * segW + (level - 1) * gap;
  noStroke();
  fill(...col);
  for (let i = 0; i < level; i++){
    rect(cx - totalW / 2 + i * (segW + gap), y, segW, 2);
  }
}

function drawNodesB(counts){
  textFont(sourceCodeProRegular);
  noStroke();
  const total = counts.total;
  const ps = CFG.pctSizeB;
  for (const c of CATS){
    const p = posB[c];
    const pct = total > 0 ? Math.round((100 * counts.cB[c] / total) * counts.displayFactor) : 0;

    fill('#FFFFFF');
    drawSemiboldPercent(`${pct}%`, p.x, p.y, ps);

    textAlign(CENTER, TOP);
    textFont(sourceCodeProBold);
    textStyle(NORMAL);
    textSize(12);
    text(c, p.x, p.y + ps * 0.55 + 8);

    textFont(sourceCodeProRegular);
    textStyle(NORMAL);
    textSize(9.5);
    fill(255);
    text(CAT_SUB[c], p.x, p.y + ps * 0.55 + 26);
  }
  textStyle(NORMAL);
}

function drawNodesC(counts){
  textFont(sourceCodeProRegular);
  noStroke();
  const total = counts.total;
  const ps = CFG.pctSizeC;
  for (const s of ORDER){
    const p = posC[s];
    const pct = total > 0 ? Math.round((100 * counts.cC[s] / total) * counts.displayFactor) : 0;

    fill('#FFFFFF');
    drawSemiboldPercent(`${pct}%`, p.x, p.y, ps);

    fill('#FFFFFF');
    textStyle(NORMAL);
    textSize(10);
    textAlign(CENTER, TOP);
    const labelY = p.y + ps * 0.55 + 8;
    text(s.toUpperCase(), p.x, labelY);
    drawEmotionDots(
      p.x,
      labelY + 18,
      Math.round(scaleLevel10(counts.happySumC[s], counts.happyCountC[s]) * counts.displayFactor),
      PALETTE[s]
    );
  }
  textStyle(NORMAL);
}

function drawEmotionDots(cx, y, level, col){
  if (!level) return;
  const d = 3;
  const gap = 4;
  const totalW = level * d + (level - 1) * gap;
  noStroke();
  fill(...col);
  for (let i = 0; i < level; i++){
    circle(cx - totalW / 2 + d / 2 + i * (d + gap), y, d);
  }
}

// ----------------------------- legenda -------------------------------
function getLegendBox(){
  const pad = CFG.legend.pad;
  const contentH = CFG.legend.height;
  const y = CFG.legend.y === null
    ? CFG.rowB_y - contentH / 2
    : CFG.legend.y;
  return {
    x: CFG.legend.x - pad,
    y: y - pad,
    w: CFG.legend.width + pad * 2,
    h: contentH + pad * 2,
    contentX: CFG.legend.x,
    contentY: y,
    contentW: CFG.legend.width
  };
}

function isInsideLegendZone(x, y, word){
  if (!CFG.legend.show) return false;
  const box = getLegendBox();
  const guard = 10;
  const halfW = textWidth(word) * 0.5 + guard;
  const halfH = CFG.fontSize * 0.75 + guard;
  return (
    x + halfW >= box.x &&
    x - halfW <= box.x + box.w &&
    y + halfH >= box.y &&
    y - halfH <= box.y + box.h
  );
}

function drawLegend(timeline, visN){
  const box = getLegendBox();
  const x = box.contentX;
  const y = box.contentY;
  const w = box.contentW;

  // Sfondo opaco in una zona dove le parole animate non vengono disegnate.
  noStroke();
  fill(CFG.bg);
  rect(box.x, box.y, box.w, box.h);

  textFont(sourceCodeProRegular);
  textStyle(NORMAL);
  textSize(14);
  textAlign(LEFT, TOP);

  // Una sola taglia, un solo peso, tutto maiuscolo: legenda "stampata" e uniforme.
  const lineH = 20;       // interlinea costante dentro un gruppo
  const groupGap = 16;    // spazio tra gruppi
  const ink = 255;        // colore uniforme del testo (bianco)
  let cy = y;

  const line = (s) => { fill(ink); text(s, x, cy); cy += lineH; };

  // struttura dell'albero (RADICI in basso = partenze, CHIOMA in alto = arrivi)
  line("CHIOMA = STAZIONI DI ARRIVO");
  line("TRONCO = LUNGHEZZA DEL VIAGGIO");
  line("RADICI = STAZIONI DI PARTENZA");
  cy += groupGap;

  // codifiche dei segni disegnati sotto ai nomi
  line("--- FREQUENZA UTILIZZO");
  line("... LIVELLO DI POSITIVITÀ");
  cy += groupGap;

  // stazioni con quadratino colorato
  for (const s of ORDER){
    fill(...PALETTE[s]);
    rect(x, cy + 1, 11, 11);
    fill(ink);
    text(s.toUpperCase(), x + 20, cy);
    cy += lineH;
  }
  cy += groupGap;

  // nota sulle parole dei flussi
  textLeading(lineH);
  fill(ink);
  text("IN BASSO LE PAROLE CHE SI VORREBBERO LASCIARE AGLI ALTRI PASSEGGERI, IN ALTO LE PAROLE CHE SI VORREBBERO RICEVERE.",
       x, cy, w, 200);
  cy += textLeadingHeight("IN BASSO LE PAROLE CHE SI VORREBBERO LASCIARE AGLI ALTRI PASSEGGERI, IN ALTO LE PAROLE CHE SI VORREBBERO RICEVERE.", w, lineH);

  // contatori testuali: scorrono coi giorni e con le risposte rivelate
  cy += CFG.legend.progressGap;
  const progress = Math.max(0, Math.min(1, timeline.progress));
  const currentIdx = Math.max(0, Math.min(responses.length - 1, Math.floor(progress * (responses.length - 1))));
  const currentDay = responses[currentIdx]?.submittedSort || firstSubmittedAt;
  const shownN = timeline.phase === "reset" ? Math.round(responses.length * progress) : visN;
  const valX = x + 100;

  fill(ink);
  text("GIORNO", x, cy);   text(formatDayLabel(currentDay), valX, cy); cy += lineH;
  text("RISPOSTE", x, cy); text(`${shownN} / ${responses.length}`, valX, cy);
}

// Altezza occupata da un testo a capo automatico, per impilare i blocchi sotto.
function textLeadingHeight(str, boxW, lineH){
  const charW = textWidth("M");
  const perLine = Math.max(1, Math.floor(boxW / charW));
  const lines = str.split(/\s+/).reduce((acc, word) => {
    const cand = acc.cur ? acc.cur + " " + word : word;
    if (cand.length > perLine){ acc.n++; acc.cur = word; }
    else acc.cur = cand;
    return acc;
  }, { n: 1, cur: "" }).n;
  return lines * lineH;
}

// "S" salva png; "P" pausa (off in registrazione)
function keyPressed(){
  if (key === 's' || key === 'S') saveCanvas("minimetro_albero", "png");
  if ((key === 'p' || key === 'P') && !capturing){
    paused = !paused;
    if (paused) noLoop(); else loop();
  }
}
