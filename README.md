# DataMap landing

Trasposizione web verticale delle 21 pagine del PDF DataMap. Le pagine
testuali conservano esattamente grafica e contenuti del documento originale;
la copertina e le sei tavole delle stazioni sono sostituite dagli sketch p5.

## Avvio locale

Gli sketch caricano file condivisi via HTTP, quindi la pagina va servita con un web server:

```bash
python -m http.server 8000
```

Aprire `http://localhost:8000`.

## Struttura

- `index.html`, `styles.css`, `app.js`: landing page.
- `dati.csv`: dataset condiviso da tutti gli sketch.
- `templateFrame.js`: cornice p5 condivisa.
- `pages/`: riproduzioni 1080×1920 delle pagine statiche del PDF.
- `Pincetto/`: sketch della copertina DataMap.
- cartelle delle sei stazioni: un `index.html` e uno `sketch.js` per visualizzazione.

Il workflow `.github/workflows/pages.yml` pubblica automaticamente il sito con GitHub Pages a ogni push su `main`.

## Tecnologie e crediti

L'intero progetto è stato sviluppato nell'ambiente di creative coding
[p5.js](https://p5js.org): la copertina e le sei tavole animate delle stazioni
sono sketch p5 (versione 1.11.13). p5.js è una libreria open
source del [Processing Foundation](https://processingfoundation.org),
distribuita sotto licenza GNU LGPL-2.1; i file della libreria inclusi nel
repository conservano il proprio header di licenza originale.

## Licenza

Il codice di questo progetto (sketch, landing page e script) è rilasciato sotto
licenza [MIT](LICENSE), per renderlo apertamente consultabile e riutilizzabile.
Fanno eccezione i file della libreria p5.js, coperti dalla rispettiva licenza
LGPL-2.1.
