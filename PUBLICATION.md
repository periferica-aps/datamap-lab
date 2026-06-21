# DataMap

### Storie in transito

### Stories in transit

**Periferica APS** · in collaborazione con / in collaboration with **MiniMetrò Perugia** · **Progetto Tracciati 2026** · **Università degli Studi di Perugia — Corso di Design**

Laboratorio di information design e data analysis · Perugia, 2026
Information design and data analysis lab · Perugia, 2026

> **Come citare / Cite as**
> Periferica APS (2026). *DataMap: Storie in transito*. Progetto Tracciati 2026, Perugia. Visualizzazioni generative in p5.js. https://p5js.org

---

## Abstract

**IT** — *DataMap* esplora il dato come materia viva, capace di raccontare storie e generare immaginari. Attraverso un questionario diffuso per un mese nei vagoni del MiniMetrò di Perugia, il progetto raccoglie i dati sensibili di chi attraversa quotidianamente la città, le emozioni, le percezioni, le parole, e li mette in relazione con dati oggettivi sul movimento urbano. Da questo incontro nascono sei visualizzazioni generative, una per ciascuna stazione della linea, realizzate in p5.js e proiettate negli spazi che raccontano. Il risultato è un atlante di *storie in transito*: la città e chi la attraversa, raccontate attraverso i dati. Nessuna immagine è pre-renderizzata, ogni fotogramma è disegnato dal codice a partire dai dati grezzi.

**EN** — *DataMap* treats data as living matter, able to tell stories and shape imaginaries. Through a questionnaire distributed for one month inside the carriages of the Perugia MiniMetrò, the project gathers the affective data of the city's daily commuters, emotions, perceptions, words, and relates it to objective data about urban movement. From this encounter come six generative visualizations, one for each station of the line, built in p5.js and projected within the very spaces they describe. The result is an atlas of *stories in transit*: the city and those who cross it, told through data. No image is pre-rendered; every frame is drawn by code from the raw data.

**Keywords** — information design · data visualization · marks & attributes · data humanism · generative art · creative coding · typography as mark · text visualization · affective data · affect grid · urban mobility · p5.js · site-specific installation

---

## 1. Introduzione / Introduction

**IT** — Il laboratorio nasce da una domanda condivisa: *qual è la storia di questi spazi e di chi vi transita quotidianamente?* Le stazioni del MiniMetrò non sono semplici nodi di trasporto, ma soglie attraversate ogni giorno da persone con uno stato d'animo, una direzione, un'attesa. DataMap prova a rendere visibile questa dimensione affettiva, facendola dialogare con una lettura analitica del movimento in città.

**EN** — The lab stems from a shared question: *what is the story of these spaces and of those who pass through them every day?* MiniMetrò stations are not mere transport nodes but thresholds crossed daily by people carrying a mood, a direction, an expectation. DataMap makes this affective dimension visible, letting it converse with an analytical reading of movement across the city.

---

## 2. Quadro teorico / Theoretical framework

**IT** — Il progetto adotta l'approccio di **Andy Kirk**, secondo cui ogni visualizzazione si costruisce a partire da due componenti elementari: i **marks** (gli elementi grafici che rappresentano i dati) e gli **attributes** (le proprietà visive, posizione, dimensione, colore, orientamento, movimento, che ne codificano i valori). Durante il laboratorio questa grammatica è stata il principale strumento progettuale: ogni tavola è stata pensata decidendo *cosa* fosse il mark e *quali* attributi ne traducessero le variabili. Su questo impianto strutturale si innesta la lezione di **Giorgia Lupi** e del suo *data humanism*: il dato non come astrazione fredda, ma come traccia qualitativa, soggettiva e situata dell'esperienza umana. Un terzo riferimento, **Richard Brath** (*Visualizing with Text*, 2020), fornisce il fondamento specifico dell'approccio adottato: l'idea che il **testo stesso possa essere un canale di visualizzazione**, in cui parole e caratteri, con i loro attributi tipografici, diventano marks a tutti gli effetti. DataMap tiene insieme le tre prospettive: il rigore di marks e attributes e la tipografia-come-dato al servizio di un dato affettivo e personale.

