/* ============================================================================
   CUPA — "SOFFIONI" (dente di leone)
   Progetto Tracciati 2026 · DATA MAP LAB · Periferica APS
   Stazione Minimetrò di Perugia · formato verticale 9:16

   Autori:
     Giacomo Lazzerini
     Cecilia Boschetti  (studentessa)
     Desiree Martire    (studentessa)

   ----------------------------------------------------------------------------
   COSA FA L'ANIMAZIONE
   ----------------------------------------------------------------------------
   Ogni SOFFIONE (forma ispirata al dente di leone) rappresenta le risposte di
   UN SINGOLO passeggero. Le codifiche dei dati (vedi legenda):
     • ALTEZZA dello stelo  -> ETÀ del viaggiatore (più alto = più anziano)
     • COLORE della figura  -> STATO D'ANIMO della persona: caldo/arancio per
       chi si dichiara felice, azzurro per chi si dichiara triste
       (vedi MOODS / moodFromValue).

   L'animazione segue una cronologia accelerata: i soffioni compaiono in ordine
   di compilazione (colonna "Submitted At"). Il ciclo vitale della forma è
   scandito dal TESTO, in due fasi:
     1) la frase che la persona vorrebbe RICEVERE cresce dalla base e modella la
        struttura a SPIRALE del fiore;
     2) quella spirale scompare al centro e lascia il posto alla frase che la
        persona vorrebbe LASCIARE agli altri passeggeri: questa si sviluppa in
        senso OPPOSTO, sale come uno stelo e si disperde — le lettere si
        STACCANO e volano via nel vento, accogliendo nuove persone.

   ----------------------------------------------------------------------------
   STRUTTURA DEL CICLO (per ogni fiore, vedi updatePhase)
   ----------------------------------------------------------------------------
     1. WRITE1  : la corda di testo (frase RICEVERE) cresce dalla base alla corolla
     2. HOLD1   : tiene la forma piena
     3. VANISH1 : sparisce COMPLETAMENTE dal basso verso il centro
     4. PHASE2  : una NUOVA corda (frase LASCIARE) parte dal centro, si arrotola
                  con chiralità OPPOSTA, poi diventa stelo che sale; man mano le
                  lettere si staccano e volano via come particelle libere
     5. AFTER   : attesa per le particelle ancora in volo
     6. GAP     : breve pausa, poi il fiore passa al dato successivo

   ----------------------------------------------------------------------------
   COME È FATTO (per chi vuole riutilizzarlo)
   ----------------------------------------------------------------------------
   • Dati letti da dati_subset.csv (prepareFlowerData): una riga = un fiore,
     ordinati per data. Ogni fiore ha frase1 (ricevere), frase2 (lasciare),
     mood (colore) e stemFactor (età → altezza stelo).
   • Ci sono pochi "canali" (NUM_FLOWERS) sfasati nel tempo: ognuno scorre i
     suoi dati uno dopo l'altro, così a schermo ci sono sempre più soffioni in
     fasi diverse. computeLoopDuration calcola quando tutti i dati sono passati.
   • Le corde sono catene di punti con una piccola fisica verlet (_physicsRope:
     molle verso il target + vento Perlin + rigidità). Le lettere sono disposte
     lungo la corda per lunghezza d'arco; staccandosi diventano Particle.
   • Nessuna trasparenza: le lettere sono visibili oppure non disegnate.
   • LOOP SEAMLESS: a fine giro una "raffica finale" (T_END_GUST) spazza via le
     ultime particelle così lo schermo torna vuoto come al frame 0.

   Source Code Pro è caricato localmente dalla repository.
   ============================================================================ */

/* ---- editable ---- */
const NUM_FLOWERS = 5;                              // numero minimo di soffioni
const MIN_FORMING_FLOWERS = 4.0;                      // almeno questi soffioni nella fase di formazione
const CSV_FILE = "dati_subset.csv";
const FONT_FAMILY = "Source Code Pro";
const TEXT_SIZE_FACTOR = 1.5;                       // 1.0 = default, aumenta/diminuisci la dimensione del testo
const HEIGHT_SCALE_FACTOR = 1.2;                     // 1.0 = default, aumenta/diminuisci l'altezza dei fiori
const STEM_CURVE_FACTOR = 1.35;                      // 1.0 = quasi dritti, valori più alti = steli più curvi
const STEM_MAX_AGE = 100;                            // eta che produce il gambo piu alto
const GROWTH_ZONE_COUNT = 6;                         // punti equidistanti possibili per la nascita
const LEGEND_COLOR = '#FFFFFF';
const LEGEND_BOTTOM_MARGIN_FACTOR = 0.012;           // margine basso della legenda
const FLOWER_LEGEND_GAP_FACTOR = 0.035;              // distanza tra base dei soffioni e legenda
const CONTENT_OVER_FRAME = true;                     // true = soffioni/lettere possono uscire dall'area interna

const COL_RECEIVE = "Quale parola vorresti RICEVERE da qualcuno in questo momento?";
const COL_LEAVE = "Quale parola vorresti LASCIARE a chi salirà su questo vagone dopo di te?";
const COL_AGE = "Quanti anni hai?";
const COL_SUBMITTED_AT = "Submitted At";
const COL_MOOD = "Stato d'animo";
const COL_RECEIVE_INDEX = 23;
const COL_LEAVE_INDEX = 24;
const COL_AGE_INDEX = 6;
const COL_SUBMITTED_AT_INDEX = 27;
const COL_MOOD_INDEX = 28;

const DEFAULT_RECEIVE = "respiro";
const DEFAULT_LEAVE = "buon viaggio";

const MOODS = [
  { id: 'azure', color: '#1ABC9C', drooping: true  },   // azzurro + corolla pendente
  { id: 'warm',  color: '#E67E22', drooping: false },   // caldo + corolla dritta
];

const ASPECT_W_H = 9 / 16;

/* ---- timeline (secondi) ---- */
const T_WRITE   = 5.5;
const T_HOLD    = 1.4;
const T_VANISH  = 3.5;
const T_AFTER   = 5.0;
const T_GAP     = 0.1;
const T_PHASE2 = 10.0; // durata seconda fase ------------------------------------------------
const T_PHASE2_OVERLAP = 1.0; // la seconda fase inizia mentre finisce la sparizione
const SPAWN_INTERVAL = null; // secondi tra una nascita e la successiva; null = automatico
const CYCLE     = T_WRITE + T_HOLD + T_VANISH + T_PHASE2 + T_AFTER + T_GAP - T_PHASE2_OVERLAP;
// raffica finale: dopo che TUTTI i fiori hanno finito, un'ultima folata spazza
// via verso l'alto le lettere ancora in volo → schermo vuoto (solo legenda) →
// stesso stato del frame 0 = loop seamless. Poi tutto riparte da capo.
const T_END_GUST = 4.0;

