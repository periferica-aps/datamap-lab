// ============================================================
//  PIAN DI MASSIANO — "TRACK CHART"
//  "Due modi di attraversare lo stesso spazio"
//  Progetto Tracciati 2026 · DATA MAP LAB · Periferica APS
//  Stazione Minimetrò di Perugia · formato verticale 9:16
//
//  Autori:
//    Giacomo Lazzerini
//    Matteo Bartoccetti  (studente)
//    Veronica Lucconi    (studentessa)
//    Sofia Furia         (studentessa)
//
//  ------------------------------------------------------------
//  COSA FA L'ANIMAZIONE
//  ------------------------------------------------------------
//  Una pista da corsa con SEI CORSIE concentriche (LANES), una per
//  ogni domanda del questionario:
//    • le 3 esterne (categoriali): MEZZO ALTERNATIVO al Minimetrò,
//      MOTIVO del viaggio, CON CHI si viaggia
//    • le 3 interne (likert 1..5): senso di SICUREZZA, senso di
//      APPARTENENZA, voglia di INTERAGIRE con gli altri
//  Su ogni corsia corrono DUE "teste", una per categoria di utente:
//  STUDENTI (verde) e LAVORATORI (viola). La DISTANZA tra le due teste
//  rende visibile la differenza di risposta tra i due gruppi.
//
//  Ogni testa percorre un numero fisso di giri (RACE_LAPS) più un tratto
//  finale proporzionale al risultato del gruppo:
//    • likert  -> MEDIA 1..5 della risposta
//    • categoriali -> QUOTA della risposta dominante (mostra le singole
//      risposte mentre entrano, poi si consolida nella dominante in grassetto)
//  La VELOCITÀ con cui le frasi avanzano segue la variazione dei punteggi
//  medi raccolti giorno dopo giorno; un riquadro mostra GIORNO e RISPOSTE
//  incluse, cioè l'evoluzione delle differenze tra i due gruppi nel tempo.
//
//  La corsa si ferma quando tutte le risposte sono incluse, tiene
//  l'immagine finale, poi si ritrae verso lo START e riparte (loop).
//  Le code scompaiono togliendo lettere, senza opacità né gradienti.
//
//  ------------------------------------------------------------
//  COME È FATTO (per chi vuole riutilizzarlo)
//  ------------------------------------------------------------
//  • Dati letti da ../dati.csv (buildData): si tiene solo chi è studente
//    o lavoratore (groupOf), si ordina per data e si pre-calcola l'aggregato
//    finale; durante la corsa l'aggregato cresce in modo cumulativo nel
//    tempo virtuale (le righe entrano quando il loro timestamp è "passato").
//  • La geometria della pista (rette + semicerchi) è parametrica: posCW(r,s)
//    dà il punto a distanza s lungo la corsia di raggio r, tangent() l'angolo.
//    Le lettere sono disposte lungo la corsia per lunghezza d'arco.
//  • La timeline (in draw) ha le fasi: start-hold → race → hold → retract.
//  • Tutto è disegnato in spazio nativo W×H e scalato dentro la cornice
//    condivisa (drawSketchScaled + templateFrame.js).
//
//  Controlli (solo anteprima):  SPAZIO / click = riavvia · F = salta alla fine
// ============================================================

// ----- colonne del CSV -----
const COL = { group:10, mezzo:11, motivo:4, comp:3,
              sic:20, app:21, inter:22, time:27 };

// ----- 6 domande -----
const LANES = [
  { key:'mezzo',  type:'cat', title:'MEZZO ALTERNATIVO' },
  { key:'motivo', type:'cat', title:'MOTIVO DEL VIAGGIO' },
  { key:'comp',   type:'cat', title:'CON CHI VIAGGI' },
  { key:'sic',    type:'lik', title:'SENSO DI SICUREZZA',
    q:'In questo luogo mi sento al sicuro, anche in presenza di persone che non conosco' },
  { key:'app',    type:'lik', title:'SENSO DI APPARTENENZA',
    q:'Questo spazio mi appartiene: sento che fa parte della mia identità e di chi sono' },
  { key:'inter',  type:'lik', title:'VOGLIA DI INTERAGIRE',
    q:'In questo spazio, mi sentirei a mio agio nello scambiare qualche parola con gli altri passeggeri' }
];

