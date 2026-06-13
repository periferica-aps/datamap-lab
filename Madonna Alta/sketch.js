const CSV_NAME = '../dati.csv';
const OUT_W = 1080, OUT_H = 1920;
const W = 980, H = 1520;

// ══════════════════════════════════════════════════════════════════════
//  SELETTORE PALETTE  →  cambia solo questo numero
//  1 = Soft pastel   #F6CBE9 / #91D9D2 / #F2EB88
//  2 = Cool muted    #C4BAD9 / #A3C4D9 / #F2EB88
//  3 = Acid 4‑toni   #ADBF1F / #F23207 / #F28907 / #F26D9E
// ══════════════════════════════════════════════════════════════════════
const PALETTE = 4;

// ══════════════════════════════════════════════════════════════════════
//  DEFINIZIONE PALETTE
//  Ogni palette assegna un colore per categoria emotiva:
//    positiva_alta  → entusiasmo, curiosità, gioia, sorpresa
//    positiva_bassa → serenità  (emozione dominante, tono quieto)
//    negativa       → ansia, irritazione, noia, paura, rabbia,
//                     stanchezza, tristezza
//    other          → "other" dal form
// ══════════════════════════════════════════════════════════════════════
const PALETTES = {
  1: {
    // Soft pastel — luminoso ma non saturato
    positiva_alta:  '#F6CBE9',   // rosa chiaro
    positiva_bassa: '#C8F0EC',   // menta (variante del teal, più chiara)
    negativa:       '#91D9D2',   // teal
    other:          '#F2EB88'    // giallo
  },
  2: {
    // Cool muted — più istituzionale, da proiezione
    positiva_alta:  '#C4BAD9',   // lilla
    positiva_bassa: '#D6E8F0',   // azzurro pallidissimo
    negativa:       '#A3C4D9',   // azzurro medio
    other:          '#F2EB88'    // giallo
  },
  3: {
    // Acid 4‑toni — contrasto forte, adatto a proiezione in sala buia
    positiva_alta:  '#ADBF1F',   // verde acido
    positiva_bassa: '#F28907',   // arancio
    negativa:       '#F23207',   // rosso
    other:          '#F26D9E'    // rosa acceso
  },
  4: {
    // Acid 4‑toni — contrasto forte, adatto a proiezione in sala buia
    positiva_alta:  '#2ECC71',   
    positiva_bassa: '#9B59B6',   
    negativa:       '#E74C3C',  
    other:          '#F1C40F'   
  }
};

// MAPPA COLONNE (base 0)
const COL = {
  group:     5,
  word:      15,
  m0:        19,
  submitted: 27,
  // Punteggio 1–5 per la modalità colore "gradiente".
  //   13 = "Quanto sei contento?"  •  14 = "...in controllo..."  •  12 = "livello di energia"
  gradScore: 13
};

const METRICS = [
  ['Affinità con', 'le persone'],
  ['Sicurezza tra', 'sconosciuti'],
  ['Senso di', 'appartenenza'],
  ['Interazone con', 'gli altri']
];

const HOUR_MIN = 7;
const HOUR_MAX = 21;

// ══════════════════════════════════════════════════════════════════════
//  FAMIGLIE EMOTIVE — basate sui dati reali del form
//  Le parole corrispondono ESATTAMENTE ai valori nel CSV (lowercase).
//  Aggiungi eventuali varianti ortografiche se il CSV le contiene.
// ══════════════════════════════════════════════════════════════════════
function buildEmoFamilies(paletteId) {
  const P = PALETTES[paletteId] || PALETTES[1];
  return {
    positiva_alta: {
      color: P.positiva_alta,
      words: [
        'curiosità', 'curiosita',
        'entusiasmo',
        'gioia',
        'sorpresa'
      ]
    },
    positiva_bassa: {
      color: P.positiva_bassa,
      words: [
        'serenità', 'serenita'
      ]
    },
    negativa: {
      color: P.negativa,
      words: [
        'ansia',
        'irritazione',
        'noia',
        'paura',
        'rabbia',
        'stanchezza',
        'tristezza'
      ]
    },
    other: {
      color: P.other,
      words: [
        'other'
      ]
    }
  };
}