/* ---- fisica ---- */
const FRICTION = 0.50;
const GRAVITY  = 0.44;
const TARGET_K = 0.024;
const STIFF    = 0.05;
const ITER     = 6;
/* ---- phase2 motion controls ---- */

// quanto aggressivo è il distacco della spirale
// quando il path entra nella zona-gambo
// 0.02 = lieve, 0.04 = medio, 0.08 = forte
const PHASE2_STEM_DETACH_BOOST = 0.04;
const PHASE2_SPIRAL_TURNS = 1.35;                   // meno giri = spirale più dolce
const PHASE2_SPIRAL_RADIUS = 0.080;                 // raggio della spirale della seconda frase
const PHASE2_TAIL_LENGTH_FACTOR = 1.0;             // sviluppo verticale della coda nella seconda fase

// ritardo prima che la seconda spirale inizi a formarsi
// 0.00 = immediata
// 0.10 = piccolo ritardo
// 0.25 = ritardo evidente
const PHASE2_GROW_START = 0.00;


// quanto tempo impiega la seconda corda a formarsi
// 0.25 = veloce, 0.45 = medio, 0.65 = lento
const PHASE2_GROW_PORTION = 0.30;

// quando iniziano a staccarsi le lettere della seconda frase
// 0.80 = dopo, 0.84 = leggibile, 0.90 = molto tardi
const PHASE2_DETACH_START = 0.20;

// durata del distacco
// 0.10 = deciso, 0.20 = medio, 0.35 = lento
const PHASE2_DETACH_DURATION = 0.20;


// ------------------------------------------------------------
// salita generale della seconda corda
// ------------------------------------------------------------

// salita complessiva della corda
// 0.12 = poca, 0.18 = media, 0.25 = molta
const PHASE2_LIFT = 0.25;

// quando inizia la salita
// 0.00 = subito, 0.10 = dopo poco, 0.25 = più tardi
const PHASE2_LIFT_START = 0.30;

// salita continua extra fino alla fine della phase2
// serve a evitare che la corda salga, si fermi e poi si stacchi
// 0.02 = leggera, 0.04 = media, 0.07 = forte
const PHASE2_CONTINUOUS_LIFT = 0.4;


// ------------------------------------------------------------
// movimento dell'origine della spirale
// ------------------------------------------------------------

// quanto l'origine segue la fase di formazione
// più alto = il centro si muove già mentre la spirale nasce
const PHASE2_ORIGIN_GROW_INFLUENCE = 0.40;

// quanto l'origine segue la fase di distacco
// più alto = il centro continua a volare via mentre le lettere si staccano
const PHASE2_ORIGIN_DETACH_INFLUENCE = 0.60;

// forza verticale dell'origine
// 0.50 = più trattenuta, 0.85 = naturale, 1.10 = molto trascinata
const PHASE2_ORIGIN_LIFT_FORCE = 0.85;

// forza laterale dell'origine
// 0.60 = poco vento laterale, 1.15 = medio, 1.60 = molto vento
const PHASE2_ORIGIN_DRIFT_FORCE = 1.15;


// ------------------------------------------------------------
// deformazione della corda
// ------------------------------------------------------------

// deriva laterale complessiva data dal vento
// 0.02 = sottile, 0.035 = media, 0.06 = evidente
const PHASE2_SWAY = 0.035;

// vibrazione/deformazione locale
// 0.010 = pulita, 0.018 = organica, 0.030 = nervosa
const PHASE2_FLUTTER = 0.018;

// quanto le estremità sono più influenzate del centro
// 1.2 = morbido, 1.8 = medio, 2.5 = punta molto sensibile
const PHASE2_TIP_POWER = 1.8;

// quanto anche il centro viene mosso dalla salita
// 0.30 = centro più stabile, 0.45 = medio, 0.60 = centro molto mobile
const PHASE2_LIFT_CENTER_WEIGHT = 0.45;

// quanto la punta sale più del centro
// 0.40 = differenza leggera, 0.55 = media, 0.75 = forte
const PHASE2_LIFT_TIP_WEIGHT = 0.55;

/* ---- cornice / canvas finale ---- */
const { w: OUT_W, h: OUT_H } = getFrameOutputSize(); // canvas finale
const W = 980, H = 1520;            // spazio nativo = area interna della cornice
                                    // (1080-2*FRAME_MARGIN_X) x (1920-FRAME_MARGIN_TOP-FRAME_MARGIN_BOTTOM)

/* ---- globals ---- */
let fontSizeBase;
let flowers = [];
let responsesTable;
let flowerData = [];
let loopDuration = null;   // secondi: durata totale del loop (giro completo + raffica finale)
let flowersEndT = null;    // istante in cui l'ultimo fiore finisce; dopo parte la raffica
let particleEvac = 0;      // 0→1 durante la raffica finale: forza di evacuazione delle lettere
let prevLoopT = 0;         // per rilevare il wrap (fine loop → ripartenza)
const wind = { x: 0, y: 0 };

