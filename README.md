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