function shortLabel(key, raw){
  if(raw==null) return '';
  const v = raw.trim();
  const M = {
    mezzo: {'Bus':'BUS','Auto':'AUTO','A piedi':'PIEDI','Bici / monopattino':'BICI','Altro':'ALTRO','Treno':'TRENO'},
    motivo:{'Studio':'STUDIO','Lavoro':'LAVORO','Tempo libero / svago':'SVAGO','Ritorno a casa':'CASA',
            'Spostamento di passaggio / collegamento':'TRANSITO','Commissioni / necessità':'COMMISSIONI','Turismo':'TURISMO'},
    comp:  {'Nessuno (sono da solo/a)':'DA SOLI','Amici':'AMICI','Partner':'PARTNER','Famiglia':'FAMIGLIA','Colleghi':'COLLEGHI'}
  };
  if(M[key] && M[key][v]) return M[key][v];
  return v.toUpperCase().split(/[\s/]+/)[0];
}
// Occupazione dichiarata -> categoria di utente: 'stu' (studenti) o 'lav'
// (lavoratori, inclusi gli studenti-lavoratori). Altri valori -> null = scartato.
function groupOf(raw){
  if(raw==null) return null;
  const v = raw.trim();
  if(v==='Studente/studentessa') return 'stu';
  if(v==='Lavoratore/lavoratrice' || v==='Studente-lavoratore') return 'lav';
  return null;
}

// ----- palette: colori gruppi -----
const STUDENT_COLOR = '#2ECC71';
const WORKER_COLOR  = '#9B59B6';
const C    = { stu:STUDENT_COLOR, lav:WORKER_COLOR };
const FONT = 'Source Code Pro';

// ----- canvas 9:16 -----
// W,H = spazio di PROGETTO in cui è tarata tutta la geometria dello sketch.
const W = 720, H = 1280;
// Risoluzione del canvas di uscita (lo sketch viene poi inserito nel frame).
const OUT_W = 1080, OUT_H = 1920;
const FPS   = 30;

// ----- parametri animazione (toccare qui per tarare) -----
const START_HOLD_MS = 2000;  // pausa iniziale prima che partano le linee
const RACE_MS     = 70000;   // durata corsa fino all'immagine finale
const HOLD_MS     = 10000;    // pausa sull'immagine finale prima del rientro
const RETRACT_MS  = 2000;    // durata scomparsa all'indietro verso START
const LOOP_MS     = START_HOLD_MS + RACE_MS + HOLD_MS + RETRACT_MS;
const RACE_LAPS   = 4;      // giri completi prima del tratto finale misurato

// ----- confini delle corsie (linee puntinate) -----
const SHOW_BOUNDARIES     = true;  // true/false: mostra corsie delimitate dai puntini
const BOUNDARY_DOT_SPACING = 5.2;    // distanza fra un puntino e il successivo (px)
const BOUNDARY_DOT_SIZE    = 1.3;  // diametro di ogni puntino (px)
const BOUNDARY_ALPHA       = 120;   // trasparenza delle linee 0 (invisibili) → 255 (piene)

// ----- simbolo in testa a ogni corsia (precede il valore) -----
// Per ogni tipo di domanda puoi scegliere il simbolo che fa da "testa".
//   'dot'  = pallino tondo (come prima)
//   'rect' = piccolo rettangolino
//   qualsiasi altra stringa (es. '//') viene disegnata come testo.
const HEAD_MARKER = {
  cat: 'rect',     // domande categoriali → categoria più usata
  lik: 'rect'    // domande con percentuale / valore likert
};
const HEAD_MARKER_SIZE = 8;  // dimensione di riferimento del simbolo (px)
// Spazio vuoto fra la scia ripetuta e la parola finale in grassetto (px):
// più alto = la parola grassa resta più isolata dal resto della scia.
const BOLD_TAIL_GAP    = 22;

// Scia: frazione del perimetro della corsia.
//   minima a metrica 0, massima a metrica 1.
const TRAIL_FRAC_MIN = 0.20;
const TRAIL_FRAC_MAX = 0.42;
// Quanto della scia si dirada dalla coda: il resto è solido.
// Le lettere diradate vengono saltate, mai rese trasparenti.
const TRAIL_DROP_FRAC = 0.55;

// ----- geometria pista -----
const TRACK_TOP    = 315;    // posizione verticale del centro della curva alta (bordo alto fisso)
const innerR       = 44;
const straightLen  = 480;    // ← altezza della pista (lunghezza dei rettilinei verticali)
const PAIR_PITCH   = 40;     // distanza fra le coppie (raggio)
const TITLE_TO_STU = 15;     // distanza titolo → corsia STU
const STU_TO_LAV   = 15;     // distanza corsia STU → corsia LAV
const TITLE_FONT   = 10;
const TRAIL_FONT   = 12;
const LABEL_FONT   = 10;
const DOT_SIZE     = 8;