/* ---- helpers ---- */
const clamp     = (v, a, b) => Math.max(a, Math.min(b, v));
const smoother01= v => { v = clamp(v, 0, 1); return v*v*v*(v*(v*6-15)+10); };
const cleanText = v => String(v || "").trim().replace(/\s+/g, " ");
const phraseSeparatorForMood = mood => mood && mood.id === "warm" ? " ~ " : " ; ";
const asPhrase  = (v, fallback, mood) => {
  const txt = (cleanText(v) || fallback).replace(/"/g, "'");
  const separator = phraseSeparatorForMood(mood);
  return `"${txt}"${separator}`;
};

function contentBounds() {
  if (!CONTENT_OVER_FRAME) {
    return { left: 0, top: 0, right: W, bottom: H };
  }

  const area = getSketchArea();
  const s = area.w / W;
  const ox = area.x;
  const oy = area.y + (area.h - H * s) / 2;

  return {
    left: -ox / s,
    top: -oy / s,
    right: (width - ox) / s,
    bottom: (height - oy) / s,
  };
}

function parseSubmittedAt(v) {
  const m = cleanText(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[.,:\s](\d{1,2})[.,:\s](\d{1,2})$/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const [, dd, mm, yyyy, hh, min, ss] = m.map(Number);
  return new Date(yyyy, mm - 1, dd, hh, min, ss).getTime();
}

function rowValue(row, columnName, fallbackIndex) {
  const byName = row.get(columnName);
  if (byName !== undefined && byName !== null && byName !== "") return byName;
  if (!Number.isInteger(fallbackIndex)) return byName;

  const byIndex = row.get(fallbackIndex);
  return byIndex !== undefined && byIndex !== null ? byIndex : byName;
}

// Stato d'animo -> mood (colore + verso della corolla). "triste" = azzurro
// pendente, "felice" = caldo dritto; qualunque altro valore ricade su azzurro.
function moodFromValue(v) {
  const mood = cleanText(v).toLowerCase();
  if (mood.includes("trist")) return MOODS.find(m => m.id === "azure");
  if (mood.includes("felic")) return MOODS.find(m => m.id === "warm");
  return MOODS[0];
}

function prepareFlowerData() {
  if (!responsesTable) return;

  const hasUsableWord = v => {
    const txt = cleanText(v);
    return txt.length > 0 && !txt.includes("*");
  };

  const rows = responsesTable.getRows().map((row, originalIndex) => {
    const submittedAt = rowValue(row, COL_SUBMITTED_AT, COL_SUBMITTED_AT_INDEX);
    const age = Number(String(rowValue(row, COL_AGE, COL_AGE_INDEX)).replace(",", "."));
    return {
      originalIndex,
      receive: rowValue(row, COL_RECEIVE, COL_RECEIVE_INDEX),
      leave: rowValue(row, COL_LEAVE, COL_LEAVE_INDEX),
      submittedAt,
      submittedMs: parseSubmittedAt(submittedAt),
      mood: rowValue(row, COL_MOOD, COL_MOOD_INDEX),
      age: Number.isFinite(age) ? age : null,
    };
  }).filter(row => hasUsableWord(row.receive) && hasUsableWord(row.leave));

  rows.sort((a, b) => {
    if (a.submittedMs !== b.submittedMs) return a.submittedMs - b.submittedMs;
    return a.originalIndex - b.originalIndex;
  });

  flowerData = rows.map(row => {
    const mood = moodFromValue(row.mood);

    return {
      phrase1: asPhrase(row.receive, DEFAULT_RECEIVE, mood),
      phrase2: asPhrase(row.leave, DEFAULT_LEAVE, mood),
      mood,
      stemFactor: Number.isFinite(row.age) ? clamp(row.age / STEM_MAX_AGE, 0, 1) : 0.5,
      zoneIndex: 0,
      age: row.age,
      submittedAt: row.submittedAt,
    };
  });
}

/* ==========================================================================
   Particle: una singola LETTERA staccatasi da uno stelo e ora libera nel vento.
   Vive di moto proprio (velocità + vento Perlin + turbolenza) finché non esce
   dall'area; durante la raffica finale (particleEvac) viene spinta fuori schermo.
   ========================================================================== */
class Particle {
  constructor(x, y, vx, vy, ch, rot, col, fs) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.ch = ch; this.rot = rot;
    this.vrot = (Math.random() - 0.5) * 0.06;
    this.col  = col;
    this.fs   = fs;
  }
  update(T) {
    // vento globale + leggera deriva verso l'alto + turbolenza
    this.vx += wind.x * 0.05;
    this.vy += wind.y * 0.035 - 0.012;
    this.vx += (noise(this.x * 0.004,         T * 0.4) - 0.5) * 0.3;
    this.vy += (noise(this.y * 0.004 + 200,   T * 0.4) - 0.5) * 0.22;
    // raffica finale del loop: forte spinta verso l'alto + soffio laterale,
    // per evacuare ogni lettera dallo schermo prima della ripartenza.
    if (particleEvac > 0) {
      this.vy -= particleEvac * 1.6;
      this.vx += particleEvac * (wind.x * 0.4 + (noise(this.x * 0.01 + 7, T) - 0.5) * 1.2);
    }
    this.vx *= 0.99; this.vy *= 0.99;
    this.x  += this.vx; this.y += this.vy;
    this.rot += this.vrot; this.vrot *= 0.985;
  }
  alive() {
    const m = this.fs * 1.5;
    const bounds = contentBounds();
    return this.x > bounds.left - m && this.x < bounds.right + m &&
           this.y > bounds.top - m && this.y < bounds.bottom + m;
  }
  draw() {
    push();
    fill(this.col);
    textSize(this.fs);
    translate(this.x, this.y);
    rotate(this.rot);
    text(this.ch, 0, 0);
    pop();
  }
}

/* ==========================================================================
   Flower: un "canale" che mostra un soffione alla volta. Tiene le due corde
   (rope1 = frase ricevere, rope2 = frase lasciare) come catene di punti, fa
   avanzare le fasi del ciclo (updatePhase), la fisica (physics) e il disegno
   delle lettere lungo le corde + delle particelle staccate (draw). Finito un
   dato, avanza al successivo (advanceData) finché il canale ha dati.
   ========================================================================== */
class Flower {
  constructor(o) {
    this.baseX    = o.x;
    this.baseY    = o.baseY;
    this.scale    = o.scale;
    this.phaseOff = o.phaseOff;
    this.fontSize = fontSizeBase * this.scale;
    this.lastT    = -1;
    this.phase    = "init";
    this.particles = [];          // persistono tra cicli
    this.dataIndex = o.dataIndex || 0;
    this.dataStart = o.dataIndex || 0;   // primo indice di questo canale (per il reset del loop)
    this.dataStep = o.dataStep || NUM_FLOWERS;
    this.active = true;

    this.applyData(this.dataIndex);
    if (this.active) {
      this.buildRope1Target();
      this.buildRope2Target();
      this.init();
    }
  }

  applyData(dataIndex) {
    if (flowerData.length && dataIndex >= flowerData.length) {
      this.active = false;
      this.phase = "gap";
      this.visLo1 = 1; this.visHi1 = 1;
      this.visHi2 = 0;
      this.detachP = 0;
      return;
    }

    const item = flowerData.length
      ? flowerData[dataIndex]
      : {
          phrase1: asPhrase(DEFAULT_RECEIVE, DEFAULT_RECEIVE, MOODS[0]),
          phrase2: asPhrase(DEFAULT_LEAVE, DEFAULT_LEAVE, MOODS[0]),
          mood: MOODS[0],
          stemFactor: 0.5,
          zoneIndex: 0,
        };

    this.active = true;
    this.dataIndex = dataIndex;
    this.dataItem = item;
    this.phrase1 = item.phrase1;
    this.phrase2 = item.phrase2;
    this.stemFactor = item.stemFactor;
    this.mood = item.mood || MOODS[0];
    this.col = color(this.mood.color);
    this.drooping = this.mood.drooping;
    const zoneCount = Math.max(1, GROWTH_ZONE_COUNT);
    const zoneIndex = clamp(item.zoneIndex || 0, 0, zoneCount - 1);
    const zoneW = W / zoneCount;
    this.baseX = zoneW * (zoneIndex + 0.5);
  }

  advanceData() {
    if (!flowerData.length) return;
    this.applyData(this.dataIndex + this.dataStep);
    if (!this.active) return;
    this.buildRope1Target();
    this.buildRope2Target();
  }

  // Riporta il canale al suo primo dato: chiamata su TUTTI i fiori al wrap del
  // loop, così l'intero giro su tutti i dati riparte sincronizzato da capo.
  resetLoop() {
    this.particles = [];     // stato pulito = come al frame 0
    this.lastT = -1;
    this.applyData(this.dataStart);
    if (this.active) {
      this.buildRope1Target();
      this.buildRope2Target();
      this.init();
    } else {
      this.phase = "gap";
      this.visLo1 = 1; this.visHi1 = 1;
      this.visHi2 = 0; this.detachP = 0;
    }
  }
  
    _applyPhase2WindLift(T) {
      const p2   = this.phase2P || 0;
      const lift = this.phase2Lift || 0;

      // vento filtrato per evitare scatti troppo secchi
      this.phase2WindX = lerp(this.phase2WindX || 0, wind.x, 0.06);

      const n = this.rope2Pts.length;

      // progresso della formazione della seconda corda
      const growP = smoother01(
        Math.min(1, p2 / PHASE2_GROW_PORTION)
      );

      // progresso del distacco delle lettere
      const detachMotionP = smoother01(
        clamp(
          (p2 - PHASE2_DETACH_START) / PHASE2_DETACH_DURATION,
          0,
          1
        )
      );

      // movimento dell'origine:
      // una parte avviene mentre la corda si forma,
      // una parte continua mentre le lettere si staccano
      const originLiftP =
        PHASE2_ORIGIN_GROW_INFLUENCE * growP +
        PHASE2_ORIGIN_DETACH_INFLUENCE * detachMotionP;

      // salita dell'origine della spirale
      const originLift =
        H *
        PHASE2_LIFT *
        PHASE2_ORIGIN_LIFT_FORCE *
        originLiftP *
        HEIGHT_SCALE_FACTOR;

      // deriva laterale dell'origine
      const originDriftX =
        this.phase2WindX *
        W *
        PHASE2_SWAY *
        PHASE2_ORIGIN_DRIFT_FORCE *
        originLiftP;

      // salita continua extra:
      // evita che il punto salga, si fermi e poi aspetti il distacco delle parole
      const continuousLift =
        H *
        PHASE2_CONTINUOUS_LIFT *
        p2 *
        HEIGHT_SCALE_FACTOR;

      // micro-oscillazione globale della corda
      const globalFlutterX =
        (noise(this.baseX * 0.01 + 900, T * 0.45 + this.phaseOff) - 0.5) *
        W *
        PHASE2_FLUTTER *
        0.65 *
        originLiftP;

      const globalFlutterY =
        (noise(this.baseX * 0.01 + 1200, T * 0.50 + this.phaseOff) - 0.5) *
        H *
        0.010 *
        originLiftP;

      for (let i = 0; i < n; i++) {
        const p = this.rope2Pts[i];
        const target = this.rope2Targets[i];

        const frac = i / (n - 1); // 0 = origine spirale, 1 = estremità

        // più alto è PHASE2_TIP_POWER,
        // più la punta viene influenzata rispetto al centro
        const tip = Math.pow(frac, PHASE2_TIP_POWER);

        // tutta la corda sale, ma l'estremità sale un po' di più
        const liftWeight =
          PHASE2_LIFT_CENTER_WEIGHT +
          PHASE2_LIFT_TIP_WEIGHT * frac;

        // turbolenza locale
        const gust = noise(
          this.baseX * 0.01 + frac * 2.2 + this.phaseOff * 0.13,
          T * 0.55 + frac * 0.7
        ) - 0.5;

        // deriva laterale progressiva data dal vento
        const driftX =
          this.phase2WindX *
          W *
          PHASE2_SWAY *
          (0.35 + 0.65 * frac) *
          (0.25 + 0.75 * p2);

        // deformazione locale orizzontale
        const flutterX =
          gust *
          W *
          PHASE2_FLUTTER *
          (0.25 + 0.75 * tip) *
          (0.2 + 0.8 * p2);

        // deformazione locale verticale
        const flutterY =
          Math.abs(gust) *
          H *
          0.012 *
          (0.25 + 0.75 * tip) *
          (0.15 + 0.85 * p2);

        p.tx =
          target.x +
          originDriftX +
          globalFlutterX +
          driftX +
          flutterX;

        p.ty =
          target.y -
          originLift -
          lift * liftWeight -
          continuousLift -
          flutterY +
          globalFlutterY;
      }
    }

  /* --- TARGET PATH for rope 1: gambo + spirale verso il centro --- */
  buildRope1Target() {
    const scl = this.scale;
    const bx  = this.baseX, by = this.baseY;
    const stemLen  = H * (0.24 + 0.18 * this.stemFactor) * scl * HEIGHT_SCALE_FACTOR;
    const stemTopY = by - stemLen;
    const Rmax = W * 0.080 * scl;
    const Rmin = W * 0.007 * scl;
    const turns = 3.2 + Math.random() * 0.4;

    const ph  = this.drooping ?  Math.PI / 2 : -Math.PI / 2;
    const fcx = bx;
    const fcy = this.drooping ? (stemTopY + Rmax) : (stemTopY - Rmax);
    this.corollaC = { x: fcx, y: fcy };

    const raw = [];
    const stemSteps = 70;
    const bowAmp  = W * 0.012 * scl * STEM_CURVE_FACTOR * (0.6 + Math.random() * 0.7);
    const bowSide = Math.random() < 0.5 ? 1 : -1;
    const bowWave = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i <= stemSteps; i++) {
      const t   = i / stemSteps;
      const bow =
        Math.sin(t * Math.PI) * bowAmp * bowSide +
        Math.sin(t * Math.PI * 2) * bowAmp * 0.25 * bowWave;
      raw.push({ x: bx + bow, y: by - stemLen * t });
    }
    const spSteps = 700;
    for (let i = 1; i <= spSteps; i++) {
      const k  = i / spSteps;
      const th = k * turns * 2 * Math.PI;
      const r  = Rmax * (1 - k) + Rmin * k;
      const a  = th + ph;
      raw.push({ x: fcx + r * Math.cos(a), y: fcy - r * Math.sin(a) });
    }

    const rs = this._resample(raw);
    this.rope1Targets   = rs.points;
    this.rope1SegLen    = rs.segLen;
    this.rope1TotalLen  = rs.totalLen;
    this.rope1TargetCum = rs.cum;
  }

  /* --- TARGET PATH for rope 2: spirale OPPOSTA verso l'esterno + gambo che sale --- */
  buildRope2Target() {
      const scl = this.scale;
      const C   = this.corollaC;
      const Rmax2    = W * PHASE2_SPIRAL_RADIUS * scl;
      const turns2   = PHASE2_SPIRAL_TURNS;
      const stemLen2 = H * (0.22 + 0.14 * this.stemFactor) * scl * HEIGHT_SCALE_FACTOR * PHASE2_TAIL_LENGTH_FACTOR;

      const raw = [];
      const spSteps = 600;
      for (let i = 0; i <= spSteps; i++) {
        const s = i / spSteps;
        const r = Rmax2 * s;
        const a = Math.PI / 2 - s * turns2 * 2 * Math.PI;
        raw.push({ x: C.x + r * Math.cos(a), y: C.y - r * Math.sin(a) });
      }

      // lunghezza della sola spirale (prima di aggiungere il gambo)
      let spiralLen = 0;
      for (let i = 1; i < raw.length; i++) {
        spiralLen += Math.hypot(raw[i].x - raw[i-1].x, raw[i].y - raw[i-1].y);
      }

      const P0 = { x: C.x, y: C.y - Rmax2 };
      const P3 = { x: C.x, y: C.y - Rmax2 - stemLen2 };
      const ctrl = stemLen2 * 0.4;
      const stemCurveX = W * 0.016 * scl * STEM_CURVE_FACTOR * (Math.random() < 0.5 ? 1 : -1);
      const tDx = 4 * Math.PI * Rmax2, tDy = -Rmax2;
      const tM  = Math.hypot(tDx, tDy);
      const P1  = { x: P0.x + (tDx / tM) * ctrl, y: P0.y + (tDy / tM) * ctrl };
      const P2  = { x: P3.x + stemCurveX, y: P3.y + ctrl };

      const stSteps = 220;
      for (let i = 1; i <= stSteps; i++) {
        const t = i / stSteps, u = 1 - t;
        const x = u*u*u*P0.x + 3*u*u*t*P1.x + 3*u*t*t*P2.x + t*t*t*P3.x;
        const y = u*u*u*P0.y + 3*u*u*t*P1.y + 3*u*t*t*P2.y + t*t*t*P3.y;
        raw.push({ x, y });
      }

      // lunghezza totale del path raw (spirale + gambo)
      let totalRawLen = 0;
      for (let i = 1; i < raw.length; i++) {
        totalRawLen += Math.hypot(raw[i].x - raw[i-1].x, raw[i].y - raw[i-1].y);
      }

      const rs = this._resample(raw);
      this.rope2Targets   = rs.points;
      this.rope2SegLen    = rs.segLen;
      this.rope2TotalLen  = rs.totalLen;
      this.rope2TargetCum = rs.cum;

      // frazione del path occupata dalla spirale.
      // tutte le lettere con arcFrac > rope2SpiralEndFrac
      // appartengono al gambo e devono staccarsi subito.
      this.rope2SpiralEndFrac = totalRawLen > 0 ? spiralLen / totalRawLen : 1.0;
    }

  _resample(raw) {
      if (!raw || raw.length < 2) {
        return {
          points: raw || [],
          segLen: 1,
          totalLen: 0,
          cum: [0]
        };
      }

      const cumIn = [0];

      for (let i = 1; i < raw.length; i++) {
        cumIn.push(
          cumIn[i - 1] +
          Math.hypot(
            raw[i].x - raw[i - 1].x,
            raw[i].y - raw[i - 1].y
          )
        );
      }

      const L = cumIn[cumIn.length - 1];

      if (!isFinite(L) || L <= 0) {
        return {
          points: raw.map(p => ({ x: p.x, y: p.y })),
          segLen: 1,
          totalLen: 0,
          cum: raw.map((_, i) => i)
        };
      }

      const step = W * 0.015;
      const N = Math.max(60, Math.round(L / step));
      const segLen = L / N;

      const out = [];
      let j = 0;

      for (let k = 0; k <= N; k++) {
        const d = Math.min(k * segLen, L);

        while (j < cumIn.length - 2 && cumIn[j + 1] < d) {
          j++;
        }

        const a = raw[j];
        const b = raw[j + 1];

        if (!a || !b) {
          const last = raw[raw.length - 1];
          out.push({ x: last.x, y: last.y });
          continue;
        }

        const dseg = cumIn[j + 1] - cumIn[j] || 1e-6;
        const t = clamp((d - cumIn[j]) / dseg, 0, 1);

        out.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t
        });
      }

      const cumOut = [0];
      for (let i = 1; i < out.length; i++) {
        cumOut.push(i * segLen);
      }

      return {
        points: out,
        segLen,
        totalLen: N * segLen,
        cum: cumOut
      };
    }

  init() {
    this.rope1Pts = this.rope1Targets.map((p, i) => ({
      x: p.x,
      y: p.y,
      ox: p.x,
      oy: p.y,
      tx: p.x,
      ty: p.y,
      pinned: i === 0
    }));

    this.rope2Pts = this.rope2Targets.map((p, i) => ({
      x: p.x,
      y: p.y,
      ox: p.x,
      oy: p.y,
      tx: p.x,
      ty: p.y,

      // IMPORTANTISSIMO:
      // la seconda corda non deve essere ancorata al centro.
      // Anche il punto di origine deve poter volare via.
      pinned: false
    }));
    this.visLo1 = 0; this.visHi1 = 0;
    this.visHi2 = 0;
    this.detachP = 0;
    this.phase2Lift = 0;
    this.phase2P = 0;
    this.phase2WindX = 0;
    this.detached = new Set();
    this._afterSwept = false;
    // particelle NON resettate: continuano la loro vita libera
  }

  updatePhase(T) {
    if (!this.active) {
      this.phase = "gap";
      this.visLo1 = 1; this.visHi1 = 1;
      this.visHi2 = 0;
      this.detachP = 0;
      return;
    }

    if (T < this.phaseOff) {
      this.phase = "gap";
      this.visLo1 = 1; this.visHi1 = 1;
      this.visHi2 = 0;
      this.detachP = 0;
      return;
    }

    const t = ((T - this.phaseOff) % CYCLE + CYCLE) % CYCLE;
    if (t < this.lastT) {
      this.advanceData();
      if (!this.active) return;
      this.init();
    }
    this.lastT = t;

    const T1 = T_WRITE, T2 = T1 + T_HOLD, T3 = T2 + T_VANISH;
    const phase2Start = T3 - T_PHASE2_OVERLAP;
    const phase2End = phase2Start + T_PHASE2;
    const T5 = phase2End + T_AFTER;

    const applyPhase2Progress = p2 => {
      p2 = clamp(p2, 0, 1);
      this.phase2P = p2;

      const growP = clamp(
        (p2 - PHASE2_GROW_START) / PHASE2_GROW_PORTION,
        0,
        1
      );

      this.visHi2 = smoother01(growP);

      const liftP = smoother01((p2 - PHASE2_LIFT_START) / (1.0 - PHASE2_LIFT_START));
      this.phase2Lift = H * PHASE2_LIFT * liftP * HEIGHT_SCALE_FACTOR;

      this.detachP = Math.max(
        0,
        (p2 - PHASE2_DETACH_START) / PHASE2_DETACH_DURATION
      );
    };

    if (t < T1) {
      this.phase = "write1";
      this.visLo1 = 0;
      this.visHi1 = smoother01(t / T_WRITE);
      this.visHi2 = 0;
      this.phase2P = 0;
      this.detachP = 0;
    } else if (t < T2) {
      this.phase = "hold1";
      this.visLo1 = 0; this.visHi1 = 1;
      this.visHi2 = 0;
      this.phase2P = 0;
      this.detachP = 0;
    } else if (t < T3) {
      this.phase = "vanish1";
      const p = (t - T2) / T_VANISH;
      this.visLo1 = smoother01(p);                 // 0 → 1 sparizione completa
      this.visHi1 = 1;
      if (t >= phase2Start) {
        applyPhase2Progress((t - phase2Start) / T_PHASE2);
      } else {
        this.visHi2 = 0;
        this.phase2P = 0;
        this.detachP = 0;
      }
    } else if (t < phase2End) {
      this.phase = "phase2";
      this.visLo1 = 1; this.visHi1 = 1;            // rope1 sparita

      applyPhase2Progress((t - phase2Start) / T_PHASE2);
    } else if (t < T5) {
      this.phase = "after";
      this.visLo1 = 1; this.visHi1 = 1;
      if (!this._afterSwept) {
        this._afterDetachRemaining();
        this._afterSwept = true;
      }
      this.visHi2 = 0;
      this.detachP = 0;
    } else {
      this.phase = "gap";
    }
  }

  physics(T) {
    // rope 1 attivo solo se almeno parzialmente visibile
    if (this.phase === "write1" || this.phase === "hold1" || this.phase === "vanish1") {
      this._physicsRope(this.rope1Pts, this.rope1SegLen, T, true);
    }
    // rope 2 attivo durante phase2 e durante il breve overlap con vanish1
    if (this.visHi2 > 0.001) {
      this._applyPhase2WindLift(T);
      this._physicsRope(this.rope2Pts, this.rope2SegLen, T, false);
      this._updateDetachment(T);
    }
    // particelle sempre aggiornate
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(T);
      if (!this.particles[i].alive()) this.particles.splice(i, 1);
    }
  }

  _physicsRope(pts, segLen, T, clamp) {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i]; if (p.pinned) continue;
      const frac = i / (n - 1);
      let vx = (p.x - p.ox) * FRICTION;
      let vy = (p.y - p.oy) * FRICTION;
      p.ox = p.x; p.oy = p.y;
      let ax = (p.tx - p.x) * TARGET_K;
      let ay = (p.ty - p.y) * TARGET_K;
      ay += GRAVITY * 0.4;
      // vento (più forte sui punti in alto)
      ax += wind.x * frac * 0.55;
      ay += wind.y * frac * 0.55;
      // turbolenza locale → caos controllato
      ax += (noise(i * 0.05 + 31,  T * 0.4) - 0.5) * 0.45;
      ay += (noise(i * 0.05 + 137, T * 0.4) - 0.5) * 0.30;
      p.x += vx + ax;
      p.y += vy + ay;
    }
    for (let k = 0; k < ITER; k++) {
      for (let i = 0; i < n - 1; i++) {
        const a = pts[i], b = pts[i+1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const diff = (d - segLen) / d * 0.5;
        const mx = dx * diff, my = dy * diff;
        if (!a.pinned) { a.x += mx; a.y += my; }
        if (!b.pinned) { b.x -= mx; b.y -= my; }
      }
      for (let i = 1; i < n - 1; i++) {
        const p = pts[i]; if (p.pinned) continue;
        const a = pts[i-1], b = pts[i+1];
        p.x += ((a.x + b.x) * 0.5 - p.x) * STIFF;
        p.y += ((a.y + b.y) * 0.5 - p.y) * STIFF;
      }
      if (clamp) {
        const bounds = contentBounds();
        for (let i = 1; i < n; i++) {
          const p = pts[i];
          if (p.x < bounds.left) p.x = bounds.left; if (p.x > bounds.right) p.x = bounds.right;
          if (p.y < bounds.top) p.y = bounds.top; if (p.y > bounds.bottom) p.y = bounds.bottom;
        }
      }
    }
  }

  _charWidth() {
    push(); textSize(this.fontSize);
    const cw = textWidth("M") * 1.04;
    pop();
    return cw;
  }

    _updateDetachment(T) {
      const cw = this._charWidth();
      const L  = this.rope2TotalLen;
      const nChars = Math.floor(L / cw);
      const windStr = Math.abs(wind.x) + Math.abs(wind.y) * 0.5;
      const spiralEnd = this.rope2SpiralEndFrac || 1.0;

      // appena visHi2 supera la spirale, "comincerebbe" a formarsi il gambo:
      // intensifichiamo il distacco anche sulle lettere della spirale.
      const stemTriggered = this.visHi2 > spiralEnd;
      const stemBoost = stemTriggered
        ? smoother01((this.visHi2 - spiralEnd) / Math.max(0.001, 1 - spiralEnd)) * smoother01(this.detachP)
        : 0;

      for (let i = 0; i < nChars; i++) {
        if (this.detached.has(i)) continue;
        const dT = i * cw + cw * 0.5;
        const arcFrac = dT / L;
        if (arcFrac > this.visHi2) continue;

        const detachStrength = smoother01(this.detachP);
        if (detachStrength <= 0) continue;

        // lettere oltre la spirale = zona gambo, ma solo dopo il tempo di lettura
        if (arcFrac > spiralEnd) {
          const stemDetachProb = detachStrength * (0.32 + windStr * 0.04);
          if (Math.random() < stemDetachProb) this._detachAt(i, cw, L);
          continue;
        }

        // lettere della spirale: probabilità base + boost quando il gambo "parte"
        const heightFactor = arcFrac * arcFrac;
        const baseProb = (0.025 + windStr * 0.01) * detachStrength * heightFactor;
        const boostedProb = baseProb + stemBoost * PHASE2_STEM_DETACH_BOOST * 2.0 * (0.3 + 0.7 * heightFactor);
        if (Math.random() < boostedProb) this._detachAt(i, cw, L);
      }
    }
  _afterDetachRemaining() {
    const cw = this._charWidth();
    const L  = this.rope2TotalLen;
    const nChars = Math.floor(L / cw);
    for (let i = 0; i < nChars; i++) {
      if (this.detached.has(i)) continue;
      const dT = i * cw + cw * 0.5;
      const arcFrac = dT / L;
      if (arcFrac > this.visHi2) { this.detached.add(i); continue; }
      this._detachAt(i, cw, L);
    }
  }

  _detachAt(i, cw, L) {
    if (this.detached.has(i)) return;
    const ch = this.phrase2[i % this.phrase2.length];
    if (ch === ' ') { this.detached.add(i); return; }

    // posizione: usa TARGET cum per trovare segmento+t, poi interpola sulle posizioni CORRENTI
    const dT  = i * cw + cw * 0.5;
    const pts = this.rope2Pts;
    const cum = this.rope2TargetCum;
    let seg = 1;
    while (seg < cum.length - 1 && cum[seg] < dT) seg++;
    const sl = (cum[seg] - cum[seg-1]) || 1e-6;
    const tt = (dT - cum[seg-1]) / sl;
    const pa = pts[seg-1], pb = pts[seg];
    const x = pa.x + (pb.x - pa.x) * tt;
    const y = pa.y + (pb.y - pa.y) * tt;
    const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);

    // velocità iniziale: eredita velocità della corda + impulso del vento + spinta verso l'alto
    const dvx = ((pa.x - pa.ox) + (pb.x - pb.ox)) * 0.5;
    const dvy = ((pa.y - pa.oy) + (pb.y - pb.oy)) * 0.5;
    const vx = dvx * 1.0 + wind.x * 1.6 + (Math.random() - 0.5) * 1.2;
    const vy = dvy * 1.0 + wind.y * 1.1 - (0.4 + Math.random() * 1.0);

    this.particles.push(new Particle(x, y, vx, vy, ch, ang, this.col, this.fontSize));
    this.detached.add(i);
  }

  draw() {
    // rope 1
    if (this.visHi1 > this.visLo1 + 0.001) {
      this._drawRope(this.rope1Pts, this.rope1TargetCum, this.rope1TotalLen,
                     this.phrase1, this.visLo1, this.visHi1, null);
    }
    // rope 2
    if (this.visHi2 > 0.001) {
      this._drawRope(this.rope2Pts, this.rope2TargetCum, this.rope2TotalLen,
                     this.phrase2, 0, this.visHi2, this.detached);
    }
    // particelle
    for (const p of this.particles) p.draw();
  }

  _drawRope(pts, targetCum, targetLen, phrase, visLo, visHi, skipSet) {
    const n = pts.length;
    textSize(this.fontSize);
    fill(this.col);
    const cw = textWidth("M") * 1.04;
    const nChars = Math.floor(targetLen / cw);
    const margin = this.fontSize * 1.5;

    for (let i = 0; i < nChars; i++) {
      if (skipSet && skipSet.has(i)) continue;
      const dT      = i * cw + cw * 0.5;
      const arcFrac = dT / targetLen;
      // cutoff netto, niente alpha
      if (arcFrac < visLo || arcFrac > visHi) continue;

      let seg = 1;
      while (seg < n - 1 && targetCum[seg] < dT) seg++;
      const sl = (targetCum[seg] - targetCum[seg-1]) || 1e-6;
      const tt = (dT - targetCum[seg-1]) / sl;
      const pa = pts[seg-1], pb = pts[seg];
      const x = pa.x + (pb.x - pa.x) * tt;
      const y = pa.y + (pb.y - pa.y) * tt;

      // clipping ai bordi dell'area attiva, senza alpha
      const bounds = contentBounds();
      if (x < bounds.left - margin || x > bounds.right + margin ||
          y < bounds.top - margin || y > bounds.bottom + margin) continue;

      const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
      const ch = phrase[i % phrase.length];
      if (ch === ' ') continue;

      push();
      translate(x, y);
      rotate(ang);
      text(ch, 0, 0);
      pop();
    }
  }
}
/* ========================================================================== */