**EN** — The project adopts **Andy Kirk**'s approach, in which every visualization is built from two elementary components: **marks** (the graphical elements that represent data) and **attributes** (the visual properties, position, size, colour, orientation, motion, that encode their values). Throughout the lab this grammar was the primary design tool: each plate was conceived by deciding *what* the mark would be and *which* attributes would translate its variables. Onto this structural foundation it grafts **Giorgia Lupi**'s lesson of *data humanism*: data not as cold abstraction but as a qualitative, subjective and situated trace of human experience. A third reference, **Richard Brath** (*Visualizing with Text*, 2020), provides the specific foundation of the chosen approach: the idea that **text itself can be a visualization channel**, where words and characters, with their typographic attributes, become full-fledged marks. DataMap holds the three together: the rigour of marks and attributes and typography-as-data in the service of affective, personal data.

---

## 3. Metodologia / Methodology

**IT** — I dati sono stati raccolti tramite un **questionario di 25 domande**, somministrato agli utenti del MiniMetrò attraverso un **QR code esposto in ogni vagone** e diffuso per circa **un mese** (182 risposte valide). Le domande alternano una dimensione **emotiva** (la parola che descrive il luogo, l'emozione provata, il livello di energia, felicità e controllo, il senso di sicurezza e appartenenza, le parole che si vorrebbero *lasciare* o *ricevere* dagli altri passeggeri) e una **oggettiva** (stazione di partenza e arrivo, motivo e frequenza del viaggio, fascia d'età, zona di residenza, mezzo alternativo). Le analisi visive prodotte durante il laboratorio si basano interamente sui risultati del form.

**EN** — Data was collected through a **25-question survey**, delivered to MiniMetrò users via a **QR code displayed in every carriage** and run for about **one month** (182 valid responses). Questions alternate between an **affective** layer (the word that describes the place, the emotion felt, levels of energy, happiness and control, the sense of safety and belonging, the words one would like to *leave* to or *receive* from other passengers) and an **objective** layer (departure and arrival station, trip purpose and frequency, age band, area of residence, alternative means of transport). All the visual analyses produced in the lab are grounded in the survey results.

**Etica e privacy / Ethics & privacy** — IT: I dati sono raccolti e trattati in forma **anonima e aggregata**; nessuna visualizzazione identifica singoli individui. · EN: Data is collected and processed in **anonymous, aggregate** form; no visualization identifies individuals.

---

## 4. Il dataset / The dataset

**IT** — Il dataset condiviso (`dati.csv`) raccoglie una riga per risposta. Tra le variabili impiegate dalle visualizzazioni: stazione di partenza e di arrivo, durata percepita e frequenza del viaggio, compagnia, motivo dello spostamento, mezzo alternativo, età, e una batteria di scale 1–5 su **energia, felicità, controllo, sicurezza tra sconosciuti, senso di appartenenza e disponibilità all'interazione**, oltre alle **parole emotive** scelte liberamente dai passeggeri. Ogni stazione seleziona e mappa un diverso sottoinsieme di queste variabili.

**EN** — The shared dataset (`dati.csv`) holds one row per response. Variables used by the visualizations include departure and arrival station, perceived trip length and frequency, company, trip purpose, alternative transport, age, and a battery of 1–5 scales on **energy, happiness, control, safety among strangers, sense of belonging and willingness to interact**, alongside the **affective words** freely chosen by passengers. Each station selects and maps a different subset of these variables.

### 4.1 — Letture dei dati / Reading the data

**IT** — Prima di diventare forma, i dati sono stati letti analiticamente (analisi descrittiva, test non parametrici e una prima esplorazione testuale delle parole, raccolte e riproducibili in `data_analysis/`). Cinque letture, di natura esplorativa su un campione sbilanciato verso studenti giovani, hanno orientato le scelte progettuali:

