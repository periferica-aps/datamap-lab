// ============================================================
// CASE BRUCIATE — "EMOZIONI PERCEPITE IN VIAGGIO"
// Progetto Tracciati 2026 · DATA MAP LAB · Periferica APS
// Stazione Minimetrò di Perugia · formato verticale 9:16
//
// Autori:
//   Giacomo Lazzerini
//   Noemi Filippini   (studentessa)
//   Pamela Spadoni    (studentessa)
//
// ------------------------------------------------------------
// COSA FA L'ANIMAZIONE
// ------------------------------------------------------------
// La visualizzazione è composta da 12 ANELLI concentrici, uno per
// ciascuna emozione che i passeggeri potevano scegliere nel
// questionario alla domanda "C'è una parola che si avvicina a quello
// che senti?". Ogni anello NON è un cerchio ma un RETTANGOLO
// ARROTONDATO (vedi rectPerimeter): le parole non stanno dentro la
// forma, ma corrono LUNGO il suo perimetro, lettera per lettera,
// come un testo che insegue il bordo.
//
// L'emozione più rara sta al centro, la più diffusa all'esterno
// (gli anelli sono ordinati per frequenza in buildRings). Ogni
// risposta del questionario diventa un PARAMETRO DINAMICO che cambia
// il comportamento di un anello. Le quattro codifiche sono:
//
//   1) LUNGHEZZA del tracciato di testo
//        -> QUANTE persone hanno scelto quella parola.
//        Più passeggeri condividono l'emozione, più lungo è il
//        nastro di parole ripetute lungo il perimetro
//        (QUESTIONS_PER_SEMICIRCLE risposte = mezzo perimetro).
//
//   2) ROTAZIONE lungo il tracciato
//        -> VELOCITÀ PERCEPITA del viaggio ("quanto veloce va questo
//        viaggio"). Chi ha sentito il viaggio veloce fa scorrere
//        l'anello più in fretta lungo il bordo.
//
//   3) RESPIRO (le lettere si distanziano e si riavvicinano)
//        -> LIVELLO DI ENERGIA medio. A riposo le parole sono fitte e
//        leggibili; nel "respiro" il tracciato si apre fino al
//        perimetro intero e le lettere si allargano, poi torna.
//        Più alta l'energia, più rapido il ciclo di apertura/chiusura.
//
//   4) COLORE (gradiente scuro -> chiaro)
//        -> SENSO DI CONTROLLO. Più il passeggero si sente in
//        controllo, più l'anello tende verso il colore chiaro.
//
// A riposo le parole stanno quasi ferme e leggibili: solo durante il
// respiro il tracciato si estende e le lettere scorrono e si allungano.
//
// ------------------------------------------------------------
// COME È FATTO (per chi vuole riutilizzarlo)
// ------------------------------------------------------------
// • I dati grezzi sono letti da ../dati.csv e AGGREGATI a runtime in
//   aggregate(): per ogni emozione si contano le risposte e si fanno
//   le medie di energia / velocità / controllo. Nessun dato è scritto
//   a mano: cambiando il CSV cambia l'immagine.
// • Tutta la geometria è costruita in uno spazio "nativo" 540×960
//   (REF_W × REF_H) e poi scalata dentro una cornice 1080×1920
//   (drawSketchScaled): si ragiona sempre nelle coordinate native.
// • L'animazione è un LOOP PERFETTO di LOOP_SECONDS: a fine ciclo lo
//   stato torna identico all'inizio, senza salti, così il video si può
//   esportare e ripetere all'infinito. Respiro e rotazione sono
//   "quantizzati" su un numero intero di cicli (vedi buildRings).
// • I PARAMETRI REGOLABILI qui sotto sono le manopole principali:
//   cambiarli ritocca il ritmo e l'aspetto senza toccare la logica.
// ============================================================

// ---------------- PARAMETRI REGOLABILI ----------------

// quante risposte "valgono" mezzo perimetro
const QUESTIONS_PER_SEMICIRCLE = 30;

// respiro (secondi per ciclo) in base all'energia media
const ENERGY_SLOW_PERIOD = 8.0;   // energia = 1  -> lento
const ENERGY_FAST_PERIOD = 2.4;   // energia = 5  -> velocissimo