function assignGrowthZones(flowerCount) {
  if (!flowerData.length) return;

  const laneCount = Math.max(1, GROWTH_ZONE_COUNT);
  const activeDuration = T_WRITE + T_HOLD + T_VANISH - T_PHASE2_OVERLAP + T_PHASE2;
  const laneFreeAt = Array(laneCount).fill(0);
  const previousZoneByChannel = Array(flowerCount).fill(-1);
  let previousZone = -1;

  for (let i = 0; i < flowerData.length; i++) {
    const channel = i % flowerCount;
    const cycleIndex = Math.floor(i / flowerCount);
    const startTime = cycleIndex * CYCLE + (channel / flowerCount) * CYCLE;
    let available = [];

    for (let z = 0; z < laneCount; z++) {
      if (laneFreeAt[z] <= startTime + 1e-6) available.push(z);
    }

    if (available.length > 1) {
      available = available.filter(z => z !== previousZone && z !== previousZoneByChannel[channel]);
      if (!available.length) {
        for (let z = 0; z < laneCount; z++) {
          if (laneFreeAt[z] <= startTime + 1e-6) available.push(z);
        }
      }
    }

    const zoneIndex = available.length
      ? available[Math.floor(Math.random() * available.length)]
      : laneFreeAt.indexOf(Math.min(...laneFreeAt));

    flowerData[i].zoneIndex = zoneIndex;
    laneFreeAt[zoneIndex] = startTime + activeDuration;
    previousZoneByChannel[channel] = zoneIndex;
    previousZone = zoneIndex;
  }
}

