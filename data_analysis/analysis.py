"""
Data Map — Analisi statistica del questionario Minimetrò (Perugia)
====================================================================

Riproduce l'intera analisi descrittiva, inferenziale e NLP a partire
dal CSV grezzo del questionario. La sintesi narrativa dei risultati
vive a parte in findings.md (curata a mano sui dati qui estratti).

Uso:
    python analysis.py [--data PATH] [--output DIR]

Default:
    --data   = ../dati.csv (relativo a questo file)
    --output = ./output/

Output:
    output/descriptive.csv     — statistiche descrittive
    output/group_tests.csv     — Mann-Whitney per tutti i raggruppamenti
    output/spearman.csv        — correlazioni tra scale
    output/categorical.csv     — chi-quadro per coppie categoriche
    output/stations.csv        — sintesi per stazione (contentezza, parole)
    output/temporal.csv        — distribuzioni per fascia oraria
    output/nlp_words.csv       — categorizzazione semantica parole ricevere/lasciare

Note metodologiche:
    - Approccio esplorativo: p<0.05 grezzi + effect size
      (no correzione per test multipli)
    - Lavoratori = lavoratore + studente-lavoratore (n=50)
      Studenti = studente (n=121)
      Altre categorie (n=11) escluse dai confronti binari
    - Test non parametrici (Mann-Whitney, Kruskal-Wallis, Spearman)
      perché le scale sono ordinali e i gruppi squilibrati
"""

import argparse
import re
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

# =============================================================================
# 0. SETUP
# =============================================================================

RENAME_MAP = {
    'Da quale stazione sei partito/a?': 'stazione_partenza',
    'Dove stai andando?': 'destinazione',
    'Sei in Compagnia?': 'compagnia',
    'Perché stai usando il Minimetrò oggi?': 'motivo',
    'Quanto spesso usi il Minimetrò nella tua vita quotidiana?': 'frequenza',
    'Quanti anni hai?': 'eta',
    'Genere': 'genere',
    'Dove vivi principalmente?': 'residenza',
    'In quale zona del comune di Perugia vivi?': 'zona_perugia',
    'Cosa fai nella tua vita quotidiana?': 'occupazione',
    'Se non ci fosse il Minimetrò, come ti sposteresti normalmente?': 'alternativa',
    'Qual è il tuo livello di energia?': 'energia',
    'Quanto sei contento?': 'contentezza',
    'Quanto ti senti in controllo di ciò che ti succede?': 'controllo',
    "C'è una parola che si avvicina a quello che senti? (facoltativo)": 'parola_emozione',
    'Vuoto – Affollato': 'vuoto_affollato',
    'Silenzioso – Rumoroso': 'silenzioso_rumoroso',
    'Pulito – Sporco': 'pulito_sporco',
    'Quando mi trovo in questo spazio, mi sento circondato da persone simili a me.': 'persone_simili',
    'In questo luogo mi sento al sicuro, anche in presenza di persone che non conosco. ': 'sicurezza',
    'Questo spazio mi appartiene: sento che fa parte della mia identità e di chi sono.': 'appartenenza',
    'In questo spazio, mi sentirei a mio agio nello scambiare qualche parola con gli altri passeggeri.': 'interazione',
    'Quale parola vorresti RICEVERE da qualcuno in questo momento?': 'parola_ricevere',
    'Quale parola vorresti LASCIARE a chi salirà su questo vagone dopo di te?': 'parola_lasciare',
    'Quanto ti sembra veloce questo viaggio?': 'velocita_percepita',
    'Se questo viaggio fosse un colore, quale sarebbe?': 'colore',
    'Submitted At': 'submitted_at',
}

# Colonna 1 ("Hai appena lasciato la stazione ... che parola ti viene in mente?")
# ha un nome dinamico, viene rinominata in load_data.