const CFG = {
  ratioW: 9,
  ratioH: 16,

  bg: '#000000',

  colLabel:  '#FFFFFF',
  colHeader: '#FFFFFF',
  colMuted:  '#FFFFFF',
  colClock:  '#FFFFFF',
  colFallback: '#5A6370',   // parola non classificata

  scaleMax: 5,

  wordWeight: 400,   // parole nelle barre: non bold

  secPerHour:   4,
  barRows:      5,
  wordRotateHz: 0.33,

  // ── Frame finale "TOTALE" ──
  holdSec:    13,    // durata totale del fermo finale prima di ricominciare
  holdFade:   1.2,   // dissolvenza in ENTRATA dei punteggi laterali (sec)
  holdOut:    1.6,   // rientro + dissolvenza in USCITA dei punteggi (sec)

  // ── Codifica colore delle parole ──
  //   'palette'  → colore per categoria emotiva (famiglie EMO)
  //   'gradient' → gradiente continuo sul punteggio 1–5 di COL.gradScore
  //   'steps'    → 5 colori DISCRETI specifici, uno per punteggio (scoreColors)
  colorMode: 'steps',
  gradDark:  '#3D7BD9',   // punteggio 1 → estremo "scuro/freddo"
  gradLight: '#F1C40F',   // punteggio 5 → estremo "chiaro/caldo"

  // Colori discreti per la modalità 'steps' (indice 0 = punteggio 1 … indice 4 = punteggio 5)
  scoreColors: [
    '#2ECC71',   // 1
    '#1ABC9C',   // 2
    '#3D7BD9',   // 3
    '#9B59B6',   // 4
    '#7607a6'   // 5
  ],

  // Maiuscole/minuscole delle parole nelle barre: 'upper' | 'lower' | 'none'
  wordCase:   'upper',

  // Adattamento parola quando è più larga della barra:
  //   'squeeze'  → la SCHIACCIA orizzontalmente: ALTEZZA FISSA, varia la larghezza (intera)
  //   'shrink'   → RIMPICCIOLISCE il font: proporzioni intatte ma parola più piccola (intera)
  //   'truncate' → ALTEZZA E LARGHEZZA fisse: TRONCA le lettere che non entrano
  // (true = 'squeeze', false = 'shrink' per retrocompatibilità)
  squeezeWords: 'truncate',

  // Limite minimo di adattamento (vale sia per la compressione che per la
  // riduzione del font). Più basso = parole più piccole/strette ammesse.
  minScaleX:  0.28,

  headerLeft:  'VIAGGIATORI OCCASIONALI',
  headerRight: 'VIAGGIATORI ABITUALI',

  // ── Legenda testuale in basso (spiega le codifiche dell'infografica) ──
  legendBar:   'LUNGHEZZA DELLE PAROLE = MEDIA DEL PUNTEGGIO PER QUELLA DOMANDA',
  legendGroup: 'OGNI GRUPPO DI BARRE = UNA DOMANDA SULLA COMUNITÀ',
  legendWords: 'PAROLE = EMOZIONI PROVATE DAI PASSEGGERI',
  // Prefissi della riga "colore"
  legendColorPalette: 'TIPO DI EMOZIONE:',
  legendColorGradient: '',   // seguito da gradLabel + campione 1→5

  // Etichette leggibili delle famiglie emotive (per la legenda colori)
  emoLabels: {
    positiva_alta:  'POSITIVE',
    positiva_bassa: 'SERENITÀ',
    negativa:       'NEGATIVE',
    other:          'ALTRO'
  },
  // Cosa rappresenta il punteggio del gradiente (mostrato in legenda)
  gradLabel: 'QUANTO SEI CONTENT3'
};

// Famiglie costruite una volta sola con la palette scelta
const EMO = buildEmoFamilies(PALETTE);

/* ─────────────────────────────────────────────────── state ── */
let table;
let PHASES = [];
let TOTAL_IDX = -1;     // indice del keyframe finale "TOTALE"
let dataReady = false;

let tStart   = 0;
let paused   = false;
let pausedAt = 0;
let speedMul = 1;
let currentTextSize = 16;
let sourceCodeProRegular, sourceCodeProBold;

/* ─────────────────────────────────────────────────── preload ── */
function preload() {
  sourceCodeProRegular = loadFont('../fonts/SourceCodePro-Regular.ttf');
  sourceCodeProBold = loadFont('../fonts/SourceCodePro-Bold.ttf');
  loadFrameAssets();
  table = loadTable(
    CSV_NAME, 'csv', 'header',
    () => { buildPhases(); dataReady = true; },
    (e) => console.error('CSV non caricato:', e)
  );
}

/* ─────────────────────────────────────────────────── setup ── */
function setup() {
  createCanvas(OUT_W, OUT_H);
  textFont(sourceCodeProRegular);
  // Forza il caricamento di entrambi i pesi prima di disegnare le barre,
  // così il canvas non parte col font di fallback (monospace di sistema).
  if (document.fonts && document.fonts.load) {
    document.fonts.load("400 16px 'Source Code Pro'");
    document.fonts.load("700 16px 'Source Code Pro'");
  }
  tStart = millis();
  frameRate(60);
}