function legendMetrics() {
  const fs = Math.max(8, W * 0.018);
  const lineH = fs * 1.38;
  const blockH = lineH * 4 + fs;
  const top = H - H * LEGEND_BOTTOM_MARGIN_FACTOR - blockH;
  return { top, fs, lineH };
}

function buildFlowers() {
  flowers = [];
  const legendTop = legendMetrics().top;
  const baseY = legendTop - H * FLOWER_LEGEND_GAP_FACTOR;
  const neededCount = Math.max(NUM_FLOWERS, Math.ceil(CYCLE / (T_WRITE / MIN_FORMING_FLOWERS)));
  const activeDuration = T_WRITE + T_HOLD + T_VANISH - T_PHASE2_OVERLAP + T_PHASE2;
  const maxSafeCount = Math.max(1, Math.floor((CYCLE * GROWTH_ZONE_COUNT) / activeDuration));
  const safeNeededCount = Math.min(neededCount, maxSafeCount);
  const flowerCount = flowerData.length ? Math.min(safeNeededCount, flowerData.length) : safeNeededCount;
  assignGrowthZones(flowerCount);
  for (let i = 0; i < flowerCount; i++) {
    const x        = W * (i + 0.5) / flowerCount + (Math.random() - 0.5) * W * 0.025;
    const scale    = 0.72 + Math.random() * 0.18;
    const phaseOff = Number.isFinite(SPAWN_INTERVAL) ? i * SPAWN_INTERVAL : (i / flowerCount) * CYCLE;
    flowers.push(new Flower({ x, baseY, scale, phaseOff, dataIndex: i, dataStep: flowerCount }));
  }
  computeLoopDuration();
}

