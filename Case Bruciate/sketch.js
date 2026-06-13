// ============================================================
// 12 EMOZIONI IN TRANSITO — formato verticale 9:16
// "C'è una parola che si avvicina a quello che senti?"
//
// Ogni emozione è un RETTANGOLO ARROTONDATO concentrico. La parola
// scorre lungo il suo perimetro. Codifica:
//   • LUNGHEZZA del tracciato  -> quante persone hanno scelto la parola
//       (QUESTIONS_PER_SEMICIRCLE risposte = mezzo perimetro)
//   • RESPIRO (apre/chiude fino al perimetro intero e torna)
//       -> "livello di energia" medio
//   • ROTAZIONE lungo il tracciato -> "quanto veloce va questo viaggio"
//   • COLORE chiaro -> scuro -> "quanto ti senti in controllo"
//
// A riposo le parole stanno quasi ferme e leggibili; solo quando il
// tracciato si estende le lettere si allungano e scorrono.
//
// Dati letti e aggregati a runtime da dati.csv.
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

let table;
let rings = [];

function preload() {
  loadFrameAssets();
  table = loadTable("../dati.csv", "csv", "header");
}

function setup() {
  createCanvas(OUT_W, OUT_H);
  pixelDensity(min(2, window.devicePixelRatio || 1));
  textAlign(CENTER, CENTER);
  textFont("Source Code Pro");
  textStyle(NORMAL);
  noStroke();
  colorMode(HSB, 360, 100, 100, 100);

  COL_DARK = color('#2ECC71');   // poco controllo -> scuro/freddo
  COL_LIGHT = color('#3D7BD9');  // molto controllo -> chiaro/caldo

  const stats = aggregate();
  rings = buildRings(stats);
}

function draw() {
  background(0);
  drawTemplateFrame();            // cornice fissa
  drawSketchScaled(drawContent);  // lo sketch, scalato dentro l'area
}

// inserisce il contenuto (W×H) nella cornice: scala sulla larghezza
// utile, centrato verticalmente. NON modificare.
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

function drawContent() {
  const T = millis() * 0.001;

  // sfondo del palco (riempie l'area dello sketch)
  noStroke();
  fill(0, 0, 0);   // nero (HSB: luminosità 0)
  rect(0, 0, W, H);

  // dall'esterno verso l'interno
  for (let i = rings.length - 1; i >= 0; i--) {
    drawRing(rings[i], T);
  }

  drawLegend();
}

// ============================================================
// AGGREGAZIONE DATI
// ============================================================

function aggregate() {
  const stats = {};

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

  const cols = table.columns;
  const emoCol = cols.find((c) => c.includes("parola che si avvicina"));
  const enCol = cols.find((c) => c.includes("livello di energia"));
  const spCol = cols.find((c) => c.includes("veloce questo viaggio"));
  const ctCol = cols.find((c) => c.includes("senti in controllo"));

  const num = (r, col) => parseFloat((table.getString(r, col) || "").replace(",", "."));

  for (let r = 0; r < table.getRowCount(); r++) {
    const emo = (table.getString(r, emoCol) || "").trim();
    if (!stats[emo]) continue;
    stats[emo].count++;
    const e = num(r, enCol); if (!isNaN(e)) { stats[emo].eSum += e; stats[emo].eN++; }
    const s = num(r, spCol); if (!isNaN(s)) { stats[emo].sSum += s; stats[emo].sN++; }
    const c = num(r, ctCol); if (!isNaN(c)) { stats[emo].cSum += c; stats[emo].cN++; }
  }
  return stats;
}

// ============================================================
// COSTRUZIONE ANELLI (rettangoli arrotondati)
// ============================================================