// rotazione lungo il tracciato (frazioni di perimetro al secondo)
const ROT_SLOW = 0.006;  // viaggio = 1  -> quasi fermo
const ROT_FAST = 0.075;  // viaggio = 10 -> scorre veloce

// quanto la rotazione è frenata mentre la parola è "a riposo"
// (0 = a riposo è completamente ferma, 1 = gira sempre uguale)
const REST_SPIN = 0.5;

// allungamento delle lettere quando il tracciato si estende
// dilatazione dello spazio tra le lettere quando il tracciato si estende
const MIN_LETTER_SPACING_SCALE = 0.7;
const MAX_LETTER_SPACING_SCALE = 5.0;

// ---- loop seamless ----
// durata di un ciclo completo (s): ogni anello compie un numero INTERO di
// respiri e di giri in questo tempo, così a t = LOOP_SECONDS lo stato torna
// identico a t = 0 (nessun salto). Esporta il video con --dur = LOOP_SECONDS.
const LOOP_SECONDS = 60;

// ---- cornice / spazio nativo ----
const OUT_W = 1080, OUT_H = 1920;   // canvas finale (cornice)
const W = 540, H = 960;             // spazio nativo dello sketch (scalato dalla cornice)

// ---- geometria (riferimento 9:16, poi scalata alla finestra) ----
const REF_W = 540;
const REF_H = 960;
const CENTER_X = REF_W / 2;
const CENTER_Y = 300;        // centro (parte alta) dei rettangoli
const INNER_HW = 22;         // mezza-larghezza del rettangolo più interno
const INNER_HH = 40;         // mezza-altezza (verso l'alto) del più interno
const RING_GAP = 16;         // distanza tra un rettangolo e il successivo

// allungamento verso il BASSO: quanto si estende in giù ogni rettangolo,
// in frazione dell'altezza piena del rettangolo esterno.
// 0 = simmetrico, 0.5 = circa metà altezza in più verso il basso.
const STRETCH_DOWN_FRAC = 0.5;

const CORNER_FRAC = 0.45;    // raggio degli angoli (frazione del lato minore)
const FONT_MIN = 11;         // testo anello interno
const FONT_MAX = 11;       // testo anello esterno
const TRACKING = 1.5;        // spazio extra tra le lettere
const SEPARATOR = " · ";     // separatore tra ripetizioni della parola

// ---- legenda ----
// due colonne: la sinistra ancorata al margine sx (allineata a sx),
// la destra ancorata al margine dx (allineata a dx).
const LEGEND_X = 0;          // margine sinistro (x=0 nativo = margine cornice)
const LEGEND_Y = 830;        // riga del titolo
const LEGEND_SIZE = 10;      // dimensione testo
const LEGEND_LH = 20;        // interlinea tra le voci
const LEGEND_COL_W = 225;    // larghezza fissa di ciascuna colonna (regolabile)
// true  = giustificato (chiave a un margine, valore all'altro della colonna)
// false = "CHIAVE = VALORE" inline (sx allineato a sx, dx allineato a dx)
const LEGEND_JUSTIFY = false;

// gradiente colore in base al controllo (basso = scuro, alto = chiaro)
let COL_DARK, COL_LIGHT;

// le 12 emozioni, nell'ordine richiesto (interno -> esterno)
const EMOTIONS = [
  "Ansia", "Curiosità", "Entusiasmo", "Gioia",
  "Irritazione", "Noia", "Paura", "Rabbia",
  "Serenità", "Sorpresa", "Stanchezza", "Tristezza",
];

// ------------------------------------------------------

let table;             // CSV grezzo dei questionari (../dati.csv)
let rings = [];        // i 12 anelli pronti da disegnare (vedi buildRings)
let sourceCodeProRegular, sourceCodeProBold;

// preload(): p5 garantisce che font e dati siano caricati PRIMA di setup().
// loadFrameAssets()/drawTemplateFrame() arrivano dallo script condiviso della
// cornice (template), non da questo file.
function preload() {
  sourceCodeProRegular = loadFont("../fonts/SourceCodePro-Regular.ttf");
  sourceCodeProBold = loadFont("../fonts/SourceCodePro-Bold.ttf");
  loadFrameAssets();
  table = loadTable("../dati.csv", "csv", "header");
}