// Durata del giro che mostra TUTTI i dati una volta: il massimo, su tutti i
// canali, dell'istante in cui il canale conclude (incl. AFTER+GAP) il suo
// ultimo dato. È qui che il loop finisce e tutto riparte da capo.
function computeLoopDuration() {
  let maxEnd = CYCLE;
  for (const f of flowers) {
    // quanti dati gestisce questo canale: dataStart, dataStart+step, ...
    let count;
    if (flowerData.length) {
      count = f.dataStart < flowerData.length
        ? Math.floor((flowerData.length - 1 - f.dataStart) / f.dataStep) + 1
        : 0;
    } else {
      count = 1;   // nessun CSV: un fiore di default che cicla all'infinito
    }
    if (count <= 0) continue;
    const end = f.phaseOff + count * CYCLE;   // inizio + N cicli (l'ultimo incl. after/gap)
    if (end > maxEnd) maxEnd = end;
  }
  flowersEndT  = maxEnd;                 // qui l'ultimo fiore ha finito
  loopDuration = maxEnd + T_END_GUST;    // + raffica che svuota lo schermo prima del wrap
}

function drawLegend() {
  const x = 0;   // ancorata al margine sinistro della cornice (native x=0)
  const { top, fs, lineH } = legendMetrics();
  const swatch = fs * 0.72;
  const sadMood = MOODS.find(m => m.id === 'azure') || MOODS[0];
  const happyMood = MOODS.find(m => m.id === 'warm') || MOODS[1];

  push();
  textFont(sourceCodeProRegular);
  textAlign(LEFT, TOP);
  textSize(fs);
  noStroke();
  fill(LEGEND_COLOR);

  text("ALTEZZA = ETÀ DEL VIAGGIATORE", x, top);

  const colorY = top + lineH;
  const colorLabelW = 0;
  fill(sadMood.color);
  rect(x + colorLabelW, colorY + fs * 0.18, swatch, swatch);
  fill(LEGEND_COLOR);
  text("EMOZIONI NEGATIVE", x + colorLabelW + swatch + fs * 0.35, colorY);
  const happyX = x + colorLabelW + swatch + textWidth("EMOZIONI NEGATIVE") + fs * 1.25;
  fill(happyMood.color);
  rect(happyX, colorY + fs * 0.18, swatch, swatch);
  fill(LEGEND_COLOR);
  text("EMOZIONI POSITIVE", happyX + swatch + fs * 0.35, colorY);
  text("LE PAROLE CHE CREANO LA FORMA SONO QUELLE CHE IL VIAGGIATORE VORREBBE RICEVERE", x, top + lineH * 3);
  text("LE PAROLE CHE VOLANO VIA SONO QUELLE CHE IL VIAGGIATORE VORREBBE LASCIARE AGLI ALTRI", x, top + lineH * 4);
  pop();
}