SCALE_COLS = [
    'energia', 'contentezza', 'controllo',
    'vuoto_affollato', 'silenzioso_rumoroso', 'pulito_sporco',
    'persone_simili', 'sicurezza', 'appartenenza', 'interazione',
    'velocita_percepita',
]

# Ordine geografico della linea (Pincetto → Pian di Massiano)
STATION_ORDER = [
    'Pincetto', 'Cupa', 'Case Bruciate', 'Fontivegge',
    'Madonna Alta', 'Cortonese', 'Pian Di Massiano',
]
CAPOLINEA = {'Pincetto', 'Pian Di Massiano'}


# =============================================================================
# 1. LOAD & PREPROCESSING
# =============================================================================

def load_data(path: Path) -> pd.DataFrame:
    """Carica il CSV, rinomina colonne, aggiunge variabili derivate."""
    df = pd.read_csv(path)

    # Rinomina la colonna "parola stazione" (nome dinamico)
    for c in df.columns:
        if c.startswith('Hai appena lasciato la stazione'):
            df = df.rename(columns={c: 'parola_stazione'})
            break

    df = df.rename(columns=RENAME_MAP)

    # Parsing timestamp ("08/05/2026 14,20,15" → UTC → ora locale CEST +2)
    df['dt'] = pd.to_datetime(
        df['submitted_at'], format="%d/%m/%Y %H,%M,%S", errors='coerce'
    )
    df['ora_utc'] = df['dt'].dt.hour
    df['ora_locale'] = (df['ora_utc'] + 2) % 24
    df['data'] = df['dt'].dt.date
    df['giorno_sett'] = df['dt'].dt.day_name()

    # Fascia oraria locale
    def fascia(h):
        if 7 <= h < 10: return '1_mattina_7-10'
        if 10 <= h < 13: return '2_tardamattina_10-13'
        if 13 <= h < 15: return '3_pranzo_13-15'
        if 15 <= h < 18: return '4_pomeriggio_15-18'
        if 18 <= h < 21: return '5_sera_18-21'
        return '6_altro'
    df['fascia'] = df['ora_locale'].apply(fascia)

    # Gruppi binari per i confronti
    df['gr_occupazione'] = df['occupazione'].map({
        'Studente/studentessa': 'studenti',
        'Lavoratore/lavoratrice': 'lavoratori',
        'Studente-lavoratore': 'lavoratori',
    })
    df['gr_frequenza'] = df['frequenza'].map(
        {1: 'occasionali', 2: 'occasionali', 3: 'abituali', 4: 'abituali', 5: 'abituali'}
    )
    df['gr_genere'] = df['genere'].where(df['genere'].isin(['Donna', 'Uomo']))
    df['gr_eta'] = np.where(df['eta'] < 25, 'giovani', 'adulti')
    df['gr_residenza'] = df['residenza'].map({
        'Nel comune di Perugia': 'perugini',
        'Nei dintorni di Perugia (provincia / comuni vicini)': 'non_perugini',
        'In un’altra zona d’Italia': 'non_perugini',
        'All’estero': 'non_perugini',
    })
    df['gr_compagnia'] = df['compagnia'].apply(
        lambda x: 'solo' if x == 'Nessuno (sono da solo/a)'
        else ('accompagnato' if pd.notna(x) else np.nan)
    )
    util = {'Studio', 'Lavoro', 'Ritorno a casa', 'Commissioni / necessità'}
    ricr = {'Tempo libero / svago', 'Turismo',
            'Spostamento di passaggio / collegamento', 'Accompagnare qualcuno'}
    df['gr_motivo'] = df['motivo'].apply(
        lambda x: 'utilitaristico' if x in util
        else ('ricreativo' if x in ricr else np.nan)
    )
    df['gr_alternativa'] = df['alternativa'].where(df['alternativa'].isin(['Bus', 'Auto']))
    df['gr_giorno'] = df['giorno_sett'].apply(
        lambda x: 'weekend' if x in ['Saturday', 'Sunday']
        else ('feriale' if pd.notna(x) else np.nan)
    )

    # Distanza in stazioni + capolinea
    idx = {s: i for i, s in enumerate(STATION_ORDER)}
    df['idx_part'] = df['stazione_partenza'].map(idx)
    df['idx_arr'] = df['destinazione'].map(idx)
    df['distanza'] = (df['idx_arr'] - df['idx_part']).abs()
    df['arr_capolinea'] = df['destinazione'].isin(CAPOLINEA)
    df['part_capolinea'] = df['stazione_partenza'].isin(CAPOLINEA)

    # Normalizzazione testuale
    def norm(s):
        if pd.isna(s): return None
        s = str(s).strip().lower()
        s = re.sub(r"[^\w\sàèéìíòóùú']", ' ', s)
        s = re.sub(r'\s+', ' ', s).strip()
        return s if s else None
    for c in ['parola_stazione', 'parola_emozione', 'parola_ricevere', 'parola_lasciare']:
        if c in df.columns:
            df[c + '_norm'] = df[c].apply(norm)

    return df