/* ═══════════════════════════════════════ PARSING ═══════════════════ */

function parseHour(s) {
  if (!s) return null;
  s = String(s).trim();
  const parts = s.split(/\s+/);
  const tp = parts.length > 1 ? parts[1] : parts[0];
  const m  = tp.match(/(\d{1,2})[.,:](\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  return h >= 0 && h <= 23 ? h : null;
}

// Frequenza d'uso → gruppo
function groupOf(raw) {
  const v = parseInt(raw, 10);
  if (isNaN(v)) return null;
  if (v <= 2) return 'occasionali';
  if (v >= 3) return 'abituali';
  return null;
}

/* ════════════════════════════ BUILD PHASES ════════════════════════ */

function buildPhases() {
  function emptyM() {
    const o = [];
    for (let i = 0; i < METRICS.length; i++) o.push([]);
    return o;
  }

  const acc = {};
  for (let h = HOUR_MIN; h <= HOUR_MAX; h++) {
    acc[h] = {
      occasionali: { words: [], m: emptyM() },
      abituali:    { words: [], m: emptyM() }
    };
  }

  // Accumulatore globale (tutte le risposte) → keyframe finale "TOTALE"
  const tot = {
    occasionali: { words: [], m: emptyM() },
    abituali:    { words: [], m: emptyM() }
  };

  const rows     = table.getRowCount();
  const totalCols = table.getColumnCount();

  for (let r = 0; r < rows; r++) {
    if (totalCols <= COL.submitted) continue;

    const rawHour = table.getString(r, COL.submitted);
    if (!rawHour) continue;

    const hr = parseHour(rawHour);
    if (hr === null || hr < HOUR_MIN || hr > HOUR_MAX) continue;

    const rawGroup = table.getString(r, COL.group);
    if (!rawGroup) continue;

    const g = groupOf(rawGroup);
    if (!g) continue;

    const cell    = acc[hr][g];
    const totCell = tot[g];

    // Punteggio 1–5 (per la modalità colore "gradiente") di chi ha risposto
    let score = null;
    const rawScore = table.getString(r, COL.gradScore);
    if (rawScore != null) {
      const sv = parseFloat(String(rawScore).replace(',', '.'));
      if (!isNaN(sv)) score = sv;
    }

    const valWord = table.getString(r, COL.word);
    const w = valWord ? String(valWord).trim() : '';
    if (w && w !== '—' &&
        w.toLowerCase() !== 'nan' &&
        w.toLowerCase() !== 'undefined') {
      const item = { w, s: score };       // parola + punteggio associato
      cell.words.push(item);
      totCell.words.push(item);
    }

    for (let mi = 0; mi < METRICS.length; mi++) {
      const vm = table.getString(r, COL.m0 + mi);
      if (vm != null) {
        const v = parseFloat(String(vm).replace(',', '.'));
        if (!isNaN(v)) { cell.m[mi].push(v); totCell.m[mi].push(v); }
      }
    }
  }

  PHASES = [];
  for (let h = HOUR_MIN; h <= HOUR_MAX; h++) {
    const a  = acc[h];
    const nO = a.occasionali.words.length + a.occasionali.m[0].length;
    const nA = a.abituali.words.length    + a.abituali.m[0].length;
    if (nO === 0 && nA === 0) continue;
    PHASES.push({
      hour:        h,
      time:        nf2(h) + ':00',
      occasionali: packGroup(a.occasionali),
      abituali:    packGroup(a.abituali)
    });
  }

  if (!PHASES.length) {
    const emptyMeans = METRICS.map(() => null);
    PHASES.push({
      hour: 0, time: '--:--',
      occasionali: { words: [{ w: '—', s: null }], means: emptyMeans.slice(), n: 0 },
      abituali:    { words: [{ w: '—', s: null }], means: emptyMeans.slice(), n: 0 }
    });
  }

  // Keyframe iniziale: barre a zero, parole già pronte.
  // Evita il salto secco quando il ciclo riparte dalla prima ora.
  const firstPhase = PHASES[0];
  const zeroOccMeans = firstPhase.occasionali.means.map(v => v == null ? null : 0);
  const zeroAbiMeans = firstPhase.abituali.means.map(v => v == null ? null : 0);
  PHASES.unshift({
    hour: firstPhase.hour,
    time: firstPhase.time,
    isIntro: true,
    occasionali: {
      words: firstPhase.occasionali.words.slice(),
      means: zeroOccMeans,
      n: 0
    },
    abituali: {
      words: firstPhase.abituali.words.slice(),
      means: zeroAbiMeans,
      n: 0
    }
  });

  // Keyframe finale: medie sull'INTERO dataset per ciascun gruppo.
  // È l'ultima fase: l'animazione ci arriva dolcemente e poi vi resta ferma.
  const lastHour = PHASES[PHASES.length - 1].hour;
  TOTAL_IDX = PHASES.length;
  PHASES.push({
    hour:        lastHour,
    time:        nf2(lastHour) + ':00',
    isTotal:     true,
    occasionali: packGroup(tot.occasionali),
    abituali:    packGroup(tot.abituali)
  });
}

function packGroup(g) {
  const means = g.m.map(a =>
    a.length ? a.reduce((s, x) => s + x, 0) / a.length : null
  );
  return {
    words: g.words.length ? g.words.slice() : [{ w: '—', s: null }],
    means,
    n: g.words.length
  };
}

function nf2(n) { return n < 10 ? '0' + n : '' + n; }

/* ══════════════════════════════════════ TIMING ════════════════════ */

function computeCanvas() {
  return { w: W, h: H };
}

function windowResized() {
  resizeCanvas(OUT_W, OUT_H);
}

function flowPos() {
  const n = PHASES.length;
  const tSec = ((paused ? pausedAt : millis() - tStart) / 1000) * speedMul;

  // Timeline: (n-1) transizioni da secPerHour + un fermo finale di holdSec.
  const transTime = (n - 1) * CFG.secPerHour;
  const cycle     = transTime + CFG.holdSec;
  const tc        = ((tSec % cycle) + cycle) % cycle;

  let a, b, k, holding, holdAlpha, holdSlide, rotTime;

  if (tc < transTime) {
    // Fase di scorrimento fra le ore (l'ultima transizione punta al TOTALE)
    const p = tc / CFG.secPerHour;
    a = Math.floor(p);
    b = Math.min(a + 1, n - 1);
    k = p - a;
    holding   = false;
    holdAlpha = 0;
    holdSlide = 0;
    rotTime   = tc;                     // rotazione parole legata al ciclo
  } else {
    // Fermo sul keyframe finale: barre = TOTALI, parole congelate
    a = n - 1;
    b = n - 1;
    k = 1;
    holding = true;
    rotTime = transTime;                // congela la rotazione delle parole

    const th = tc - transTime;          // secondi trascorsi dentro il fermo
    if (th < CFG.holdFade) {
      holdAlpha = th / CFG.holdFade;    // entrano i punteggi
      holdSlide = 0;
    } else if (th > CFG.holdSec - CFG.holdOut) {
      // rientro verso il centro + dissolvenza, poco prima del reset
      const ep  = easeInOutCubic(Math.min(1, (th - (CFG.holdSec - CFG.holdOut)) / CFG.holdOut));
      holdAlpha = 1 - ep;
      holdSlide = ep;
    } else {
      holdAlpha = 1;                    // resta fermo e leggibile
      holdSlide = 0;
    }
  }

  const ek = easeInOutCubic(k);
  const fHour = PHASES[a].hour + (PHASES[b].hour - PHASES[a].hour) * k;

  return { a, b, k, ek, fHour, holding, holdAlpha, holdSlide, rotTime };
}

function lerpMean(g, mi, fp) {
  const A = PHASES[fp.a][g].means[mi];
  const B = PHASES[fp.b][g].means[mi];
  if (A == null && B == null) return null;
  if (A == null) return B * fp.ek;
  if (B == null) return A * (1 - fp.ek);
  return A + (B - A) * fp.ek;
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ─────────────────────────────── case parola ── */
function applyWordCase(word) {
  if (CFG.wordCase === 'lower') return word.toLowerCase();
  if (CFG.wordCase === 'upper') return word.toUpperCase();
  return word;   // 'none' → lascia com'è nel CSV
}

/* ─────────────────────────────── colore parola ── */
function emoColor(word) {
  const w = (word || '').toLowerCase().trim();
  for (const key in EMO) {
    if (EMO[key].words.indexOf(w) !== -1) return EMO[key].color;
  }
  // Qualsiasi parola non classificata (es. "amore") → categoria "other" (giallo)
  return EMO.other ? EMO.other.color : CFG.colFallback;
}

// Colore della singola parola secondo la modalità attiva.
//   'palette'  → categoria emotiva
//   'gradient' → gradiente sul punteggio 1–5 di chi ha scritto la parola
function wordColor(item) {
  const s = item ? item.s : null;

  if (CFG.colorMode === 'gradient') {
    if (s == null || isNaN(s)) return CFG.colFallback;   // nessun punteggio
    const t = constrain((s - 1) / (CFG.scaleMax - 1), 0, 1);
    return lerpColor(color(CFG.gradDark), color(CFG.gradLight), t);
  }

  if (CFG.colorMode === 'steps') {
    if (s == null || isNaN(s)) return CFG.colFallback;
    const idx = constrain(Math.round(s), 1, CFG.scaleMax) - 1;
    return CFG.scoreColors[idx] || CFG.colFallback;
  }

  return emoColor(item ? item.w : '');
}

/* ════════════════════════════════ BARRA TESTUALE ════════════════════ */

function drawFlowBar(wordsA, wordsB, anchorX, y, dir, mean, sz, fp, seed) {
  if (mean == null) return;
  const halfMax = flowHalfMax();
  const len     = (mean / CFG.scaleMax) * halfMax;
  if (len <= 1) return;
  const outerX  = anchorX + dir * len;

  const tSec = fp.rotTime;
  const ROWS = CFG.barRows;
  const rowH = sz * 1.12;
  const validA = validWordItems(wordsA);
  const validB = validWordItems(wordsB);

  const pickWord = (rowIdx) => {
    const tick     = Math.floor(tSec * CFG.wordRotateHz + rowIdx * 0.37 + seed * 0.11);
    const mixPhase = ((rowIdx * 0.6 + seed * 0.13 + tick * 0.19) % 1 + 1) % 1;
    let arr        = mixPhase < fp.ek ? validB : validA;
    if (!arr.length) arr = mixPhase < fp.ek ? validA : validB;
    if (!arr.length) return null;
    return arr[(tick + rowIdx + seed) % arr.length];
  };

  for (let i = 0; i < ROWS; i++) {
    const item = pickWord(i);
    const word0 = item && item.w;
    if (!word0 || word0.trim() === '—' || word0.trim() === '-') continue;
    const word  = applyWordCase(word0);
    const col   = wordColor(item);

    const fit = fitWordToBar(word, len, sz);
    if (!fit.text) continue;

    const laneY = (i - (ROWS - 1) / 2) * rowH;
    spacedText(fit.text, outerX, y + laneY, dir, fit.sz, fit.spacing, fit.scaleX, col);
  }
}

function flowGap() {
  return W * 0.035;
}

function flowHalfMax() {
  return W * 0.5 - flowGap();
}

function validWordItems(words) {
  return (words || []).filter(item => {
    const w = item && item.w;
    if (!w) return false;
    const t = String(w).trim();
    return t && t !== '—' && t !== '-';
  });
}

function fitWordToBar(word, target, sz) {
  textSize(sz);
  applyWordStyle(sz);

  const letters = word.split('');
  const widths  = letters.map(ch => textWidth(ch));
  let natural = 0;
  for (const w of widths) natural += w;
  const gaps  = Math.max(1, letters.length - 1);

  if (natural <= target) {
    // C'è spazio in eccesso: dilata solo le parole con più lettere.
    const sp = letters.length > 1 ? (target - natural) / gaps : 0;
    const scaleX = 1;
    return { text: word, spacing: sp, scaleX, sz };
  }

  // Parola più larga dello spazio: adatta secondo la modalità scelta.
  const mode = CFG.squeezeWords;

  if (mode === 'shrink' || mode === false) {
    // rimpicciolisce il font mantenendo le proporzioni (parola intera)
    const factor = Math.max(CFG.minScaleX, target / natural);
    return { text: word, spacing: 0, scaleX: 1, sz: sz * factor };
  }

  if (mode === 'truncate') {
    // Prima di troncare, prova una sigla leggibile fatta di sole consonanti.
    const consonants = consonantWord(word);
    if (consonants && consonants !== word) {
      const consonantFit = fitFixedWordToBar(consonants, target, sz);
      if (consonantFit.text) return consonantFit;
    }
    // altezza E larghezza fisse: tronca le lettere che non entrano
    return fitFixedWordToBar(word, target, sz);
  }

  // default 'squeeze' (true): compressione orizzontale, altezza fissa (parola intera)
  const factor = Math.max(CFG.minScaleX, target / natural);
  return { text: word, spacing: 0, scaleX: factor, sz };
}

function fitFixedWordToBar(word, target, sz) {
  textSize(sz);
  applyWordStyle(sz);

  const letters = word.split('');
  const widths  = letters.map(ch => textWidth(ch));
  const spMin   = -sz * 0.05;

  for (let count = letters.length; count >= 1; count--) {
    if (count === 1) {
      const scaleX = Math.min(1, target / Math.max(1, widths[0]));
      return { text: letters[0], spacing: 0, scaleX, sz };
    }
    let nat = 0;
    for (let i = 0; i < count; i++) nat += widths[i];

    let sp = (target - nat) / (count - 1);
    if (sp >= spMin) {
      sp = Math.max(spMin, sp);
      return { text: letters.slice(0, count).join(''), spacing: sp, scaleX: 1, sz };
    }
  }
  return { text: '', spacing: 0, scaleX: 1, sz };
}

function consonantWord(word) {
  return word
    .split('')
    .filter(ch => {
      const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return !/[AEIOUaeiou]/.test(base) && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(ch);
    })
    .join('');
}

function applyWordStyle(sz) {
  currentTextSize = sz;
  drawingContext.font =
    CFG.wordWeight + ' ' + Math.round(sz) + "px 'Source Code Pro', monospace";
}

function spacedText(str, outerX, y, dir, sz, sp, scaleX, hex) {
  textSize(sz);
  textAlign(LEFT, CENTER);
  applyWordStyle(sz);
  noStroke();

  const g = str.split('');
  const widths = g.map(ch => textWidth(ch));
  let total = 0;                       // larghezza non scalata
  for (let i = 0; i < g.length; i++)
    total += widths[i] + (i < g.length - 1 ? sp : 0);

  const drawn  = total * scaleX;       // larghezza effettiva a schermo
  const startX = dir < 0 ? outerX : outerX - drawn;

  push();
  translate(startX, y);
  scale(scaleX, 1);                    // compressione/espansione orizzontale
  fill(hex);
  let cx = 0;
  for (let i = 0; i < g.length; i++) {
    text(g[i], cx, 0);
    cx += widths[i] + sp;
  }
  pop();
}

/* ════════════════════════════════════ DRAW ════════════════════════ */

function draw() {
  background(0);
  drawTemplateFrame();
  drawSketchScaled(drawContent);
}

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

function drawScaleLabel(v, dir, anchorX, y) {
  const label = String(v);
  const tw = textWidth(label);
  const t = (v - 1) / Math.max(1, CFG.scaleMax - 1);
  const innerX = anchorX + dir * tw / 2;
  const outerX = dir < 0 ? tw / 2 : W - tw / 2;
  text(label, lerp(innerX, outerX, t), y);
}

function drawContent() {
  noStroke();
  fill(CFG.bg);
  rect(0, 0, W, H);

  if (!dataReady) {
    fill(CFG.colLabel);
    textAlign(CENTER, CENTER);
    textSize(W * 0.028);
    text('Carico ' + CSV_NAME + ' …', W / 2, H / 2);
    return;
  }

  const fp = flowPos();
  const cx = W * 0.5;

  // ── Layout verticale ──
  const headerY   = H * 0.05;    // VIAGGIATORI OCCASIONALI / ABITUALI
  const scaleTopY = H * 0.115;   // scala 5..1 1..5 in alto, vicina alle barre
  const scaleBotY = H * 0.885;   // scala 5..1 1..5 in basso, vicina alle barre
  const footerY   = H * 0.972;   // legenda + orologio, vicina al margine inferiore

  const rowsTop = H * 0.135;     // inizio blocchi metriche
  const rowsBot = H * 0.87;      // fine blocchi metriche

  const M       = METRICS.length;
  const rowGap  = (rowsBot - rowsTop) / M;
  const gapC    = flowGap();     // più spazio nella fascia centrale
  const halfMax = flowHalfMax(); // valore 5 allineato ai margini del frame
  const leftAnchor  = cx - gapC;
  const rightAnchor = cx + gapC;

  const headerSz = H * 0.0155;
  const titleSz  = headerSz;            // titoli grandi come i nomi dei gruppi
  const sz       = Math.max(10, titleSz * 0.85);  // parole: leggermente più piccole dei titoli

  // ── Intestazioni ──
  push();
  textAlign(RIGHT, CENTER);
  textStyle(NORMAL);
  textSize(headerSz);
  fill(CFG.colHeader);
  text(CFG.headerLeft, leftAnchor, headerY);
  textAlign(LEFT, CENTER);
  text(CFG.headerRight, rightAnchor, headerY);
  pop();

  // ── Scala 1–5 (in alto e in basso) allineata alle barre ──
  // 1 parte dall'origine delle barre; 5 arriva al margine esterno.
  push();
  textAlign(CENTER, CENTER);
  textSize(H * 0.0125);
  fill(CFG.colMuted);
  for (let v = 1; v <= 5; v++) {
    drawScaleLabel(v, -1, leftAnchor, scaleTopY);
    drawScaleLabel(v, +1, rightAnchor, scaleTopY);
    drawScaleLabel(v, -1, leftAnchor, scaleBotY);
    drawScaleLabel(v, +1, rightAnchor, scaleBotY);
  }
  pop();

  // ── Righe metriche (titolo sopra ogni coppia di barre) ──
  for (let m = 0; m < M; m++) {
    const blockTop = rowsTop + rowGap * m;
    const barY     = blockTop + rowGap * 0.55;
    // titolo subito sopra la fila più alta di parole
    const titleY   = barY - (sz * 1.12) * (CFG.barRows / 2 + 1.35);

    // Nel rientro finale barre e punteggi si ritirano insieme verso il centro
    const shrink = 1 - fp.holdSlide;          // 1 di norma, → 0 prima del reset
    const trueO  = lerpMean('occasionali', m, fp);   // valore reale (per l'etichetta)
    const trueA  = lerpMean('abituali',    m, fp);
    const meanO  = trueO == null ? null : trueO * shrink; // lunghezza barra (si ritira)
    const meanA  = trueA == null ? null : trueA * shrink;

    // Titolo sopra la coppia di barre
    push();
    textAlign(CENTER, CENTER);
    textStyle(NORMAL);
    textSize(titleSz);
    fill(CFG.colHeader);
    text('* ' + METRICS[m].join(' ').toUpperCase() + ' *', cx, titleY);
    pop();

    // Barre testuali
    drawFlowBar(
      PHASES[fp.a].occasionali.words, PHASES[fp.b].occasionali.words,
      leftAnchor, barY, -1, meanO, sz, fp, m * 7 + 1
    );
    drawFlowBar(
      PHASES[fp.a].abituali.words, PHASES[fp.b].abituali.words,
      rightAnchor, barY, +1, meanA, sz, fp, m * 7 + 4
    );

    // Punteggi medi laterali: SEMPRE visibili, agganciati all'estremità delle barre.
    {
      const lenO = meanO == null ? 0 : (meanO / CFG.scaleMax) * halfMax;
      const lenA = meanA == null ? 0 : (meanA / CFG.scaleMax) * halfMax;
      push();
      textStyle(NORMAL);
      textSize(sz * 0.95);
      const labelGap = W * 0.022;
      const labelXO = leftAnchor - lenO - labelGap;
      const labelXA = rightAnchor + lenA + labelGap;
      if (labelXO < 0) {
        drawMeanLabel('occasionali', m, fp, 0, barY, LEFT);
      } else {
        drawMeanLabel('occasionali', m, fp, labelXO, barY, RIGHT);
      }
      if (labelXA > W) {
        drawMeanLabel('abituali', m, fp, W, barY, RIGHT);
      } else {
        drawMeanLabel('abituali', m, fp, labelXA, barY, LEFT);
      }
      pop();
    }
  }

  // ── Orologio corrente ──
  const fh = fp.fHour;
  const hh = Math.floor(fh);
  const mm = Math.floor((fh - hh) * 60);

  // ── Legenda in basso a sinistra + orario in basso a destra ──
  const legSz = H * 0.0122;
  const lineH = legSz * 1.7;
  const legX  = 0;
  const legTop = footerY - lineH * 1.5;
  const legBottomY = drawFooterLegend(legX, legTop, W * 0.70, legSz);

  const clockSz = titleSz;
  push();
  textAlign(RIGHT, BOTTOM);
  textStyle(NORMAL);
  textSize(clockSz);
  fill(CFG.colClock);
  text(nf2(hh) + ':' + nf2(mm), W, legBottomY);
  pop();
}

function drawMeanLabel(groupKey, metricIdx, fp, x, y, alignX) {
  const A = PHASES[fp.a][groupKey].means[metricIdx];
  const B = PHASES[fp.b][groupKey].means[metricIdx];
  textAlign(alignX, CENTER);

  if (A == null && B == null) {
    drawLabelText('—', x, y);
    return;
  }

  if (A == null && B != null) {
    drawLabelText(morphMissingToNumber(B.toFixed(1), fp.ek), x, y);
    return;
  }

  if (A != null && B == null) {
    drawLabelText(morphNumberToMissing(A.toFixed(1), fp.ek), x, y);
    return;
  }

  drawLabelText((A + (B - A) * fp.ek).toFixed(1), x, y);
}

function morphMissingToNumber(target, t) {
  const p = labelStep(t, 6);
  if (p === 0) return '—';
  if (p === 1) return '--';
  if (p === 2) return '*.*';
  if (p === 3) return target[0] + '.*';
  if (p === 4) return target[0] + '.?';
  return target;
}

function morphNumberToMissing(source, t) {
  const p = labelStep(t, 6);
  if (p === 0) return source;
  if (p === 1) return source[0] + '.?';
  if (p === 2) return '?.?';
  if (p === 3) return '*.*';
  if (p === 4) return '--';
  return '—';
}

function labelStep(t, steps) {
  const p = constrain((t - 0.08) / 0.84, 0, 1);
  return Math.min(steps - 1, Math.floor(p * steps));
}

function drawLabelText(str, x, y) {
  fill(CFG.colLabel);
  text(str, x, y);
}

/* ════════════════════════════════ LEGENDA ════════════════════════ */

// Righe della legenda testuale: ogni riga è una frase che spiega una codifica.
// L'ultima riga (colore) si adatta a colorMode e mostra i campioni.
function legendRows() {
  const rows = [];
  rows.push([{ text: CFG.legendWords }]);
  rows.push([{ text: CFG.legendBar }]);
  if (CFG.colorMode === 'gradient') {
    rows.push([
      { text: CFG.legendColorGradient + CFG.gradLabel + '  ' },
      { text: '1' },
      { grad: true },
      { text: '5' }
    ]);
  } else if (CFG.colorMode === 'steps') {
    const r = [{ text: CFG.legendColorGradient + CFG.gradLabel + ':' }, { gap: true }];
    for (let i = 0; i < CFG.scaleMax; i++) {
      r.push({ chip: CFG.scoreColors[i] || CFG.colFallback });
      r.push({ text: String(i + 1), col: CFG.colMuted });
      r.push({ gap: true });
    }
    rows.push(r);
  } else {
    const r = [{ text: CFG.legendColorPalette }, { gap: true }];
    for (const key in EMO) {
      const label = (CFG.emoLabels && CFG.emoLabels[key]) || key.toUpperCase();
      r.push({ chip: EMO[key].color });
      r.push({ text: label, col: EMO[key].color });
      r.push({ gap: true });
    }
    rows.push(r);
  }
  return rows;
}

// Disegna un campione sfumato gradDark → gradLight
function drawGradRect(x, y, w, h) {
  const steps = 24;
  const cA = color(CFG.gradDark);
  const cB = color(CFG.gradLight);
  noStroke();
  rectMode(CORNER);
  for (let i = 0; i < steps; i++) {
    fill(lerpColor(cA, cB, i / (steps - 1)));
    rect(x + (w / steps) * i, y, w / steps + 1, h);
  }
}

// Disegna la legenda: una riga per frase, con a-capo interno se una riga eccede w.
// topY = baseline (centro) della prima riga; le righe successive scendono.
function drawFooterLegend(x, topY, w, sz) {
  push();
  textStyle(NORMAL);
  textAlign(LEFT, CENTER);
  textSize(sz);
  noStroke();

  const rows  = legendRows();
  const lineH = sz * 1.7;
  const chipS = sz * 0.85;
  const gradW = sz * 5;
  const space = sz * 0.5;

  let py = topY;
  for (const row of rows) {
    let px = x;
    const wrap = (need) => { if (px + need > x + w && px > x) { px = x; py += lineH; } };

    for (const tk of row) {
      if (tk.gap) { px += space; continue; }

      if (tk.chip) {
        wrap(chipS + space * 0.5);
        fill(tk.chip);
        rectMode(CORNER);
        rect(px, py - chipS / 2, chipS, chipS);
        px += chipS + space * 0.5;

      } else if (tk.grad) {
        wrap(gradW + space * 0.5);
        drawGradRect(px, py - chipS / 2, gradW, chipS);
        px += gradW + space * 0.5;

      } else if (tk.text != null) {
        const tw = textWidth(tk.text);
        wrap(tw);
        textSize(sz);
        fill(tk.col || CFG.colMuted);
        text(tk.text, px, py);
        px += tw;
      }
    }
    py += lineH;   // riga successiva
  }
  const bottomY = py - lineH + sz / 2;
  pop();
  return bottomY;
}

/* ════════════════════════════════ CONTROLS ════════════════════════ */

function keyPressed() {
  if (key === ' ') {
    if (!paused) { paused = true;  pausedAt = millis() - tStart; }
    else         { paused = false; tStart   = millis() - pausedAt; }
  }
  if (keyCode === UP_ARROW)   speedMul = Math.min(8,    speedMul * 1.5);
  if (keyCode === DOWN_ARROW) speedMul = Math.max(0.15, speedMul / 1.5);
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
}