let sourceCodeProRegular, sourceCodeProBold;

function preload() {
  sourceCodeProRegular = loadFont("../fonts/SourceCodePro-Regular.ttf");
  sourceCodeProBold = loadFont("../fonts/SourceCodePro-Bold.ttf");
  responsesTable = loadTable(CSV_FILE, "csv", "header");
  loadFrameAssets();
}

function setup() {
  pixelDensity(1);
  createCanvas(OUT_W, OUT_H);
  fontSizeBase = W * 0.022 * TEXT_SIZE_FACTOR;

  document.body.style.background = '#000';
  document.body.style.display    = 'flex';
  document.body.style.alignItems = 'center';
  document.body.style.justifyContent = 'center';
  document.body.style.height     = '100vh';
  document.body.style.margin     = '0';
  document.body.style.overflow   = 'hidden';

  textAlign(CENTER, CENTER);
  textFont(sourceCodeProRegular);
  noStroke();
  noiseDetail(2, 0.5);

  prepareFlowerData();
  buildFlowers();

  // Durata del loop completo (tutti i dati una volta): passala a --dur in export.
  console.log(`[soffioni] loop = ${loopDuration.toFixed(2)}s ` +
              `(fiori fino a ${flowersEndT.toFixed(2)}s + raffica ${T_END_GUST}s) · ` +
              `${flowerData.length} dati su ${flowers.length} canali · usa --dur ${loopDuration.toFixed(1)}`);
}