// setup(): si esegue una volta. Qui si fissano colori e stile del testo e,
// soprattutto, si trasformano i dati grezzi negli anelli (aggregate + buildRings).
function setup() {
  pixelDensity(1);
  createCanvas(OUT_W, OUT_H);
  textAlign(CENTER, CENTER);
  textFont(sourceCodeProRegular);
  textStyle(NORMAL);
  noStroke();
  colorMode(HSB, 360, 100, 100, 100);

  // estremi del gradiente "senso di controllo": il colore di ogni anello
  // sarà un lerp tra questi due in base al controllo medio della sua emozione.
  COL_DARK = color('#2ECC71');   // poco controllo -> scuro/freddo
  COL_LIGHT = color('#3D7BD9');  // molto controllo -> chiaro/caldo

  // pipeline dati: CSV -> statistiche per emozione -> anelli pronti a disegnare
  const stats = aggregate();
  rings = buildRings(stats);
}

// draw(): chiamato ~60 volte al secondo. Ridisegna sempre da capo (frame puro):
// la cornice fissa, poi il contenuto scalato dentro l'area utile.
function draw() {
  background(0);
  drawTemplateFrame();            // cornice fissa (dallo script del template)
  drawSketchScaled(drawContent);  // lo sketch, scalato dentro l'area
}

// inserisce il contenuto (W×H) nella cornice: scala sulla larghezza utile e
// centra verticalmente, così render() può lavorare sempre in coordinate native
// 540×960 senza sapere nulla della risoluzione finale. NON modificare.
function drawSketchScaled(render) {
  push();
  const area = applySketchClip();
  const s = area.w / W;
  translate(area.x, area.y + (area.h - H * s) / 2);
  scale(s);
  render();
  removeSketchClip();
  pop();
}

// disegna il contenuto vero e proprio nello spazio nativo W×H.
function drawContent() {
  const T = millis() * 0.001;   // tempo in secondi dall'avvio

  // sfondo del palco (riempie l'area dello sketch)
  noStroke();
  fill(0, 0, 0);   // nero (HSB: luminosità 0)
  rect(0, 0, W, H);

  // disegno dall'esterno verso l'interno (indici alti = anelli grandi):
  // così gli anelli interni stanno "sopra" e restano leggibili.
  for (let i = rings.length - 1; i >= 0; i--) {
    drawRing(rings[i], T);
  }

  drawLegend();
}

// ============================================================
// AGGREGAZIONE DATI
// Scorre il CSV una sola volta e, per ogni emozione, accumula:
//   count        -> quante persone l'hanno scelta (la frequenza)
//   eSum/eN      -> somma e conteggio dei voti "energia"   (per la media)
//   sSum/sN      -> somma e conteggio dei voti "velocità"  (per la media)
//   cSum/cN      -> somma e conteggio dei voti "controllo"  (per la media)
// Si tengono somma e conteggio separati così la media è eSum/eN, e gli N
// permettono di ignorare le risposte vuote senza falsare la media.
// ============================================================

function aggregate() {
  const stats = {};

  // una voce vuota per ogni emozione attesa (anche se non comparirà nel CSV)
  for (let i = 0; i < EMOTIONS.length; i++) {
    const name = EMOTIONS[i];

    stats[name] = {
      count: 0,
      eSum: 0,
      eN: 0,
      sSum: 0,
      sN: 0,
      cSum: 0,
      cN: 0
    };
  }

  // le colonne sono individuate per FRAMMENTO del titolo della domanda:
  // così il codice non si rompe se l'intestazione esatta nel CSV cambia.
  const cols = table.columns;
  const emoCol = cols.find((c) => c.includes("parola che si avvicina"));
  const enCol = cols.find((c) => c.includes("livello di energia"));
  const spCol = cols.find((c) => c.includes("veloce questo viaggio"));
  const ctCol = cols.find((c) => c.includes("senti in controllo"));

  // numeri scritti con la virgola decimale (es. "3,5") -> float
  const num = (r, col) => parseFloat((table.getString(r, col) || "").replace(",", "."));

  for (let r = 0; r < table.getRowCount(); r++) {
    const emo = (table.getString(r, emoCol) || "").trim();
    if (!stats[emo]) continue;   // riga senza un'emozione riconosciuta: si salta
    stats[emo].count++;
    // ogni media accumula solo i valori validi (isNaN scarta le celle vuote)
    const e = num(r, enCol); if (!isNaN(e)) { stats[emo].eSum += e; stats[emo].eN++; }
    const s = num(r, spCol); if (!isNaN(s)) { stats[emo].sSum += s; stats[emo].sN++; }
    const c = num(r, ctCol); if (!isNaN(c)) { stats[emo].cSum += c; stats[emo].cN++; }
  }
  return stats;
}

