# Data Map — Sintesi dei risultati

> Sintesi narrativa curata a mano sui dati estratti da [`analysis.py`](analysis.py).
> I numeri qui riportati sono tutti riproducibili dall'output dello script
> (CSV in [`output/`](output/) e stdout). Aggiornare questo file quando
> cambiano i dati o l'analisi.

## Campione

- **182 questionari** raccolti dall'8 maggio al 12 giugno 2026 (34 giorni distinti)
- **Età**: media 25,7 — mediana 21 — 73% ha 24 anni o meno (68% sotto i 24)
- **Genere**: 55,5% donne (101), 40,7% uomini (74), 3,8% non binarie / non dichiarato (7)
- **Occupazione**: 66,5% studenti (121), 18,7% lavoratori (34), 8,8% studenti-lavoratori (16)
- **Residenza**: 50% Perugia città (91), 30% provincia (54), ~19% altre zone / estero
- **Alternativa al Minimetrò**: 54% bus (99), 31% auto (57) — il Minimetrò integra il TPL, non sostituisce l'auto

## Pattern principali

### 1. Lavoratori vs studenti — il pattern più solido del dataset
I lavoratori (n=50, lavoratori + studenti-lavoratori) vivono il vagone come spazio
identitario; gli studenti (n=121) come transito funzionale.

| | Lavoratori | Studenti | p |
|---|---|---|---|
| Appartenenza | 3,44 | 2,77 | 0,0009 *** |
| Sicurezza | 3,84 | 3,31 | 0,0065 ** |
| Interazione (voglia di parlare) | 3,56 | 3,01 | 0,0106 * |
| Energia | 3,48 | 3,15 | 0,0481 * |

### 2. Geografia "a V" della contentezza per stazione di arrivo
| Stazione | n | Contentezza media | Tipo |
|---|---|---|---|
| Pincetto | 54 | **3,76** | capolinea |
| Cupa | 19 | 3,05 | intermedia |
| Case Bruciate | 8 | **2,88** | intermedia |
| Fontivegge | 26 | 3,42 | intermedia |
| Madonna Alta | 8 | 3,50 | intermedia |
| Cortonese | 22 | 3,64 | intermedia |
| Pian Di Massiano | 45 | **3,71** | capolinea |

- Arrivare al capolinea aumenta contentezza (+0,39, p=0,017), controllo (+0,45, p=0,006), energia (+0,30, p=0,048)
- L'effetto **sparisce** per chi viaggia per svago (3,77 cap vs 3,81 int)
- La **distanza in stazioni** non correla con nessuna scala emotiva (tutti i rho < 0,15, p > 0,05)

### 3. Due Minimetrò in uno (mattina vs sera)
- **Mattina (7-10, n=15)**: 47% lavoratori, 93% lavoro/studio, 73% da soli, emozione dominante **stanchezza**
- **Sera (18-21, n=44)**: 70% studenti, 79% giovani, 50% accompagnati, emozione dominante **serenità**, vagone percepito più pulito (2,2 vs 2,9) e più vuoto (2,4 vs 2,9)

Stazioni con uso temporale specifico (% partenze sulla colonna fascia):
- **Cupa**: stazione serale (7% partenze mattina → 25% sera)
- **Case Bruciate**: stazione mattutina (20% mattina → 2% sera)

### 4. Gap di controllo per genere
Sicurezza simmetrica, ma controllo asimmetrico:

| | Donne | Uomini | p |
|---|---|---|---|
| Controllo | 3,01 | 3,53 | 0,0024 ** |
| Sicurezza | 3,35 | 3,65 | 0,10 (ns) |

### 5. Frequenza alta = meno controllo, più rumore percepito
| | Abituali | Occasionali | p |
|---|---|---|---|
| Controllo | 3,09 | 3,60 | 0,0073 ** |
| Silenzioso↔Rumoroso | 2,62 | 2,10 | 0,0034 ** |

L'abitudine non genera appartenenza al vagone, genera assuefazione.

## Geografia emotiva delle stazioni (parole evocate)
Dalle parole libere associate alla stazione di partenza (campo facoltativo, 66% di copertura):

- **Pincetto** → centralità, bellezza, vista, panorama ("vista mozzafiato", "belvedere", "centro")
- **Cupa** → buio, grotta, tunnel, caverna (coerente col nome: "buio", "interiora della balena", "disperazione")
- **Case Bruciate** → industriale, urbano, fuoco ("incendi", "che le case sono bruciate")
- **Fontivegge** → divide: "accogliente / hub" vs "zona malfamata / ansia / grigio"
- **Madonna Alta** → casa, residenza, comodità ("ci abito", "comodità")
- **Cortonese** → verde, parco, famiglia (e McDonald's ricorrente)
- **Pian di Massiano** → funzionale, parcheggio, ma anche "mamma, relax, arrivata a casa"

## Asimmetria affettiva delle parole (chi² = 36,78, dof=9, p = 0,00003)
Quello che si chiede di **ricevere** ≠ quello che si offre di **lasciare**
(% sui campi compilati: ricevere n=158, lasciare n=164):

| Categoria | Ricevere % | Lasciare % | Delta |
|---|---|---|---|
| Saluto | 18,4 | 6,1 | **+12,3** |
| Riconoscimento | 8,2 | 2,4 | +5,8 |
| Contatto / conversazione | 3,8 | 0,6 | +3,2 |
| Rassicurazione | 14,6 | 13,4 | +1,2 (sim.) |
| Affetto | 3,8 | 3,0 | +0,8 (sim.) |
| Esortazione | 5,1 | 11,0 | -5,9 |
| Augurio (formale) | 7,6 | 23,8 | **-16,2** |

(Una quota ampia — 33% sia in ricevere sia in lasciare — cade in "altro": risposte
idiosincratiche non riducibili a categoria.)

Sotto-asimmetrie:
- **Adulti** chiedono presenza (saluti 23% vs 16%, riconoscimento 13% vs 6%); **giovani** chiedono rassicurazione (18% vs 6%)
- **Uomini** chiedono saluti (28% vs 13%) e riconoscimento (15% vs 3%) più delle donne
- **Lavoratori** offrono affetto (10%); studenti quasi mai (0%)
- **Sera** dimezza l'asimmetria — vagone più "umano"
