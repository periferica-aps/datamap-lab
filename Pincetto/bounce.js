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

// ---- geometria (riferimento 9:16, poi scalata alla finestra) ----
const REF_W = 540;
const REF_H = 960;
const CENTER_X = REF_W / 2;
const CENTER_Y = 268;        // centro (parte alta) dei rettangoli
const INNER_HW = 22;         // mezza-larghezza del rettangolo più interno
const INNER_HH = 40;         // mezza-altezza (verso l'alto) del più interno
const RING_GAP = 16;         // distanza tra un rettangolo e il successivo

// allungamento verso il BASSO: quanto si estende in giù ogni rettangolo,
// in frazione dell'altezza piena del rettangolo esterno.
// 0 = simmetrico, 0.5 = circa metà altezza in più verso il basso.
const STRETCH_DOWN_FRAC = 0.5;

const CORNER_FRAC = 0.45;    // raggio degli angoli (frazione del lato minore)
const FONT_MIN = 11;         // testo anello interno
const FONT_MAX = 16.5;       // testo anello esterno
const TRACKING = 1.5;        // spazio extra tra le lettere
const SEPARATOR = " · ";     // separatore tra ripetizioni della parola

// ---- legenda (minimale) ----
const LEGEND_X = 40;
const LEGEND_Y = 792;        // riga di partenza
const LEGEND_SIZE = 10;      // dimensione testo
const LEGEND_LH = 19;        // interlinea

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
  table = loadTable("dati.csv", "csv", "header");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(min(2, window.devicePixelRatio || 1));
  textAlign(CENTER, CENTER);
  textFont("Source Code Pro");
  textStyle(NORMAL);
  noStroke();
  colorMode(HSB, 360, 100, 100, 100);

  COL_DARK = color(232, 70, 26);   // poco controllo -> scuro/freddo
  COL_LIGHT = color(44, 12, 100);  // molto controllo -> chiaro/caldo

  const stats = aggregate();
  rings = buildRings(stats);
}

function draw() {
  background(228, 32, 7);

  // palco 9:16 centrato nella finestra
  const s = min(width / REF_W, height / REF_H);
  const ox = (width - REF_W * s) / 2;
  const oy = (height - REF_H * s) / 2;
  const T = millis() * 0.001;
  const dt = min(deltaTime, 50) * 0.001;

  push();
  translate(ox, oy);
  scale(s);

  // sfondo del palco
  noStroke();
  fill(228, 32, 4);
  rect(0, 0, REF_W, REF_H);

  // dall'esterno verso l'interno
  for (let i = rings.length - 1; i >= 0; i--) {
    drawRing(rings[i], T, dt);
  }

  drawLegend();
  pop();
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
      period,
      rotFrac,
      color: col,
      phase: (i * 0.41) % 1,
      spin: P * ((i * 0.137) % 1), // posizione di partenza lungo il tracciato
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

function drawRing(ring, T, dt) {
  const u = ((T / ring.period + ring.phase) % 1 + 1) % 1;
  const p = elasticPulse(u); // 0 = a riposo, 1 = perimetro intero

  // la rotazione è quasi ferma a riposo, scorre quando esteso
  ring.spin += ring.rotFrac * ring.P * (REST_SPIN + (1 - REST_SPIN) * p) * dt;

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
    const s = ring.spin + d;

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

  const x = LEGEND_X;
  const col2 = x + 78; // colonna del significato (monospace -> allineata)
  let y = LEGEND_Y;

  const row = (k, v) => {
    fill(0, 0, 48);
    text(k, x, y);
    fill(0, 0, 78);
    text(v, col2, y);
    y += LEGEND_LH;
  };

  row("lunghezza", "quante persone");
  row("rotazione", "velocità del viaggio");
  row("respiro", "energia");

  // riga colore con micro-gradiente
  fill(0, 0, 48);
  text("colore", x, y);
  const gw = 46, gh = 8, gx = col2, gy = y - gh / 2;
  noStroke();
  for (let i = 0; i < gw; i++) {
    fill(lerpColor(COL_LIGHT, COL_DARK, i / (gw - 1)));
    rect(gx + i, gy, 1.1, gh);
  }
  fill(0, 0, 78);
  text("controllo", gx + gw + 8, y);

  pop();
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

function easeOutCubic(x) {
  return 1 - pow(1 - x, 3);
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