- **Lavoratori e studenti vivono lo stesso vagone in modo diverso**: per chi lavora è uno spazio identitario, più appartenenza, sicurezza, voglia di interagire; per chi studia è puro transito. È il contrasto più netto del dataset.
- **La contentezza disegna una "V" lungo la linea**: massima ai due capolinea (Pincetto, Pian di Massiano), più bassa nelle stazioni centrali, arrivare al capolinea è, anche emotivamente, *arrivare*.
- **Due MiniMetrò in uno**: la mattina è feriale e stanca (parola ricorrente *stanchezza*), la sera è giovane e distesa (parola ricorrente *serenità*).
- **Le parole hanno una geografia**: ogni stazione evoca un immaginario coerente, *buio / grotta* a Cupa, *vista / centro* a Pincetto, *verde / parco* a Cortonese.
- **Si chiede più di quanto si offra**: i passeggeri vorrebbero *ricevere* soprattutto un saluto, ma scelgono di *lasciare* soprattutto un augurio, un piccolo scarto tra il bisogno di contatto e ciò che si dona.

**EN** — Before becoming form, the data was read analytically (descriptive statistics, non-parametric tests and a first textual exploration of the words, gathered and reproducible in `data_analysis/`). Five readings, exploratory in nature, on a sample skewed towards young students — guided the design choices:

- **Workers and students inhabit the same carriage differently**: for workers it is an identity space, more belonging, safety, willingness to interact; for students it is pure transit. The sharpest contrast in the dataset.
- **Happiness draws a "V" along the line**: highest at the two terminals (Pincetto, Pian di Massiano), lower at the central stations, reaching the terminal means, emotionally too, *arriving*.
- **Two MiniMetròs in one**: the morning is weekday and tired (recurring word *tiredness*), the evening is young and relaxed (recurring word *serenity*).
- **Words have a geography**: each station evokes a coherent imaginary, *dark / cave* at Cupa, *view / centre* at Pincetto, *green / park* at Cortonese.
- **People ask for more than they give**: passengers would mostly like to *receive* a greeting, yet choose to *leave* a good wish, a small gap between the need for contact and what is offered.

---

## 5. Sistema visivo e principi di design / Visual system & design principles

**IT** — Prima di progettare le singole tavole, il laboratorio ha fissato alcuni **principi di design condivisi**, scelti a priori e validi per tutte le visualizzazioni:

- **La tipografia come mark** — La decisione fondante è usare la **tipografia come elemento visivo primario**. Parole e singoli caratteri non sono didascalie, ma veri e propri *marks*: ogni unità di testo rappresenta un dato e ne codifica i valori attraverso *attributes* variabili (dimensione, posizione, colore, orientamento, velocità). La parola scritta dal passeggero diventa così, simultaneamente, contenuto e forma.
- **L'animazione come attributo** — Il movimento è trattato come un *attribute* a pieno titolo: velocità, ritmo e direzione dell'animazione codificano variabili del dato (per esempio la velocità percepita del viaggio o la variazione dei punteggi nel tempo). Il tempo diventa un canale visivo.
- **Sfondo nero** — Tutte le tavole condividono uno sfondo nero, che isola il testo luminoso, massimizza il contrasto e richiama l'estetica del terminale e del coding.
- **Font Source Code Pro** — Un carattere monospaziato nato in ambito *coding*, coerente con la natura generativa del progetto e con la griglia regolare richiesta dall'uso della tipografia come mark.

**EN** — Before designing the individual plates, the lab established a set of **shared design principles**, chosen a priori and valid across all visualizations:

- **Typography as mark** — The founding decision is to use **typography as the primary visual element**. Words and single characters are not captions but actual *marks*: every unit of text represents a datum and encodes its values through variable *attributes* (size, position, colour, orientation, speed). The word written by the passenger thus becomes, at once, both content and form.
- **Animation as attribute** — Motion is treated as a full-fledged *attribute*: the speed, rhythm and direction of animation encode data variables (for instance perceived trip speed, or the change of scores over time). Time becomes a visual channel.
- **Black background** — All plates share a black background, which isolates the luminous text, maximizes contrast and recalls the aesthetics of the terminal and of coding.
- **Source Code Pro typeface** — A monospaced font born in the *coding* context, consistent with the generative nature of the project and with the regular grid required by the use of typography-as-mark.