# =============================================================================
# 2. STATISTICS HELPERS
# =============================================================================

def mann_whitney(a, b):
    """MW two-sided con effect size r = |Z|/sqrt(N)."""
    a = pd.Series(a).dropna()
    b = pd.Series(b).dropna()
    if len(a) < 5 or len(b) < 5:
        return None
    res = stats.mannwhitneyu(a, b, alternative='two-sided')
    n1, n2 = len(a), len(b)
    mu = n1 * n2 / 2
    sigma = np.sqrt(n1 * n2 * (n1 + n2 + 1) / 12)
    z = (res.statistic - mu) / sigma
    r = abs(z) / np.sqrt(n1 + n2)
    return {
        'U': res.statistic, 'p': res.pvalue, 'r_effect': r,
        'n1': n1, 'n2': n2,
        'mean1': a.mean(), 'mean2': b.mean(),
        'med1': a.median(), 'med2': b.median(),
    }


def cramer_v(crosstab):
    """Cramér's V come effect size per chi-quadro."""
    chi2 = stats.chi2_contingency(crosstab)[0]
    n = crosstab.values.sum()
    r, k = crosstab.shape
    return np.sqrt(chi2 / (n * (min(r, k) - 1))) if min(r, k) > 1 else 0


def sig_marker(p):
    if p < 0.001: return '***'
    if p < 0.01: return '**'
    if p < 0.05: return '*'
    return ''


# =============================================================================
# 3. SECTIONS
# =============================================================================

def section_descriptive(df, outdir):
    print("\n" + "=" * 70)
    print("1. ANALISI DESCRITTIVA")
    print("=" * 70)
    print(f"\nRighe: {len(df)}   Date: {df['dt'].min().date()} → {df['dt'].max().date()}")
    print(f"Giorni distinti: {df['data'].nunique()}")

    print("\n--- Demografica ---")
    print(f"Età: media={df['eta'].mean():.1f}, mediana={df['eta'].median():.0f}, "
          f"min={df['eta'].min()}, max={df['eta'].max()}")
    print(f"\nGenere:\n{df['genere'].value_counts(dropna=False).to_string()}")
    print(f"\nOccupazione:\n{df['occupazione'].value_counts(dropna=False).to_string()}")
    print(f"\nResidenza:\n{df['residenza'].value_counts(dropna=False).to_string()}")

    print("\n--- Comportamenti ---")
    print(f"\nStazione partenza:\n{df['stazione_partenza'].value_counts(dropna=False).to_string()}")
    print(f"\nDestinazione:\n{df['destinazione'].value_counts(dropna=False).to_string()}")
    print(f"\nMotivo:\n{df['motivo'].value_counts(dropna=False).to_string()}")
    print(f"\nAlternativa (se non ci fosse il Minimetrò):\n"
          f"{df['alternativa'].value_counts(dropna=False).to_string()}")

    print("\n--- Scale (1-5, velocita_percepita 1-10) ---")
    desc = df[SCALE_COLS].describe().T[['count', 'mean', 'std', 'min', '50%', 'max']]
    desc.columns = ['n', 'mean', 'std', 'min', 'median', 'max']
    print(desc.round(2).to_string())
    desc.to_csv(outdir / 'descriptive.csv')