// ----- riquadri in basso: GIORNO/RISPOSTE (sx) e legenda (dx) -----
const BOX_FONT     = 15;   // corpo testo nei riquadri
const BOX_PAD      = 12;   // padding interno
const BOX_LH       = 22;   // altezza riga
const BOX_MARK     = 10;   // lato del marker colorato (legenda)
const BOX_MARK_GAP = 10;   // spazio marker → etichetta
const BOX_BORDER   = 0;   // alpha del bordo dei riquadri (0 = nessun bordo)
const BOX_FRAME_GAP = 1;  // rientro rispetto ai margini laterali del frame esterno
const BOX_BOTTOM   = 0;   // distanza del fondo dei riquadri dal bordo basso

let cx, cy, topCy, botCy;

// ----- dati -----
let table, loaded=false, dataError='';
let rows=[], N=0;
let responseTimes=[], totalResponses=0;
let tMin, tMax;
let finalAgg;

// ----- stato runtime -----
let startMs;
let prevLoopElapsed = 0;
let currentAgg;            // aggregato cumulativo corrente
let lastIncludedIdx = -1;  // ultimo indice di riga incluso
let sourceCodeProRegular, sourceCodeProBold;

function preload(){
  sourceCodeProRegular = loadFont('../fonts/SourceCodePro-Regular.ttf');
  sourceCodeProBold = loadFont('../fonts/SourceCodePro-Bold.ttf');
  table = loadTable('../dati.csv','csv','header',
    () => { loaded = true; },
    () => { dataError = 'dati.csv non trovato'; }
  );
  loadFrameAssets();   // QR del footer (templateFrame.js)
}

function setup(){
  createCanvas(OUT_W, OUT_H);
  // 1 px del buffer = 1 px di uscita: i frame catturati sono esattamente
  // 1080x1920 (alza a 2 se vuoi supersampling per un export più nitido).
  pixelDensity(1);
  frameRate(FPS);

  textFont(sourceCodeProRegular);

  cx = W/2;
  // Il bordo alto della pista resta ancorato a TRACK_TOP: riducendo
  // straightLen la pista si accorcia verso l'alto, non verso il centro.
  topCy = TRACK_TOP;
  botCy = topCy + straightLen;
  cy    = (topCy + botCy) / 2;

  if(loaded) buildData();
  restart();
}

// ----- geometria delle corsie -----
// Ogni "coppia" (i=0 → la più esterna) ha tre anelli:
//   1. titolo (bianco)
//   2. corsia STU (blu)
//   3. corsia LAV (rosso)
function pairTopR(i){
  return innerR + (LANES.length - i) * PAIR_PITCH;
}
function titleR(i){ return pairTopR(i); }
function laneR(i, g){
  return g === 'stu'
    ? pairTopR(i) - TITLE_TO_STU
    : pairTopR(i) - TITLE_TO_STU - STU_TO_LAV;
}
function boundaryR(level){
  if(level === 0)              return pairTopR(0) + 6;             // bordo esterno
  if(level === LANES.length)   return innerR - 4;                  // bordo interno
  return (laneR(level-1, 'lav') + titleR(level)) / 2;
}
// Geometria della pista (due rette verticali + due semicerchi):
//   halfFor/perimFor = mezzo perimetro / perimetro a raggio r
//   posSide/posCW    = punto {x,y} a distanza d'arco s lungo la corsia (orario)
//   tangent          = angolo della corsia in s (per orientare le lettere)
function halfFor(r){ return PI*r + straightLen; }
function perimFor(r){ return 2*halfFor(r); }
function posSide(side, r, s){
  const q = PI*r/2;
  if(s <= q){
    const phi = s/r;
    return { x: cx + side*r*sin(phi), y: topCy - r*cos(phi) };
  }
  if(s <= q + straightLen){
    return { x: cx + side*r, y: topCy + (s - q) };
  }
  const phi = (s - q - straightLen)/r;
  return { x: cx + side*r*cos(phi), y: botCy + r*sin(phi) };
}
function posCW(r, s){
  const P = perimFor(r), h = halfFor(r);
  s = ((s % P) + P) % P;
  return s <= h ? posSide(+1, r, s) : posSide(-1, r, P - s);
}
function tangent(r, s){
  const a = posCW(r, s), b = posCW(r, s + 1.0);
  return atan2(b.y - a.y, b.x - a.x);
}