// ============================================================
// COSTRUZIONE ANELLI (rettangoli arrotondati)
// Trasforma le statistiche per emozione in oggetti "ring" già pronti per
// drawRing(). Qui avvengono TUTTI i mapping dato -> forma; drawRing si limita
// poi ad animarli nel tempo. Calcolato una volta sola in setup().
// ============================================================

function buildRings(stats) {
  const out = [];

  // Ordine interno -> esterno: emozioni meno frequenti al centro, più
  // frequenti all'esterno. L'indice i nel ciclo è quindi anche il "raggio".
  const orderedEmotions = [...EMOTIONS].sort((a, b) => {
    return stats[a].count - stats[b].count;
  });

  // medie del controllo di tutti gli anelli: servono a fissare gli estremi
  // del gradiente, così il più basso = colore scuro e il più alto = chiaro
  // (default 3 = neutro se un'emozione non ha risposte di controllo).
  const controls = orderedEmotions.map((n) =>
    stats[n].cN ? stats[n].cSum / stats[n].cN : 3
  );
  const cMin = min(controls);
  const cMax = max(controls);

  // velocità di rotazione di tutti gli anelli: serve a quantizzare i giri sul
  // RAPPORTO con il più lento (= 1 giro per loop), così nessun anello resta fermo.
  const rotFracs = orderedEmotions.map((n) =>
    map(stats[n].sN ? stats[n].sSum / stats[n].sN : 5, 1, 10, ROT_SLOW, ROT_FAST, true)
  );
  const rotMin = min(rotFracs);

  for (let i = 0; i < orderedEmotions.length; i++) {
    const name = orderedEmotions[i];
    const st = stats[name];

    // --- GEOMETRIA: ogni anello è più grande del precedente di RING_GAP ---
    const hw = INNER_HW + i * RING_GAP;
    const hhTop = INNER_HH + i * RING_GAP;             // estensione verso l'alto
    // verso il basso: +STRETCH_DOWN_FRAC dell'altezza piena del rettangolo
    // (la forma è "a goccia", più allungata in basso che in alto)
    const hhBot = hhTop * (1 + 2 * STRETCH_DOWN_FRAC); // estensione verso il basso
    const cr = min(hw, hhTop) * CORNER_FRAC;           // raggio degli angoli
    const fontSize = FONT_MAX;

    // il perimetro: P = lunghezza totale, perim.at(s) = punto a distanza s
    const perim = rectPerimeter(hw, hhTop, hhBot, cr);
    const P = perim.P;

    // --- MEDIE DEI DATI (default neutri se mancano risposte) ---
    const avgEnergy = st.eN ? st.eSum / st.eN : 3;
    const avgSpeed = st.sN ? st.sSum / st.sN : 5;
    const avgControl = st.cN ? st.cSum / st.cN : 3;

    // LUNGHEZZA-DATO = frazione del perimetro proporzionale al numero di
    // risposte (QUESTIONS_PER_SEMICIRCLE risposte = mezzo perimetro). È la
    // lunghezza "a riposo" del nastro di parole.
    const dataFrac = constrain(st.count / (2 * QUESTIONS_PER_SEMICIRCLE), 0.01, 1);
    const dataLen = dataFrac * P;

    // RESPIRO (energia) -> secondi per ciclo: più energia = ciclo più corto.
    // ROTAZIONE (velocità) -> frazione di perimetro al secondo.
    const period = map(avgEnergy, 1, 5, ENERGY_SLOW_PERIOD, ENERGY_FAST_PERIOD, true);
    const rotFrac = map(avgSpeed, 1, 10, ROT_SLOW, ROT_FAST, true);

    // ----------------------------------------------------------------
    // LOOP SENZA CUCITURE
    // Tutto ciò che segue serve a far sì che a t = LOOP_SECONDS l'anello
    // sia identico a t = 0. La regola: respiro e rotazione devono compiere
    // un numero INTERO di cicli/giri dentro la durata del loop.
    // ----------------------------------------------------------------

    // sfasamenti iniziali diversi per anello, così non "respirano" all'unisono
    const phase = (i * 0.41) % 1;
    const spin0 = P * ((i * 0.137) % 1); // posizione di partenza lungo il tracciato

    // respiro: arrotonda al numero INTERO di cicli più vicino al periodo dei
    // dati, poi ricava il periodo "effettivo" che entra esatto nel loop.
    const nBreaths = max(1, round(LOOP_SECONDS / period));
    const effPeriod = LOOP_SECONDS / nBreaths;

    // rotazione "respirante": l'anello gira più in fretta mentre respira e
    // rallenta (a REST_SPIN) a riposo. Per chiudere il loop precalcoliamo una
    // TABELLA CUMULATIVA del moto: cum[k] = quanta strada è stata percorsa
    // fino all'istante k. Integriamo numericamente (regola dei trapezi) la
    // "velocità istantanea" REST_SPIN..1 su NS campioni del loop.
    const NS = 600, stepT = LOOP_SECONDS / NS;
    const cum = new Float32Array(NS + 1);
    let acc = 0, prevR = REST_SPIN + (1 - REST_SPIN) * pulseAt(0, effPeriod, phase);
    for (let k = 1; k <= NS; k++) {
      const curR = REST_SPIN + (1 - REST_SPIN) * pulseAt(k * stepT, effPeriod, phase);
      acc += 0.5 * (prevR + curR) * stepT; // area del trapezio tra due campioni
      cum[k] = acc; prevR = curR;
    }
    const rawTotal = cum[NS] || 1;
    // giri interi proporzionali alla velocità relativa: il più lento fa 1 giro,
    // gli altri di più. Mai 0 -> tutti gli anelli ruotano davvero.
    const nRot = max(1, round(rotFrac / rotMin));
    // normalizza la tabella in 0..1: così basta moltiplicare per nRot*P per
    // sapere di quanto è avanzato lo spin (vedi drawRing/sampleCum).
    for (let k = 0; k <= NS; k++) cum[k] /= rawTotal;

    // COLORE dal controllo: avgControl mappato da [cMin,cMax] a [scuro,chiaro]
    const ct = cMax > cMin ? (avgControl - cMin) / (cMax - cMin) : 0.5;
    const col = lerpColor(COL_DARK, COL_LIGHT, ct);

    // TESTO: la parola (+ separatore) ripetuta finché il nastro è lungo almeno
    // quanto la lunghezza-dato a riposo. Il safety evita loop infiniti.
    textSize(fontSize);
    const unit = (name + SEPARATOR).toUpperCase();
    let str = "";
    let safety = 0;
    while (measureAdvance(str, fontSize) < dataLen && safety < 400) {
      str += unit;
      safety++;
    }
    if (str.length === 0) str = unit;

    // oggetto "ring": tutto ciò che serve a drawRing per animarlo nel tempo
    out.push({
      name,
      count: st.count,
      perim,
      P,
      fontSize,
      dataLen,
      effPeriod,   // respiro: secondi per ciclo (agganciato al loop)
      phase,
      spin0,       // posizione iniziale lungo il tracciato
      nRot,        // giri interi compiuti nel loop
      cum,         // tabella cumulativa normalizzata della rotazione
      color: col,
      text: str,
      avgEnergy, avgSpeed, avgControl,
    });
  }
  return out;
}