function buildRings(stats) {
  const out = [];
  
    // Ordine interno -> esterno:
  // meno frequenti dentro, più frequenti fuori
  const orderedEmotions = [...EMOTIONS].sort((a, b) => {
    return stats[a].count - stats[b].count;
  });

  // medie del controllo, per definire min/max del gradiente
  const controls = orderedEmotions.map((n) =>
    stats[n].cN ? stats[n].cSum / stats[n].cN : 3
  );
  const cMin = min(controls);
  const cMax = max(controls);

  // velocità di rotazione di tutti gli anelli, per quantizzare i giri sul
  // RAPPORTO (il più lento = 1 giro), così nessun anello resta fermo
  const rotFracs = orderedEmotions.map((n) =>
    map(stats[n].sN ? stats[n].sSum / stats[n].sN : 5, 1, 10, ROT_SLOW, ROT_FAST, true)
  );
  const rotMin = min(rotFracs);

  for (let i = 0; i < orderedEmotions.length; i++) {
    const name = orderedEmotions[i];
    const st = stats[name];

    const hw = INNER_HW + i * RING_GAP;
    const hhTop = INNER_HH + i * RING_GAP;             // estensione verso l'alto
    // verso il basso: +STRETCH_DOWN_FRAC dell'altezza piena del rettangolo
    const hhBot = hhTop * (1 + 2 * STRETCH_DOWN_FRAC); // estensione verso il basso
    const cr = min(hw, hhTop) * CORNER_FRAC;
    const fontSize = FONT_MAX;

    const perim = rectPerimeter(hw, hhTop, hhBot, cr);
    const P = perim.P;

    const avgEnergy = st.eN ? st.eSum / st.eN : 3;
    const avgSpeed = st.sN ? st.sSum / st.sN : 5;
    const avgControl = st.cN ? st.cSum / st.cN : 3;

    // lunghezza-dato: frazione del perimetro proporzionale alle risposte
    // (QUESTIONS_PER_SEMICIRCLE risposte = mezzo perimetro)
    const dataFrac = constrain(st.count / (2 * QUESTIONS_PER_SEMICIRCLE), 0.01, 1);
    const dataLen = dataFrac * P;

    const period = map(avgEnergy, 1, 5, ENERGY_SLOW_PERIOD, ENERGY_FAST_PERIOD, true);
    const rotFrac = map(avgSpeed, 1, 10, ROT_SLOW, ROT_FAST, true);

    // --- loop seamless: respiro e rotazione agganciati a LOOP_SECONDS ---
    const phase = (i * 0.41) % 1;
    const spin0 = P * ((i * 0.137) % 1); // posizione di partenza lungo il tracciato

    // respiro: numero INTERO di cicli nel loop (periodo ~ quello dei dati)
    const nBreaths = max(1, round(LOOP_SECONDS / period));
    const effPeriod = LOOP_SECONDS / nBreaths;

    // rotazione: tabella cumulativa del "ritmo" (REST_SPIN a riposo, scorre col
    // respiro) normalizzata 0..1, così lo spin avanza di nRot*P interi nel loop
    // e torna alla posizione di partenza. nRot = giri interi più vicini al moto
    // reale (anelli lenti -> 0 giri: fermi ma respirano; veloci -> 1+ giri).
    const NS = 600, stepT = LOOP_SECONDS / NS;
    const cum = new Float32Array(NS + 1);
    let acc = 0, prevR = REST_SPIN + (1 - REST_SPIN) * pulseAt(0, effPeriod, phase);
    for (let k = 1; k <= NS; k++) {
      const curR = REST_SPIN + (1 - REST_SPIN) * pulseAt(k * stepT, effPeriod, phase);
      acc += 0.5 * (prevR + curR) * stepT; // trapezi
      cum[k] = acc; prevR = curR;
    }
    const rawTotal = cum[NS] || 1;
    // giri interi proporzionali alla velocità relativa: il più lento fa 1 giro,
    // gli altri di più. Mai 0 -> tutti gli anelli ruotano.
    const nRot = max(1, round(rotFrac / rotMin));
    for (let k = 0; k <= NS; k++) cum[k] /= rawTotal;

    // colore dal controllo: cMin -> scuro, cMax -> chiaro
    const ct = cMax > cMin ? (avgControl - cMin) / (cMax - cMin) : 0.5;
    const col = lerpColor(COL_DARK, COL_LIGHT, ct);

    // testo (parola ripetuta) lungo abbastanza da riempire la
    // lunghezza-dato a misura naturale delle lettere
    textSize(fontSize);
    const unit = (name + SEPARATOR).toUpperCase();
    let str = "";
    let safety = 0;
    while (measureAdvance(str, fontSize) < dataLen && safety < 400) {
      str += unit;
      safety++;
    }
    if (str.length === 0) str = unit;

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
// at(s) -> {x, y} con s in [0, P), partendo dal centro-alto, orario
// ============================================================

function rectPerimeter(hw, hhTop, hhBot, r) {
  r = min(r, hw, hhTop, hhBot);
  const segs = [];
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
  // tempo dentro il ciclo: tutto è funzione pura di tLoop -> loop seamless
  const tLoop = ((T % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;

  const u = ((tLoop / ring.effPeriod + ring.phase) % 1 + 1) % 1;
  const p = elasticPulse(u); // 0 = a riposo, 1 = perimetro intero

  // rotazione: avanza di nRot*P interi nel loop (ferma a riposo, scorre col
  // respiro tramite la tabella cumulativa) -> a fine loop torna a spin0
  const spin = ring.spin0 + ring.nRot * ring.P * sampleCum(ring.cum, tLoop / LOOP_SECONDS);

  const currentLen = lerp(ring.dataLen, ring.P, p);

  textSize(ring.fontSize);
  const chars = [...ring.text];
  const n = chars.length;

  // larghezza naturale complessiva del testo
  let naturalLen = 0;
  for (const ch of chars) {
    naturalLen += textWidth(ch) + TRACKING;
  }

  // invece di deformare le lettere, dilatiamo lo spazio tra loro
  let spacingScale = naturalLen > 0 ? currentLen / naturalLen : 1;
  spacingScale = constrain(
    spacingScale,
    MIN_LETTER_SPACING_SCALE,
    MAX_LETTER_SPACING_SCALE
  );

  const baseCol = ring.color;

  push();
  translate(CENTER_X, CENTER_Y);

  // cursore lungo la stringa, centrato rispetto alla lunghezza attuale
  let cursor = -currentLen / 2;

  for (let i = 0; i < n; i++) {
    const ch = chars[i];

    const charW = textWidth(ch);
    const adv = (charW + TRACKING) * spacingScale;

    // centro della lettera nello spazio dilatato
    const d = cursor + adv / 2;
    const s = spin + d;

    cursor += adv;

    if (ch === " ") continue;

    const pt = ring.perim.at(s);
    const a = ring.perim.at(s + 0.6);
    const b = ring.perim.at(s - 0.6);
    const ang = atan2(a.y - b.y, a.x - b.x);

    fill(baseCol);

    push();
    translate(pt.x, pt.y);
    rotate(ang);

    // niente scale: la lettera resta normale
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

function elasticPulse(u) {
  const OPEN = 0.20;  // si estende
  const HOLD = 0.05;  // tiene aperto
  const CLOSE = 0.20; // torna a riposo
  if (u < OPEN) return easeOutCubic(u / OPEN);
  if (u < OPEN + HOLD) return 1;
  if (u < OPEN + HOLD + CLOSE) return 1 - easeInOutCubic((u - OPEN - HOLD) / CLOSE);
  return 0; // resto del tempo: a riposo (parole ferme)
}

// respiro a un dato istante (t in secondi), per periodo e fase dell'anello
function pulseAt(t, period, phase) {
  const u = ((t / period + phase) % 1 + 1) % 1;
  return elasticPulse(u);
}

// legge la tabella cumulativa normalizzata in x in [0,1] (interpolazione lineare)
function sampleCum(cum, x) {
  const NS = cum.length - 1;
  const f = constrain(x, 0, 1) * NS;
  const i = floor(f);
  return i >= NS ? cum[NS] : lerp(cum[i], cum[i + 1], f - i);
}

function easeOutCubic(x) {
  return 1 - pow(1 - x, 3);
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2;
}

// canvas fisso a OUT_W×OUT_H: il CSS lo adatta alla finestra per l'anteprima.