// ----- caricamento dati -----
function parseTime(s){
  if(!s) return 0;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[.,:\s](\d{1,2})[.,:\s](\d{1,2})$/);
  if(!m) return 0;
  return new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +m[6]).getTime();
}
function buildData(){
  rows = [];
  responseTimes = [];
  for(let r = 0; r < table.getRowCount(); r++){
    const t = parseTime(table.getString(r, COL.time));
    if(!t) continue;
    responseTimes.push(t);
    const g = groupOf(table.getString(r, COL.group));
    if(!g) continue;
    rows.push({
      g,
      t,
      v: {
        mezzo:  table.getString(r, COL.mezzo),
        motivo: table.getString(r, COL.motivo),
        comp:   table.getString(r, COL.comp),
        sic:    parseFloat(table.getString(r, COL.sic)),
        app:    parseFloat(table.getString(r, COL.app)),
        inter:  parseFloat(table.getString(r, COL.inter))
      }
    });
  }
  rows.sort((a, b) => a.t - b.t);
  responseTimes.sort((a, b) => a - b);
  N = rows.length;
  totalResponses = responseTimes.length;
  if(totalResponses > 0){
    tMin = responseTimes[0];
    tMax = responseTimes[totalResponses - 1];
  }

  finalAgg = newAgg();
  rows.forEach(o => foldInto(finalAgg, o));
}

function newAgg(){
  const mk = () => ({
    counts: { mezzo:{}, motivo:{}, comp:{} },
    seq:    { mezzo:[], motivo:[], comp:[] },
    sums:   { sic:0, app:0, inter:0 },
    ns:     { sic:0, app:0, inter:0 },
    n: 0
  });
  return { stu: mk(), lav: mk() };
}
function foldInto(agg, o){
  const a = agg[o.g]; a.n++;
  ['mezzo','motivo','comp'].forEach(k => {
    const l = shortLabel(k, o.v[k]);
    if(l){
      a.counts[k][l] = (a.counts[k][l] || 0) + 1;
      a.seq[k].push(l);
    }
  });
  ['sic','app','inter'].forEach(k => {
    if(!isNaN(o.v[k])){ a.sums[k] += o.v[k]; a.ns[k]++; }
  });
}
function topCat(a, k){
  let best = '', bc = -1, tot = 0;
  for(const l in a.counts[k]){
    tot += a.counts[k][l];
    if(a.counts[k][l] > bc){ bc = a.counts[k][l]; best = l; }
  }
  return { label: best, share: tot ? bc/tot : 0 };
}
function meanLik(a, k){ return a.ns[k] ? a.sums[k]/a.ns[k] : 0; }
// Metrica normalizzata 0..1 di una corsia per un gruppo: quota della categoria
// dominante (domande 'cat') o media likert/5 (domande 'lik'). È la frazione di
// giro extra che la testa percorre dopo i RACE_LAPS giri fissi.
function metricFor(L, g, agg){
  if(agg[g].n === 0) return 0;
  return L.type === 'cat'
    ? topCat(agg[g], L.key).share
    : meanLik(agg[g], L.key) / 5;
}
function displayValueFor(L, g, agg, scale = 1){
  if(agg[g].n === 0) return '';
  if(L.type === 'cat'){
    const top = topCat(agg[g], L.key);
    return top.share ? round(top.share * 100 * scale) + '%' : '';
  }
  const m = meanLik(agg[g], L.key);
  return m ? nf(m * scale, 1, 1) : '';
}
function runningTextFor(L, g, agg){
  if(L.type === 'cat'){
    const seq = agg[g].seq[L.key];
    return seq.length ? seq.join('   ') : '...';
  }
  return L.q;
}
function finalTextFor(L, g, agg){
  if(L.type === 'cat') return topCat(agg[g], L.key).label || '...';
  return L.q;
}
function finalMetricFor(L, g){
  return finalAgg ? metricFor(L, g, finalAgg) : 0;
}
function targetPosFor(L, i, g){
  const r = laneR(i, g);
  return (RACE_LAPS + finalMetricFor(L, g)) * perimFor(r);
}
function racePosFor(L, i, g, t){
  return targetPosFor(L, i, g) * t;
}

// ----- stato e controlli -----
function initState(){
  currentAgg = newAgg();
  lastIncludedIdx = -1;
  prevLoopElapsed = 0;
}
function restart(){ startMs = millis(); initState(); }
function keyPressed(){
  if(key === ' ') restart();
  if(key === 'f' || key === 'F') startMs = millis() - RACE_MS;
}
function mousePressed(){ restart(); }