---

## 6. Le opere / The works

**IT** — Sei tavole generative, una per stazione, da Pian di Massiano a Pincetto. La copertina animata del progetto è collocata a **Pincetto**. Ogni scheda riporta il *modello* di data visualization di riferimento, il *concept*, la *mappatura dei dati → forma* e la *tecnica*.
**EN** — Six generative plates, one per station, from Pian di Massiano to Pincetto. The project's animated cover sits at **Pincetto**. Each card reports the data-visualization *reference chart* it builds on, the *concept*, the *data → form mapping* and the *technique*.

### 6.1 — Cupa · *Il soffione / The dandelion*

- **Modello / Reference chart** — IT: si basa su un **bar plot** (lo stelo come barra verticale). · EN: based on a **bar plot** (the stem as a vertical bar).
- **Concept** — IT: ogni passeggero diventa un soffione che nasce, fiorisce e si disperde nell'aria. · EN: each passenger becomes a dandelion that is born, blooms and scatters into the air.
- **Mappatura / Mapping** — IT: colore della figura = stato d'animo (combinazione di più variabili); altezza dello stelo = età; la frase che si vorrebbe *ricevere* modella la spirale, poi scompare al centro e lascia spazio alla frase da *lasciare*, che si sviluppa in senso opposto. · EN: colour = mood (combined variables); stem height = age; the phrase one would like to *receive* shapes the spiral, then fades at the centre to give way to the phrase to *leave*, growing in the opposite direction.
- **Tecnica / Technique** — disposizione radiale (`sin`/`cos`), cronologia temporale accelerata sul ciclo vitale della forma / radial layout, accelerated lifecycle timeline.

### 6.2 — Case Bruciate · *Dodici emozioni / Twelve emotions*

- **Modello / Reference chart** — IT: si basa su un **circular plot** (le emozioni distribuite su anelli concentrici). · EN: based on a **circular plot** (emotions distributed across concentric rings).
- **Concept** — IT: dodici anelli concentrici di parole, ciascuno corrispondente a un'emozione provata in viaggio. · EN: twelve concentric rings of words, each matching one emotion felt during the trip.
- **Mappatura / Mapping** — IT: velocità percepita del viaggio → velocità di rotazione degli anelli; senso di controllo → intensità cromatica; felicità percepita → apertura e contrazione delle parole lungo l'anello. · EN: perceived trip speed → ring rotation speed; sense of control → chromatic intensity; perceived happiness → how the word opens and contracts along its ring.
- **Tecnica / Technique** — testo disposto lungo traiettorie circolari, parametri dinamici dalle risposte / text along circular paths driven by live response parameters.

### 6.3 — Fontivegge · *L'albero del tragitto / The journey tree*

- **Modello / Reference chart** — IT: si basa su un **diagramma di Sankey** (i flussi tra stazioni di partenza e arrivo). · EN: based on a **Sankey diagram** (flows between departure and arrival stations).
- **Concept** — IT: il tragitto dei passeggeri tradotto in una forma ad albero che collega le fermate della linea. · EN: passengers' journeys translated into a tree connecting the stops of the line.
- **Mappatura / Mapping** — IT: radici = stazione di partenza, tronco = lunghezza del viaggio, chioma = stazione di arrivo; in basso le parole da *lasciare*, in alto quelle da *ricevere*; segni alle radici = frequenza d'uso, livello di contentezza medio all'arrivo sulla chioma. · EN: roots = departure, trunk = trip length, canopy = arrival; words to *leave* below, to *receive* above; marks at the roots = usage frequency, average arrival happiness on the canopy.
- **Tecnica / Technique** — ramificazione tipografica, una mappatura verticale dei flussi / typographic branching, a vertical mapping of flows.

### 6.4 — Madonna Alta · *Quattro fasce / Four bands*