function measureAdvance(str, fontSize) {
  textSize(fontSize);
  let w = 0;
  for (const ch of str) w += textWidth(ch) + TRACKING;
  return w;
}

// ============================================================
// PERIMETRO DI UN RETTANGOLO ARROTONDATO (centrato in 0,0)
//
// Restituisce { P, at }:
//   P       = lunghezza totale del bordo
//   at(s)   = il punto {x, y} a distanza s lungo il bordo, con s in [0, P),
//             partendo dal centro del lato alto e procedendo in senso orario.
// È questo che permette al testo di "camminare" sul perimetro: basta
// chiedere at(distanza) per ogni lettera. Il bordo è descritto come una
// catena di SEGMENTI (rette e archi), ognuno con la sua lunghezza; at()
// trova il segmento giusto e vi interpola dentro.
// ============================================================

function rectPerimeter(hw, hhTop, hhBot, r) {
  r = min(r, hw, hhTop, hhBot);   // l'angolo non può superare i mezzi-lati
  const segs = [];
  // add(): accoda un segmento calcolando dove inizia/finisce in distanza
  // cumulata, così ogni seg conosce il proprio intervallo [start, end] su P.
  const add = (seg) => { seg.start = (segs.length ? segs[segs.length - 1].end : 0); seg.end = seg.start + seg.len; segs.push(seg); };

  const line = (x0, y0, x1, y1) =>
    ({ type: "line", x0, y0, x1, y1, len: dist(x0, y0, x1, y1) });
  const arc = (cx, cy, a0, a1) =>
    ({ type: "arc", cx, cy, r, a0, a1, len: r * abs(a1 - a0) });

  // partenza: centro del lato alto, orario. Alto a -hhTop, basso a +hhBot.
  add(line(0, -hhTop, hw - r, -hhTop));                  // mezzo lato alto destro
  add(arc(hw - r, -hhTop + r, -HALF_PI, 0));             // angolo alto-destra
  add(line(hw, -hhTop + r, hw, hhBot - r));              // lato destro
  add(arc(hw - r, hhBot - r, 0, HALF_PI));               // angolo basso-destra
  add(line(hw - r, hhBot, -(hw - r), hhBot));            // lato basso
  add(arc(-(hw - r), hhBot - r, HALF_PI, PI));           // angolo basso-sinistra
  add(line(-hw, hhBot - r, -hw, -hhTop + r));            // lato sinistro
  add(arc(-(hw - r), -hhTop + r, PI, PI + HALF_PI));     // angolo alto-sinistra
  add(line(-(hw - r), -hhTop, 0, -hhTop));               // mezzo lato alto sinistro

  const P = segs[segs.length - 1].end;

  // at(s): trova il punto sul bordo a distanza s. s viene riportato in [0,P)
  // (così girare oltre il perimetro "riavvolge"), poi si cerca il segmento che
  // contiene s e si interpola: lineare sulle rette, sull'angolo sugli archi.
  const at = (s) => {
    s = ((s % P) + P) % P;
    for (const seg of segs) {
      if (s <= seg.end || seg === segs[segs.length - 1]) {
        const t = seg.len > 0 ? (s - seg.start) / seg.len : 0;
        if (seg.type === "line") {
          return { x: lerp(seg.x0, seg.x1, t), y: lerp(seg.y0, seg.y1, t) };
        } else {
          const a = lerp(seg.a0, seg.a1, t);
          return { x: seg.cx + seg.r * cos(a), y: seg.cy + seg.r * sin(a) };
        }
      }
    }
  };

  return { P, at };
}