// ----- draw -----
function draw(){
  background(0);
  drawTemplateFrame();                 // cornice fissa (templateFrame.js)

  if(!loaded || !N){ drawSketchScaled(drawMissing); return; }
  if(!currentAgg) initState();

  const now         = millis();
  const elapsed     = now - startMs;
  const loopElapsed = elapsed % LOOP_MS;
  if(loopElapsed < prevLoopElapsed) initState();
  prevLoopElapsed = loopElapsed;

  const raceElapsed  = max(0, loopElapsed - START_HOLD_MS);
  const holdStart    = START_HOLD_MS + RACE_MS;
  const retractStart = holdStart + HOLD_MS;
  const isStarting   = loopElapsed < START_HOLD_MS;
  const isHolding    = loopElapsed >= holdStart && loopElapsed < retractStart;
  const isRetracting = loopElapsed >= retractStart;
  const t            = (isHolding || isRetracting) ? 1 : constrain(raceElapsed / RACE_MS, 0, 1);
  const retractT     = isRetracting ? constrain((loopElapsed - retractStart) / RETRACT_MS, 0, 1) : 0;
  const virtualT     = lerp(tMin, tMax, t);
  const isRunning    = !isStarting && !isRetracting && t < 1;

  // Aggiorna aggregato cumulativo: includi tutte le righe il cui
  // timestamp è ormai passato nel tempo virtuale.
  while(lastIncludedIdx + 1 < rows.length &&
        rows[lastIncludedIdx + 1].t <= virtualT){
    lastIncludedIdx++;
    foldInto(currentAgg, rows[lastIncludedIdx]);
  }

  // Lo sketch (720x1280) viene inserito nel frame, invariato.
  drawSketchScaled(() => {
    if(SHOW_BOUNDARIES) drawPairBoundaries();
    drawHeader();
    drawTitles();
    LANES.forEach((L, i) => drawLane(L, i, t, retractT, isHolding, isRetracting));
    drawProgress(loopElapsed, virtualT, isStarting, isRunning, isHolding, isRetracting);
    drawLegend();
  });
}

// Inserisce lo sketch dentro la cornice esterna: lo SCALA in modo vettoriale
// (ridisegnato alla dimensione giusta, NON un raster rimpicciolito) per riempire
// la larghezza utile fra i margini, centrato verticalmente nell'area. Il clip
// del frame evita sbordi. Lo sketch non viene toccato.
function drawSketchScaled(render){
  push();
  const area = applySketchClip();              // riquadro interno (templateFrame.js)
  const s = min(area.w / W, area.h / H);        // mantieni tutto lo sketch dentro al frame
  translate(area.x + (area.w - W * s) / 2, area.y + (area.h - H * s) / 2);
  scale(s);
  render();
  removeSketchClip();
  pop();
}

// ----- linee puntinate di delimitazione coppie -----
function drawPairBoundaries(){
  noStroke();
  fill('#FFFFFF' + hex(BOUNDARY_ALPHA, 2));
  for(let level = 0; level <= LANES.length; level++){
    // I confini 0..LANES.length-1 hanno un titolo appena dentro: lì la
    // linea puntinata si interrompe per lasciare spazio alle lettere.
    const skip = level < LANES.length ? titleSkipForBoundary(level) : null;
    drawDottedOval(boundaryR(level), skip);
  }
}
function drawDottedOval(r, skip){
  const P = perimFor(r);
  for(let s = 0; s < P; s += BOUNDARY_DOT_SPACING){
    if(skip && s >= skip.start && s <= skip.end) continue;
    const p = posCW(r, s);
    circle(p.x, p.y, BOUNDARY_DOT_SIZE);
  }
}
// Arco (in unità di s, alla radius del titolo) occupato dal titolo i.
function titleArcSpan(i){
  push();
  textFont(sourceCodeProBold); textSize(TITLE_FONT); textStyle(NORMAL);
  const str = LANES[i].title.toUpperCase();
  let arc = 0;
  for(let k = 0; k < str.length; k++) arc += max(textWidth(str[k]), 3) + 0.4;
  pop();
  return { start: 10, end: 10 + arc };
}
// Stesso arco riportato sulla radius del confine, con un po' di margine.
function titleSkipForBoundary(level){
  const span = titleArcSpan(level);
  const k    = boundaryR(level) / titleR(level); // stessa apertura angolare
  const pad  = 4;
  return { start: span.start * k - pad, end: span.end * k + pad };
}