def section_group_tests(df, outdir):
    print("\n" + "=" * 70)
    print("2. CONFRONTI TRA GRUPPI (Mann-Whitney + effect size)")
    print("=" * 70)

    group_cols = [
        'gr_occupazione', 'gr_frequenza', 'gr_genere', 'gr_eta',
        'gr_residenza', 'gr_compagnia', 'gr_motivo', 'gr_alternativa',
        'gr_giorno',
    ]
    rows = []
    for g in group_cols:
        vals = sorted(df[g].dropna().unique())
        if len(vals) != 2:
            continue
        v1, v2 = vals
        for c in SCALE_COLS:
            res = mann_whitney(df.loc[df[g] == v1, c], df.loc[df[g] == v2, c])
            if res is None:
                continue
            rows.append({
                'gruppo': g.replace('gr_', ''),
                'v1': v1, 'v2': v2, 'variabile': c,
                'mean1': round(res['mean1'], 2), 'mean2': round(res['mean2'], 2),
                'diff': round(res['mean1'] - res['mean2'], 2),
                'p': res['p'], 'sig': sig_marker(res['p']),
                'r_effect': round(res['r_effect'], 3),
                'n1': res['n1'], 'n2': res['n2'],
            })
    out = pd.DataFrame(rows)
    out.to_csv(outdir / 'group_tests.csv', index=False)

    sig = out[out['p'] < 0.05].sort_values('p')
    print(f"\nTest totali: {len(out)}  |  Significativi p<0.05: {len(sig)}  "
          f"(attesi per caso ~{len(out) * 0.05:.0f})")
    print(f"Significativi p<0.01: {(out['p'] < 0.01).sum()}")
    print("\nSignificativi (ordinati per p):")
    pd.set_option('display.max_rows', 100)
    print(sig[['gruppo', 'v1', 'v2', 'variabile',
               'mean1', 'mean2', 'diff', 'p', 'sig', 'r_effect']]
          .to_string(index=False, float_format='%.4f'))


def section_capolinea_distance(df, outdir):
    print("\n" + "=" * 70)
    print("3. CAPOLINEA vs INTERMEDIE + DISTANZA TRAGITTO")
    print("=" * 70)

    print("\n--- Contentezza per stazione di ARRIVO (ordine geografico) ---")
    rows = []
    for s in STATION_ORDER:
        sub = df[df['destinazione'] == s]['contentezza'].dropna()
        rows.append({
            'stazione': s, 'n': len(sub),
            'contentezza_mean': round(sub.mean(), 2) if len(sub) else None,
            'contentezza_median': sub.median() if len(sub) else None,
            'tipo': 'capolinea' if s in CAPOLINEA else 'intermedia',
        })
    stations_df = pd.DataFrame(rows)
    print(stations_df.to_string(index=False))
    stations_df.to_csv(outdir / 'stations.csv', index=False)

    print("\n--- Arrivo capolinea vs intermedie ---")
    for c in ['contentezza', 'energia', 'controllo', 'sicurezza',
              'appartenenza', 'interazione', 'velocita_percepita']:
        res = mann_whitney(df.loc[df['arr_capolinea'], c],
                           df.loc[~df['arr_capolinea'], c])
        if res:
            print(f"  {c:22s}: cap={res['mean1']:.2f} (n={res['n1']})  "
                  f"int={res['mean2']:.2f} (n={res['n2']})  "
                  f"p={res['p']:.4f} {sig_marker(res['p'])}  r={res['r_effect']:.3f}")

    print("\n--- Effetto capolinea STRATIFICATO per motivo ---")
    for mot in df['motivo'].dropna().unique():
        sub = df[df['motivo'] == mot]
        res = mann_whitney(sub.loc[sub['arr_capolinea'], 'contentezza'],
                           sub.loc[~sub['arr_capolinea'], 'contentezza'])
        if res:
            print(f"  {mot[:30]:32s}: cap={res['mean1']:.2f} (n={res['n1']})  "
                  f"int={res['mean2']:.2f} (n={res['n2']})  p={res['p']:.4f}")

    print("\n--- Distanza tragitto (in stazioni) — Spearman con scale ---")
    rows = []
    for c in SCALE_COLS:
        s = df[[c, 'distanza']].dropna()
        rho, p = stats.spearmanr(s[c], s['distanza'])
        rows.append({'scala': c, 'rho': round(rho, 3), 'p': round(p, 4),
                     'sig': sig_marker(p), 'n': len(s)})
        print(f"  {c:22s} ~ distanza: rho={rho:+.3f}  p={p:.4f} {sig_marker(p)}")
    pd.DataFrame(rows).to_csv(outdir / 'distance_spearman.csv', index=False)