// ============================================================
// DISEGNO ANELLO
// ============================================================

function drawRing(ring, T) {
  // tempo riportato dentro il ciclo [0, LOOP_SECONDS): da qui in poi tutto è
  // funzione PURA di tLoop, ed è ciò che rende il loop perfetto.
  const tLoop = ((T % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;

  // RESPIRO: u = fase del respiro in [0,1); p = apertura 0 (riposo) .. 1 (pieno)
  const u = ((tLoop / ring.effPeriod + ring.phase) % 1 + 1) % 1;
  const p = elasticPulse(u); // 0 = a riposo, 1 = perimetro intero

  // ROTAZIONE: lo spin avanza di nRot*P interi nel loop, modulato dalla tabella
  // cumulativa (fermo a riposo, scorre durante il respiro). A fine loop la
  // tabella vale 1 -> spin = spin0 + nRot*P, cioè spin0 a meno di giri interi.
  const spin = ring.spin0 + ring.nRot * ring.P * sampleCum(ring.cum, tLoop / LOOP_SECONDS);

  // lunghezza attuale del nastro: tra la lunghezza-dato (riposo) e tutto il
  // perimetro (respiro pieno). È questo che fa "allungare" il testo.
  const currentLen = lerp(ring.dataLen, ring.P, p);

  textSize(ring.fontSize);
  const chars = [...ring.text];
  const n = chars.length;

  // larghezza naturale complessiva del testo (lettere a distanza normale)
  let naturalLen = 0;
  for (const ch of chars) {
    naturalLen += textWidth(ch) + TRACKING;
  }

  // invece di DEFORMARE le lettere (che diventerebbero illeggibili), dilatiamo
  // lo SPAZIO tra loro: lo stesso testo riempie currentLen restando nitido.
  // Il constrain evita estremi (lettere appiccicate o troppo sparse).
  let spacingScale = naturalLen > 0 ? currentLen / naturalLen : 1;
  spacingScale = constrain(
    spacingScale,
    MIN_LETTER_SPACING_SCALE,
    MAX_LETTER_SPACING_SCALE
  );

  const baseCol = ring.color;

  push();
  translate(CENTER_X, CENTER_Y);   // origine al centro degli anelli

  // cursore = distanza lungo il bordo, centrata sulla lunghezza attuale
  // (il nastro è simmetrico rispetto al punto di partenza spin)
  let cursor = -currentLen / 2;

  for (let i = 0; i < n; i++) {
    const ch = chars[i];

    const charW = textWidth(ch);
    const adv = (charW + TRACKING) * spacingScale;   // passo della lettera

    // d = centro della lettera nel nastro; s = sua posizione assoluta sul bordo
    const d = cursor + adv / 2;
    const s = spin + d;

    cursor += adv;

    if (ch === " ") continue;   // gli spazi avanzano ma non si disegnano

    // posizione della lettera + ORIENTAMENTO: confrontando due punti vicini
    // (s±0.6) si ricava la tangente al bordo, così la lettera "segue" la curva.
    const pt = ring.perim.at(s);
    const a = ring.perim.at(s + 0.6);
    const b = ring.perim.at(s - 0.6);
    const ang = atan2(a.y - b.y, a.x - b.x);

    fill(baseCol);

    push();
    translate(pt.x, pt.y);
    rotate(ang);

    // niente scale: la lettera resta a dimensione naturale (vedi spacingScale)
    text(ch, 0, 0);

    pop();
  }

  pop();
}

// ============================================================
// LEGENDA
// ============================================================

function drawLegend() {
  push();
  textAlign(LEFT, CENTER);
  textStyle(NORMAL);
  textSize(LEGEND_SIZE);

  const titleY = LEGEND_Y;
  const leftRowY1 = titleY + LEGEND_LH;
  const leftRowY2 = leftRowY1 + LEGEND_LH;
  const leftRowY3 = leftRowY2 + LEGEND_LH;
  const rightRowY3 = leftRowY3;

  // colonna sinistra: [leftL, leftR] al margine sinistro
  const leftL = LEGEND_X;
  const leftR = LEGEND_X + LEGEND_COL_W;
  // colonna destra: [rightL, rightR] al margine destro (specularmente)
  const rightR = W - LEGEND_X;
  const rightL = rightR - LEGEND_COL_W;

  // titolo (allineato a sinistra)
  fill(0, 0, 100);
  text("EMOZIONI PERCEPITE IN VIAGGIO", leftL, titleY);

  // colonna sinistra (allineata a sx), colonna destra (allineata a dx)
  drawLegendEntry(leftL, leftR, leftRowY1, "LUNGHEZZA", "PASSEGGERI CHE CONDIVIDONO LA STESSA EMOZIONE", false);
  drawLegendEntry(leftL, leftR, leftRowY2, "ROTAZIONE", "VELOCITÀ PERCEPITA DEL VIAGGIO", false);
  drawLegendEntry(leftL, leftR, leftRowY3, "RESPIRO FRA LE LETTERE", "LIVELLO DI ENERGIA PERSONALE", false);
  drawLegendColor(rightL, rightR, rightRowY3, "COLORE", "SENSO DI CONTROLLO", true);

  pop();
}

// swatch del gradiente controllo (scuro -> chiaro)
function drawLegendSwatch(x, y, gw, gh) {
  noStroke();
  const gy = y - gh / 2;
  for (let i = 0; i < gw; i++) {
    fill(lerpColor(COL_DARK, COL_LIGHT, i / (gw - 1)));
    rect(x + i, gy, 1.1, gh);
  }
}

// voce testuale. alignRight = colonna ancorata al bordo destro (xR).
// LEGEND_JUSTIFY: chiave+= su un margine, valore sull'altro; altrimenti inline.
function drawLegendEntry(xL, xR, y, key, val, alignRight) {
  textSize(LEGEND_SIZE);

  if (LEGEND_JUSTIFY) {
    fill(0, 0, 100); text(key + " ", xL, y);
    fill(0, 0, 100); text("=", xL + textWidth(key + " "), y);
    fill(0, 0, 100); text(val, xR - textWidth(val), y);
    return;
  }

  // inline "KEY = VAL", allineato al bordo sx o dx del box
  const total = textWidth(key + " = " + val);
  let cx = alignRight ? xR - total : xL;
  fill(0, 0, 100); text(key + " ", cx, y);     cx += textWidth(key + " ");
  fill(0, 0, 100); text("= ", cx, y);          cx += textWidth("= ");
  fill(0, 0, 100); text(val, cx, y);
}

// voce colore: "SENSO DI CONTROLLO - 1 [gradiente] 5".
function drawLegendColor(xL, xR, y, key, val, alignRight) {
  textSize(LEGEND_SIZE);
  const gw = 40, gh = LEGEND_SIZE * 0.85;
  const minLabel = "1";
  const maxLabel = "5";
  const prefix = val + " - ";

  if (LEGEND_JUSTIFY) {
    let cx = xL;
    fill(0, 0, 100); text(prefix, cx, y);     cx += textWidth(prefix);
    fill(0, 0, 100); text(minLabel, cx, y);   cx += textWidth(minLabel) + 3;
    drawLegendSwatch(cx, y, gw, gh);         cx += gw + 3;
    fill(0, 0, 100); text(maxLabel, cx, y);
    return;
  }

  // inline "VAL - 1 [swatch] 5"
  const total = textWidth(prefix + minLabel) + 3 + gw + 3 + textWidth(maxLabel);
  let cx = alignRight ? xR - total : xL;
  fill(0, 0, 100); text(prefix, cx, y);       cx += textWidth(prefix);
  fill(0, 0, 100); text(minLabel, cx, y);     cx += textWidth(minLabel) + 3;
  drawLegendSwatch(cx, y, gw, gh);           cx += gw + 3;
  fill(0, 0, 100); text(maxLabel, cx, y);
}

// ============================================================
// RESPIRO: tanto tempo a riposo, breve estensione fino al perimetro
// ============================================================

// elasticPulse(u): dato u = fase del respiro in [0,1), restituisce l'apertura
// in [0,1]. La curva non è simmetrica: una fase di apertura, una breve tenuta
// al massimo, una chiusura, e poi un lungo riposo a 0. Così le parole stanno
// ferme e leggibili per la maggior parte del tempo e "respirano" solo a tratti.
function elasticPulse(u) {
  const OPEN = 0.20;  // si estende (ease-out: parte rapida, frena)
  const HOLD = 0.05;  // tiene aperto al massimo
  const CLOSE = 0.20; // torna a riposo (ease-in-out: morbida)
  if (u < OPEN) return easeOutCubic(u / OPEN);
  if (u < OPEN + HOLD) return 1;
  if (u < OPEN + HOLD + CLOSE) return 1 - easeInOutCubic((u - OPEN - HOLD) / CLOSE);
  return 0; // resto del tempo: a riposo (parole ferme)
}

// apertura del respiro a un dato istante t (secondi), per periodo e fase
// dell'anello. Usata in buildRings per precalcolare la tabella di rotazione.
function pulseAt(t, period, phase) {
  const u = ((t / period + phase) % 1 + 1) % 1;
  return elasticPulse(u);
}

// legge la tabella cumulativa normalizzata in x in [0,1] (interpolazione
// lineare tra i due campioni più vicini). È l'inversa di "quanta strada".
function sampleCum(cum, x) {
  const NS = cum.length - 1;
  const f = constrain(x, 0, 1) * NS;
  const i = floor(f);
  return i >= NS ? cum[NS] : lerp(cum[i], cum[i + 1], f - i);
}

// curve di smorzamento standard, x in [0,1] -> [0,1].
// easeOutCubic: parte veloce e rallenta (buona per l'apertura del respiro).
function easeOutCubic(x) {
  return 1 - pow(1 - x, 3);
}

// easeInOutCubic: lenta agli estremi, veloce al centro (chiusura morbida).
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2;
}

// canvas fisso a OUT_W×OUT_H: il CSS lo adatta alla finestra per l'anteprima.