// ----- START in cima alla pista -----
function drawHeader(){
  push();
  noStroke();
  textFont(sourceCodeProRegular);

  const rTop = boundaryR(0);
  fill('#FFFFFF');
  textAlign(CENTER, BOTTOM);
  textSize(9);
  text('START', cx, topCy - rTop - 12);
  triangle(cx-4, topCy-rTop-10, cx+4, topCy-rTop-10, cx, topCy-rTop-3);
  pop();
}

// ----- titoli sopra ogni coppia di corsie -----
function drawTitles(){
  push();
  textFont(sourceCodeProRegular);
  fill('#FFFFFF');
  noStroke();
  for(let i = 0; i < LANES.length; i++){
    layStaticText(titleR(i), 10, LANES[i].title.toUpperCase(), TITLE_FONT);
  }
  pop();
}

// ----- corsia singola: scia + testa + valore -----
function drawLane(L, i, t, retractT, isHolding, isRetracting){
  ['stu', 'lav'].forEach(g => {
    const r   = laneR(i, g);
    const m   = metricFor(L, g, currentAgg);
    const finalStart = RACE_LAPS * perimFor(r);
    const targetPos  = targetPosFor(L, i, g);
    const racePos    = racePosFor(L, i, g, t);
    const pos        = isRetracting ? lerp(targetPos, finalStart, retractT) : racePos;
    const col = color(g === 'stu' ? C.stu : C.lav);

    // Dopo i giri completi inizia il tratto misurato: la stringa finale
    // cresce dallo START fino al risultato. La coda dell'ultimo giro resta
    // dietro allo START e si consuma progressivamente per non sparire di colpo.
    const finalStretch = pos >= finalStart;
    const trailLen   = perimFor(r) * lerp(TRAIL_FRAC_MIN, TRAIL_FRAC_MAX, m);
    const trailStart = finalStretch ? finalStart : max(0, pos - trailLen);

    if(pos > 0.5){
      const textAgg = finalStretch || isRetracting ? finalAgg : currentAgg;
      const txt = finalStretch
        ? finalTextFor(L, g, textAgg)
        : runningTextFor(L, g, textAgg);
      if(finalStretch){
        const finalProgress = pos - finalStart;
        const oldTailLen = max(0, trailLen - finalProgress);
        if(!isRetracting && oldTailLen > 0.5){
          layDroppingLoopedText(
            r,
            max(0, finalStart - oldTailLen),
            finalStart,
            runningTextFor(L, g, currentAgg),
            col,
            TRAIL_FONT
          );
        }
        if(L.type === 'cat'){
          // Categoria ripetuta in normale, ultima occorrenza in grassetto.
          laySolidLoopedTextBoldTail(r, trailStart, pos, txt, col, TRAIL_FONT);
        }else{
          laySolidLoopedText(r, trailStart, pos, txt, col, TRAIL_FONT);
        }
      }else{
        layDroppingLoopedText(r, trailStart, pos, txt, col, TRAIL_FONT);
      }
    }

    // Simbolo in testa: solido, nessuna trasparenza. Forma per tipo domanda.
    drawHeadMarker(r, pos, col, L.type);

    // Valore in testa: percentuale per categoriali, media 1-5 per numeriche.
    if(currentAgg[g].n > 0 || isHolding || isRetracting){
      const labelAgg = isHolding || isRetracting ? finalAgg : currentAgg;
      // In rientro il valore scende a zero man mano che la testa torna allo START.
      const scale    = isRetracting ? (1 - retractT) : 1;
      drawHeadLabel(r, pos, displayValueFor(L, g, labelAgg, scale), col);
    }
  });
}

// ----- testo statico (una sola passata) lungo la curva: per i titoli -----
function layStaticText(r, sStart, str, fontSize){
  textFont(sourceCodeProBold);
  textSize(fontSize);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  let s = sStart;
  for(let idx = 0; idx < str.length; idx++){
    const ch = str[idx];
    const w  = max(textWidth(ch), 3);
    const ang = tangent(r, s + w/2);
    const p   = posCW(r, s + w/2);
    push();
    translate(p.x, p.y);
    rotate(ang);
    text(ch, 0, 0);
    pop();
    s += w + 0.4;
  }
  textStyle(NORMAL);
}