- **Modello / Reference chart** — IT: si basa su un **butterfly chart** (le fasce contrapposte di viaggiatori occasionali e abituali). · EN: based on a **butterfly chart** (the opposed bands of occasional and habitual travellers).
- **Concept** — IT: quattro fasce parallele di testo, una per ciascuna domanda sul rapporto con gli altri passeggeri (agio, appartenenza, sicurezza tra sconosciuti, voglia di interagire). · EN: four parallel text bands, one per question about the relationship with other passengers (ease, belonging, safety among strangers, willingness to interact).
- **Mappatura / Mapping** — IT: la lunghezza della fascia quantifica il punteggio medio (1–5); il colore di ogni parola deriva da un gradiente legato alla felicità dichiarata (1–5); movimento e velocità restituiscono il flusso al passare delle ore. · EN: band length quantifies the average score (1–5); each word's colour comes from a gradient tied to declared happiness (1–5); motion and speed convey the flow as service hours pass.
- **Tecnica / Technique** — barre tipografiche, `lerpColor` su gradiente, animazione oraria / typographic bars, `lerpColor` gradient, hourly animation.

### 6.5 — Cortonese · *Quadranti e orbite / Quadrants and orbits*

- **Modello / Reference chart** — IT: un **bubble plot** suddiviso in quadranti, ispirato all'**Affect Grid** di Russell, Weiss & Mendelsohn (1989): gli assi felicità (valenza) ed energia (attivazione) riprendono il modello circumplesso dell'affetto. · EN: a **bubble plot** divided into quadrants, inspired by the **Affect Grid** of Russell, Weiss & Mendelsohn (1989): the happiness (valence) and energy (arousal) axes echo the circumplex model of affect.
- **Concept** — IT: un grafico a quattro quadranti dove felicità ed energia collocano nuclei di risposte affini. · EN: a four-quadrant chart where happiness and energy place clusters of similar responses.
- **Mappatura / Mapping** — IT: asse x = energia (quanto ci si sente attivi), asse y = felicità (quanto si è contenti); grandezza del nucleo = numero di risposte di quella combinazione; colore = stazione di partenza; numero di orbite di parole = disponibilità a relazionarsi. · EN: x = energy (how active), y = happiness (how content); cluster size = number of responses for that combination; colour = departure station; number of word orbits = willingness to relate.
- **Tecnica / Technique** — scatter a nuclei, sistemi concentrici di testo orbitante / clustered scatter, concentric orbiting-text systems.

### 6.6 — Pian di Massiano · *Sei corsie / Six lanes*

- **Modello / Reference chart** — IT: si basa su un **track chart** (le corsie come tracciati paralleli percorsi dalle risposte). · EN: based on a **track chart** (the lanes as parallel tracks travelled by the responses).
- **Concept** — IT: sei corsie a confronto fra due categorie di utenti, studenti e lavoratori, lungo il tempo di raccolta. · EN: six lanes comparing two user groups, students and workers, across the collection period.
- **Mappatura / Mapping** — IT: tre corsie esterne (mezzo alternativo, motivo del viaggio, compagnia) e tre interne (sicurezza, appartenenza, interazione); la velocità delle frasi è proporzionale alla variazione dei punteggi medi giorno dopo giorno; un indicatore mostra l'evoluzione delle differenze tra i due gruppi. · EN: three outer lanes (alternative transport, trip purpose, company) and three inner lanes (safety, belonging, interaction); phrase speed is proportional to the day-by-day change in average scores; an indicator tracks how the gap between the two groups evolves.
- **Tecnica / Technique** — corsie animate, velocità data-driven sul differenziale temporale / animated lanes, data-driven speed from the temporal differential.

---

## 7. Implementazione tecnica / Technical implementation

**IT** — L'intero progetto è realizzato in **[p5.js](https://p5js.org)** (v1.11.13), ambiente di programmazione creativo del [Processing Foundation](https://processingfoundation.org) per la grafica generativa e l'interazione visiva. Ogni sketch carica il dataset CSV in `preload()` tramite `loadTable(...)` e lo traduce in tempo reale in forma, colore e movimento, usando trigonometria (`sin`/`cos`), `map()`, rumore di Perlin (`noise`), interpolazione cromatica (`lerpColor`) e trasformazioni (`translate`/`rotate`). La tipografia condivisa è Source Code Pro. Le tavole sono raccolte in una landing verticale che ripercorre le 21 pagine del documento DataMap; la pubblicazione web è automatizzata via GitHub Pages.