def section_correlations(df, outdir):
    print("\n" + "=" * 70)
    print("4. CORRELAZIONI TRA SCALE (Spearman)")
    print("=" * 70)
    cols = SCALE_COLS + ['frequenza', 'eta']
    rows = []
    for i, c1 in enumerate(cols):
        for c2 in cols[i + 1:]:
            s = df[[c1, c2]].dropna()
            if len(s) < 20:
                continue
            rho, p = stats.spearmanr(s[c1], s[c2])
            rows.append({'var1': c1, 'var2': c2,
                         'rho': round(rho, 3), 'p': round(p, 4),
                         'sig': sig_marker(p), 'n': len(s)})
    corr = pd.DataFrame(rows)
    corr.to_csv(outdir / 'spearman.csv', index=False)
    sig = corr[(corr['p'] < 0.05) & (corr['rho'].abs() >= 0.2)] \
        .sort_values('rho', key=abs, ascending=False)
    print(f"\nCoppie con |rho|>=0.2 e p<0.05 ({len(sig)}):")
    print(sig.to_string(index=False))


def section_categorical(df, outdir):
    print("\n" + "=" * 70)
    print("5. ASSOCIAZIONI CATEGORICHE (chi-quadro + Cramér V)")
    print("=" * 70)
    cats = ['stazione_partenza', 'destinazione', 'compagnia', 'motivo',
            'alternativa', 'genere', 'occupazione', 'colore',
            'gr_frequenza', 'gr_eta', 'gr_residenza', 'fascia']
    rows = []
    seen = set()
    for a in cats:
        for b in cats:
            if a == b:
                continue
            key = tuple(sorted([a, b]))
            if key in seen:
                continue
            seen.add(key)
            ct = pd.crosstab(df[a], df[b])
            if ct.size < 4 or ct.values.min() < 1:
                continue
            try:
                chi2, p, dof, _ = stats.chi2_contingency(ct)
                v = cramer_v(ct)
                rows.append({'var1': a, 'var2': b,
                             'chi2': round(chi2, 2), 'dof': dof,
                             'p': round(p, 5), 'sig': sig_marker(p),
                             'V': round(v, 3)})
            except Exception:
                pass
    cat_df = pd.DataFrame(rows).sort_values('p')
    cat_df.to_csv(outdir / 'categorical.csv', index=False)
    sig = cat_df[cat_df['p'] < 0.05]
    print(f"\nSignificativi p<0.05 ({len(sig)}):")
    print(sig.to_string(index=False))