// ----- testo ripetuto in loop, fra sStart e sEnd -----
function laySolidLoopedText(r, sStart, sEnd, str, baseCol, fontSize){
  if(!str || sEnd <= sStart) return;
  push();
  textFont(sourceCodeProRegular);
  textSize(fontSize);
  textStyle(NORMAL);
  noStroke();
  textAlign(CENTER, CENTER);
  fill(baseCol);

  const looped = str + '   ';
  let s = sStart, idx = 0, iter = 0;
  while(s < sEnd && iter < 6000){
    iter++;
    const ch = looped[idx % looped.length];
    const w  = max(textWidth(ch), 3);
    if(s + w > sEnd) break;
    const midS = s + w/2;

    const ang = tangent(r, midS);
    const p   = posCW(r, midS);
    push();
    translate(p.x, p.y);
    rotate(ang);
    text(ch, 0, 0);
    pop();
    s += w + 0.4;
    idx++;
  }
  pop();
}

// ----- una singola passata di testo (no loop), con stile scelto -----
function laySolidTextRun(r, sStart, str, baseCol, fontSize, bold){
  if(!str) return;
  push();
  textFont(bold ? sourceCodeProBold : sourceCodeProRegular);
  textSize(fontSize);
  textStyle(NORMAL);
  noStroke();
  textAlign(CENTER, CENTER);
  fill(baseCol);
  let s = sStart;
  for(let i = 0; i < str.length; i++){
    const ch = str[i];
    const w  = max(textWidth(ch), 3);
    const midS = s + w/2;
    const ang  = tangent(r, midS);
    const p    = posCW(r, midS);
    push();
    translate(p.x, p.y);
    rotate(ang);
    text(ch, 0, 0);
    pop();
    s += w + 0.4;
  }
  pop();
}

// ----- categoria ripetuta in normale, ultima occorrenza in grassetto -----
// Lascia un piccolo spazio davanti alla parola grassa per il rettangolino.
function laySolidLoopedTextBoldTail(r, sStart, sEnd, word, baseCol, fontSize){
  if(!word || sEnd <= sStart) return;
  // arco occupato dalla parola in grassetto
  push();
  textFont(sourceCodeProBold); textSize(fontSize); textStyle(NORMAL);
  let wordArc = 0;
  for(let i = 0; i < word.length; i++) wordArc += max(textWidth(word[i]), 3) + 0.4;
  pop();
  // la parola grassa finisce poco prima della testa, lasciando posto al marker
  const gap       = HEAD_MARKER_SIZE;
  const boldEnd   = sEnd - gap;
  const boldStart = boldEnd - wordArc;
  // la scia normale si ferma prima, lasciando uno stacco vuoto: così la
  // parola finale in grassetto resta isolata, senza frammenti attaccati.
  const trailEnd  = boldStart - BOLD_TAIL_GAP;
  laySolidLoopedText(r, sStart, trailEnd, word, baseCol, fontSize);
  // ultima categoria in grassetto, allineata a finire in boldEnd
  laySolidTextRun(r, boldStart, word, baseCol, fontSize, true);
}

// ----- testo con coda diradata: spariscono lettere, non colore -----
function layDroppingLoopedText(r, sStart, sEnd, str, baseCol, fontSize){
  if(!str || sEnd <= sStart) return;
  push();
  textFont(sourceCodeProRegular);
  textSize(fontSize);
  textStyle(NORMAL);
  noStroke();
  textAlign(CENTER, CENTER);
  fill(baseCol);

  const totalLen = sEnd - sStart;
  const dropEnd  = sStart + totalLen * TRAIL_DROP_FRAC;
  const dropLen  = max(1, dropEnd - sStart);
  const looped   = str + '   ';
  let s = sStart, idx = 0, iter = 0;
  while(s < sEnd && iter < 6000){
    iter++;
    const ch = looped[idx % looped.length];
    const w  = max(textWidth(ch), 3);
    if(s + w > sEnd) break;
    const midS = s + w/2;

    let drawChar = true;
    if(midS < dropEnd){
      const f = constrain((midS - sStart) / dropLen, 0, 1);
      const keepEvery = max(1, floor(lerp(9, 1, f)));
      drawChar = idx % keepEvery === 0;
    }

    if(drawChar){
      const ang = tangent(r, midS);
      const p   = posCW(r, midS);
      push();
      translate(p.x, p.y);
      rotate(ang);
      text(ch, 0, 0);
      pop();
    }
    s += w + 0.4;
    idx++;
  }
  pop();
}

// ----- simbolo in testa alla corsia, orientato sulla tangente -----
function drawHeadMarker(r, pos, col, type){
  const sym = HEAD_MARKER[type] || 'dot';
  const p   = posCW(r, pos);
  const ang = tangent(r, pos);
  push();
  noStroke();
  fill(col);
  translate(p.x, p.y);
  rotate(ang);
  if(sym === 'dot'){
    circle(0, 0, HEAD_MARKER_SIZE);
  }else if(sym === 'rect'){
    rectMode(CENTER);
    rect(0, 0, HEAD_MARKER_SIZE * 0.85, HEAD_MARKER_SIZE * 1.3);
  }else{
    textFont(sourceCodeProBold);
    textSize(HEAD_MARKER_SIZE + 4);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    text(sym, 0, 0);
    textStyle(NORMAL);
  }
  pop();
}

