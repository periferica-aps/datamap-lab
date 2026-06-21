# Analisi statistica — Data Map

Questa cartella contiene l'analisi descrittiva, inferenziale e NLP del
questionario distribuito ai passeggeri del Minimetrò di Perugia tra
l'8 maggio e il 12 giugno 2026 (182 risposte).

## Come si lancia

Dalla root della repo:

```bash
pip install -r data_analysis/requirements.txt
python data_analysis/analysis.py
```

Lo script si aspetta il CSV grezzo in `dati.csv` nella root della repo
(override con `--data PATH`) e scrive l'output in `data_analysis/output/`
(override con `--output DIR`).

## Cosa fa

Le sette sezioni dello script riproducono in ordine l'analisi che ha
prodotto la sintesi narrativa del progetto:

1. **Descrittiva** — demografica, comportamenti, scale Likert, frequenze
2. **Confronti tra gruppi** — Mann-Whitney + effect size *r* su 11 scale ×
   9 raggruppamenti binari (occupazione, frequenza, genere, età,
   residenza, compagnia, motivo, alternativa, giorno settimana)
3. **Capolinea & distanza** — verifica della geografia "a V" della
   contentezza per stazione di arrivo, stratificazione per motivo,
   correlazione tra distanza in stazioni e scale emotive
4. **Correlazioni** — matrice Spearman tra le 11 scale + frequenza + età
5. **Categoriche** — chi-quadro e Cramér's V per le associazioni tra
   variabili categoriche (occupazione × motivo, fascia × stazione, ecc.)
6. **Pattern temporali** — Kruskal-Wallis delle scale per fascia oraria
   locale (UTC+2), composizione del vagone per fascia
7. **NLP** — copertura, geografia emotiva delle parole per stazione,
   categorizzazione semantica delle parole "vorrei ricevere" e "vorrei
   lasciare", chi-quadro sull'asimmetria affettiva

## Output

Lo script genera **solo** dati grezzi in `output/`. La sintesi narrativa
dei risultati è curata a mano in [`findings.md`](findings.md), a partire
da questi stessi numeri (così non si disallinea dal codice).

| File                      | Contenuto                                            |
| ------------------------- | ---------------------------------------------------- |
| `descriptive.csv`       | Statistiche descrittive delle 11 scale Likert        |
| `group_tests.csv`       | Tutti i Mann-Whitney (gruppo × variabile) con p e r |
| `spearman.csv`          | Matrice correlazioni tra scale                       |
| `categorical.csv`       | Chi-quadro per coppie categoriche                    |
| `stations.csv`          | Contentezza media per stazione di arrivo             |
| `distance_spearman.csv` | Correlazione distanza tragitto × scale              |
| `temporal_kw.csv`       | Kruskal-Wallis per fascia oraria                     |
| `temporal_stations.csv` | Stazione di partenza × fascia oraria                |
| `nlp_words.csv`         | Categorizzazione semantica ricevere/lasciare         |

Anche stdout è strutturato e copre tutto: per archiviazione conviene

```bash
python data_analysis/analysis.py > data_analysis/output/log.txt
```

## Note metodologiche

- **Approccio esplorativo**: p < 0,05 grezzi + effect size, senza
  correzione per test multipli (il dataset è descrittivo, non
  confermativo).
- **Test non parametrici**: scale ordinali e gruppi squilibrati →
  Mann-Whitney U, Kruskal-Wallis, Spearman.
- **Effect size**:
  - Mann-Whitney → *r* = |Z|/√N (small ≥ 0,1, medium ≥ 0,3, large ≥ 0,5)
  - Chi-quadro → Cramér's V
  - Kruskal-Wallis → η² approssimato
- **Raggruppamento occupazione**: lavoratori + studenti-lavoratori
  uniti (n=50) vs studenti (n=121). 11 risposte da altre categorie
  (pensionati, in cerca di lavoro, altro) sono escluse dai confronti
  binari.
- **Fasce orarie**: i timestamp del CSV sono in UTC, lo script li
  converte in ora locale CEST (UTC+2) prima di assegnare la fascia.

## Limiti del campione

- Forte sbilanciamento verso studenti giovani perugini → le
  generalizzazioni alla popolazione totale degli utenti del Minimetrò
  sono prudenti.
- Il 34% delle parole nel campo `parola_stazione` è facoltativo e non
  compilato; nei campi liberi di "ricevere"/"lasciare" ~33% delle
  risposte cade nella categoria "altro" perché molto idiosincratiche
  (es. "lasciate ogni speranza voi che entrate", "daje roma daje"),
  sono perle qualitative che non si riducono a categoria.