def section_temporal(df, outdir):
    print("\n" + "=" * 70)
    print("6. PATTERN TEMPORALI (fasce orarie locali)")
    print("=" * 70)
    sub = df[df['fascia'] != '6_altro']
    print(f"\nDistribuzione fasce orarie:")
    print(sub['fascia'].value_counts().sort_index().to_string())

    print("\n--- Medie scale per fascia (Kruskal-Wallis) ---")
    rows = []
    for c in SCALE_COLS:
        groups = [sub.loc[sub['fascia'] == f, c].dropna()
                  for f in sorted(sub['fascia'].unique())]
        groups = [g for g in groups if len(g) >= 5]
        if len(groups) < 2:
            continue
        H, p = stats.kruskal(*groups)
        n_tot = sum(len(g) for g in groups)
        k = len(groups)
        eta_sq = (H - k + 1) / (n_tot - k) if n_tot > k else 0
        rows.append({'scala': c, 'H': round(H, 2), 'p': round(p, 4),
                     'sig': sig_marker(p), 'eta_sq': round(eta_sq, 3)})
        print(f"  {c:22s}  H={H:.2f}  p={p:.4f} {sig_marker(p)}  eta²={eta_sq:.3f}")
    pd.DataFrame(rows).to_csv(outdir / 'temporal_kw.csv', index=False)

    print("\n--- Composizione vagone per fascia (%) ---")
    print("\nOccupazione × fascia:")
    print((pd.crosstab(sub['gr_occupazione'], sub['fascia'], normalize='columns') * 100)
          .round(1).to_string())
    print("\nMotivo × fascia:")
    print((pd.crosstab(sub['motivo'], sub['fascia'], normalize='columns') * 100)
          .round(1).to_string())
    print("\nStazione di partenza × fascia (% colonne):")
    print((pd.crosstab(sub['stazione_partenza'], sub['fascia'], normalize='columns') * 100)
          .round(1).to_string())

    pd.crosstab(sub['stazione_partenza'], sub['fascia']) \
        .to_csv(outdir / 'temporal_stations.csv')