function draw() {
  background(0);
  drawSketchScaled(drawContent);
  drawTemplateFrame();
}

function drawSketchScaled(render) {
  push();
  const area = CONTENT_OVER_FRAME ? getSketchArea() : applySketchClip();
  const s = area.w / W;
  translate(area.x, area.y + (area.h - H * s) / 2);
  scale(s);
  render();
  if (!CONTENT_OVER_FRAME) removeSketchClip();
  pop();
}

function drawContent() {
  // tempo avvolto sulla durata del giro completo: quando supera loopDuration
  // ricomincia da 0 e tutti i fiori vengono resettati → loop su TUTTI i dati.
  const Tabs = millis() * 0.001;
  const T = loopDuration ? (Tabs % loopDuration) : Tabs;
  if (T < prevLoopT) {
    for (const f of flowers) f.resetLoop();
  }
  prevLoopT = T;

  // raffica finale: dopo flowersEndT cresce la forza che spazza via le lettere
  // ancora in volo, così a fine loop lo schermo è vuoto (= frame 0) → seamless.
  particleEvac = flowersEndT && T > flowersEndT
    ? smoother01(clamp((T - flowersEndT) / (T_END_GUST * 0.45), 0, 1))
    : 0;

  // vento globale variabile (Perlin a due ottave)
  const wt = T * 0.18;
  wind.x = (noise(wt, 0) - 0.5) * 1.8 + (noise(wt * 2.3, 100) - 0.5) * 1.0;
  wind.y = (noise(wt * 0.9, 200) - 0.5) * 0.4;

  for (const f of flowers) {
    f.updatePhase(T);
    f.physics(T);
    f.draw();
  }

  drawLegend();
}