// ----- etichetta valore subito dopo la testa, sulla tangente -----
function drawHeadLabel(r, pos, label, col){
  push();
  textFont(sourceCodeProBold);
  textSize(LABEL_FONT);
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  noStroke();
  fill(col);
  const labelS = pos + 7;
  const p      = posCW(r, labelS);
  const ang    = tangent(r, labelS);
  push();
  translate(p.x, p.y);
  rotate(ang);
  text(label, 0, 0);
  pop();
  textStyle(NORMAL);
  pop();
}

// ----- barra progresso + giorno corrente + risposte incluse + FINE -----
function drawProgress(loopElapsed, virtualT, isStarting, isRunning, isHolding, isRetracting){
  const dayMs      = 1000*60*60*24;
  const startDay   = new Date(tMin).setHours(0, 0, 0, 0);
  const endDay     = new Date(tMax).setHours(0, 0, 0, 0);
  const virtualDay = new Date(virtualT).setHours(0, 0, 0, 0);
  const totalDays  = max(1, round((endDay - startDay) / dayMs) + 1);
  const currentDay = constrain(round((virtualDay - startDay) / dayMs) + 1, 1, totalDays);
  let includedResponses = 0;
  while(includedResponses < totalResponses && responseTimes[includedResponses] <= virtualT){
    includedResponses++;
  }
  // riquadro in basso a sinistra
  drawCornerBox([
    { label: `GIORNO ${currentDay} / ${totalDays}` },
    { label: `RISPOSTE ${includedResponses} / ${totalResponses}` },
    { label: '' },
    { label: '' },
    { label: '' }
  ], true);
}

// ----- legenda in basso a destra -----
function drawLegend(){
  drawCornerBox([
    { marker: C.stu, label: 'STUDENTI' },
    { marker: C.lav, label: 'LAVORATORI' },
    { label: '' },
    { label: 'CORSIE = DOMANDE' },
    { label: 'LA DISTANZA TRA STUDENTI E LAVORATORI MOSTRA LA DIFFERENZA NELLE RISPOSTE' }
  ], false);
}

// ----- riquadro bordato in un angolo basso; righe con marker opzionale -----
function drawCornerBox(rows, anchorRight){
  push();
  textFont(sourceCodeProRegular);
  textSize(BOX_FONT);
  textStyle(NORMAL);
  let maxW = 0;
  for(const r of rows){
    const w = (r.marker ? BOX_MARK + BOX_MARK_GAP : 0) + textWidth(r.label);
    maxW = max(maxW, w);
  }
  const boxW = maxW + BOX_PAD * 2;
  const boxH = rows.length * BOX_LH + BOX_PAD * 2;
  const area = getSketchArea();
  const s = min(area.w / W, area.h / H);
  const frameSideInset = (area.w / s - W) / 2;
  const x = anchorRight ? (W + frameSideInset + BOX_PAD - BOX_FRAME_GAP - boxW)
                        : (-frameSideInset - BOX_PAD + BOX_FRAME_GAP);
  const y = H - BOX_BOTTOM - boxH;

  if(BOX_BORDER > 0){
    noFill();
    stroke('#FFFFFF' + hex(BOX_BORDER, 2));
    strokeWeight(1);
    rect(x, y, boxW, boxH);
  }
  noStroke();
  textAlign(LEFT, CENTER);
  for(let i = 0; i < rows.length; i++){
    const r = rows[i];
    const cyRow = y + BOX_PAD + i * BOX_LH + BOX_LH / 2;
    let tx = x + BOX_PAD;
    if(r.marker){
      fill(r.marker);
      rect(tx, cyRow - BOX_MARK / 2, BOX_MARK, BOX_MARK);
      tx += BOX_MARK + BOX_MARK_GAP;
    }
    fill('#FFFFFF');
    text(r.label, tx, cyRow);
  }
  pop();
}

function drawMissing(){
  fill('#FFFFFF');
  textAlign(CENTER, CENTER);
  textSize(16);
  text(dataError || 'Carico dati.csv…', W/2, H/2 - 10);
  textSize(11);
  fill('#FFFFFF');
  text('Sketch files (▸) → Upload file → dati.csv, poi Play', W/2, H/2 + 16);
}