**EN** — The whole project is built in **[p5.js](https://p5js.org)** (v1.11.13), the [Processing Foundation](https://processingfoundation.org)'s creative-coding environment for generative graphics and visual interaction. Each sketch loads the CSV dataset in `preload()` via `loadTable(...)` and renders it in real time into form, colour and motion, using trigonometry (`sin`/`cos`), `map()`, Perlin `noise`, colour interpolation (`lerpColor`) and transforms (`translate`/`rotate`). The shared typeface is Source Code Pro. The plates are gathered in a vertical landing page mirroring the 21 pages of the DataMap document; web publishing is automated via GitHub Pages.

**Avvio locale / Run locally**

```bash
python -m http.server 8000
# → http://localhost:8000
```

IT: gli sketch caricano file condivisi via HTTP, quindi la pagina va servita da un web server. · EN: sketches load shared files over HTTP, so the page must be served by a web server.

---

## 8. Allestimento / Installation

**IT** — Le visualizzazioni sono pensate come opere *site-specific*: ogni tavola animata è proiettata nella stazione del MiniMetrò che racconta, restituendo ai passeggeri le storie in transito dello spazio che stanno attraversando.

**EN** — The visualizations are conceived as *site-specific* works: each animated plate is projected in the MiniMetrò station it describes, giving passengers back the stories in transit of the space they are crossing.

---

## 9. Crediti / Credits

**Ideazione e coordinamento / Concept & coordination** — Giacomo Lazzerini (ideatore del progetto, coordinamento tecnologico e scientifico / project creator, technical & scientific lead) · Francesca Pucciarini (coordinamento grafico / graphic coordination)

**Team Periferica** — Elena Tredici (restituzione foto/video / photo & video) · Manuela Pucciarini (organizzazione e logistica / organization & logistics) · Marina Chrysanthakopoulou (graphic design per la stampa / print design) · Andrea Bistarelli (responsabile comunicazione / communication)

**Studenti / Students** — Beatrice Acetosi · Matteo Bartoccetti · Cecilia Boschetti · Caterina Cardinali · Noemi Filippini · Vittoria Fabrizi · Sofia Furia · Valentina Gaggia · Veronica Lucconi · Desiree Martire · Fabjona Ndreca · Pamela Spadoni · Federica Smarrocchio

**Partner** — MiniMetrò Perugia · Progetto Tracciati 2026 · Università degli Studi di Perugia (Corso di Design)

---

## 10. Licenza / License

**IT** — Il codice del progetto (sketch, landing, script) è rilasciato sotto licenza **MIT,** vedi [LICENSE](LICENSE). La libreria p5.js è distribuita dal Processing Foundation sotto licenza **LGPL-2.1** e conserva il proprio header originale.

**EN** — The project code (sketches, landing page, scripts) is released under the **MIT** license, see [LICENSE](LICENSE). The p5.js library is distributed by the Processing Foundation under the **LGPL-2.1** license and retains its original header.

---

## 11. Riferimenti / References

- Brath, R. (2020). *Visualizing with Text*. CRC Press / A K Peters Visualization Series.
- Kirk, A. (2019). *Data Visualisation: A Handbook for Data Driven Design* (2nd ed.). SAGE Publications.
- Lupi, G., & Posavec, S. (2016). *Dear Data*. Princeton Architectural Press.
- Lupi, G. (2017). *Data Humanism: The Revolution Will Be Visualized*. Print Magazine / Giorgia Lupi.
- Russell, J. A., Weiss, A., & Mendelsohn, G. A. (1989). Affect Grid: A single-item scale of pleasure and arousal. *Journal of Personality and Social Psychology*, 57(3), 493–502.
- p5.js — Processing Foundation. https://p5js.org
- Processing Foundation. https://processingfoundation.org
- Periferica APS — Progetto Tracciati 2026.