def section_nlp(df, outdir):
    print("\n" + "=" * 70)
    print("7. ANALISI NLP — parole evocate")
    print("=" * 70)

    print("\n--- Copertura campi testuali ---")
    for c in ['parola_stazione', 'parola_emozione', 'parola_ricevere', 'parola_lasciare']:
        n = df[c + '_norm'].notna().sum()
        u = df[c + '_norm'].nunique()
        print(f"  {c}: n={n} ({n / len(df) * 100:.0f}%)  unici={u}")

    print("\n--- Emozione (lista chiusa, 17 valori) ---")
    print(df['parola_emozione_norm'].value_counts().to_string())

    # Geografia emotiva — parole per stazione
    print("\n--- Geografia parole per stazione di partenza ---")
    for s in STATION_ORDER:
        parole = df.loc[df['stazione_partenza'] == s, 'parola_stazione_norm'].dropna()
        if len(parole) == 0:
            continue
        print(f"\n  [{s.upper()}] n={len(parole)}")
        for p in parole:
            print(f"    · {p}")

    # Categorizzazione semantica ricevere/lasciare
    def categorize(text):
        if not isinstance(text, str):
            return None
        t = text.lower()
        if t in {'nessuna', 'niente', 'nulla', 'boh', 'non lo so',
                 'non so', 'bo', 'boh che ne so', 'non voglio parlare con nessuno'}:
            return 'nessuna/rifiuto'
        if re.search(r'\b(ciao|buongiorno|buonasera|buona sera|bentornat|salve|hey|hello|hola|ehi)\b', t):
            return 'saluto'
        if re.search(r"(come stai|chiacchier|dove scendi|hai visto|cosa ne pensi|"
                     r"ti ho notat|come va|si discute|che ne pensi)", t):
            return 'contatto/conversaz.'
        if re.search(r'\b(buona giornata|buon viaggio|buon tutto|buona fortuna|'
                     r'buon|buona|in bocca al lupo|passa)\b', t):
            if re.search(r'(amore|abbraccio|cuore|ti voglio|ti amo)', t):
                return 'affetto'
            return 'augurio'
        if re.search(r'(amore|ti voglio bene|ti amo|abbracci|cuore|tenerezza|'
                     r'abbraccinoo|bacio|baciat)', t):
            return 'affetto'
        if re.search(r"(brav|grazie|sei magnetic|bei capelli|bell'outfit|bell outfit|"
                     r"sei forte|sei giusto|sei perfett|sei bell|bellezza|ti regalo|"
                     r"sei intellig)", t):
            return 'riconoscimento'
        if re.search(r"(andrà tutto bene|c.{1,3}la fa|c.{1,3}la puoi|tranquill|"
                     r"calma|non ti preoccupare|non preoccupar|tutto passa|coraggio|"
                     r"forza|sereno|serena|serenità|non aver paura|credi in te|"
                     r"te lo meriti|tieniti forte|pensa positivo|rilassa|respira|"
                     r"c.{1,3}.{1,3}tempo)", t):
            return 'rassicurazione'
        if re.search(r'(vivi|sorridi|insegui|divert|gode|coltiva|continua|fai|sii|'
                     r'crea|crescere|cresci|sogna|vivere|da.{1,3}il tuo massimo|daje)', t):
            return 'esortazione'
        if re.search(r'(silenzio|bassa voce|piano)', t):
            return 'rassicurazione'
        if re.search(r'(ansia|paura|stanc|noia|puzza|cattiv|odio|tristezza|noioso|'
                     r'preoccupa|lasciate ogni speranza|non essere)', t):
            return 'negativo'
        return 'altro'

    df['cat_ricevere'] = df['parola_ricevere_norm'].apply(categorize)
    df['cat_lasciare'] = df['parola_lasciare_norm'].apply(categorize)

    print("\n--- Asimmetria ricevere vs lasciare (% sul totale di compilati) ---")
    cat_order = ['saluto', 'contatto/conversaz.', 'rassicurazione', 'affetto',
                 'riconoscimento', 'esortazione', 'augurio', 'negativo',
                 'nessuna/rifiuto', 'altro']
    r_cnt = df['cat_ricevere'].value_counts().reindex(cat_order).fillna(0).astype(int)
    l_cnt = df['cat_lasciare'].value_counts().reindex(cat_order).fillna(0).astype(int)
    out = pd.DataFrame({
        'ricevere_n': r_cnt, 'lasciare_n': l_cnt,
        'ricevere_%': (r_cnt / r_cnt.sum() * 100).round(1),
        'lasciare_%': (l_cnt / l_cnt.sum() * 100).round(1),
    })
    out['delta_%'] = (out['ricevere_%'] - out['lasciare_%']).round(1)
    print(out.to_string())
    out.to_csv(outdir / 'nlp_words.csv')

    arr = np.array([r_cnt.values, l_cnt.values])
    arr = arr[:, arr.sum(axis=0) > 0]
    chi2, p, dof, _ = stats.chi2_contingency(arr)
    print(f"\nChi-quadro asimmetria globale: chi2={chi2:.2f}, dof={dof}, p={p:.6f}")


# =============================================================================
# 4. MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Data Map — analisi statistica del questionario Minimetrò")
    parser.add_argument('--data', type=Path,
                        default=Path(__file__).parent.parent / 'dati.csv')
    parser.add_argument('--output', type=Path,
                        default=Path(__file__).parent / 'output')
    args = parser.parse_args()

    if not args.data.exists():
        raise SystemExit(f"File dati non trovato: {args.data}")
    args.output.mkdir(parents=True, exist_ok=True)

    print(f"Caricamento dati: {args.data}")
    df = load_data(args.data)
    print(f"Caricate {len(df)} righe, {len(df.columns)} colonne.")

    section_descriptive(df, args.output)
    section_group_tests(df, args.output)
    section_capolinea_distance(df, args.output)
    section_correlations(df, args.output)
    section_categorical(df, args.output)
    section_temporal(df, args.output)
    section_nlp(df, args.output)

    print(f"\n{'=' * 70}")
    print(f"FINE. Tutti gli output in: {args.output}")
    print(f"{'=' * 70}")


if __name__ == '__main__':
    main()
