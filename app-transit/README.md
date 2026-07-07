# DoveVado

Base per un pianificatore di percorsi di trasporto pubblico "tipo JakDojade", per l'Italia — MVP con Milano come città pilota.

## Cosa fa

- Cerca una fermata di partenza e una di arrivo (autocomplete con navigazione da tastiera), con pulsante per invertire la tratta e opzione «📍 La mia posizione» come punto di partenza (geolocalizzazione).
- Calcola i percorsi migliori con i mezzi pubblici (metro/tram/bus), inclusi i cambi; i risultati sono ordinati per orario di arrivo e mostrano una timeline dettagliata tappa per tappa con icone per tipo di mezzo.
- Mostra l'itinerario su una mappa (Leaflet + OpenStreetMap) con le tappe colorate per linea.
- Ricorda le ultime 5 ricerche (localStorage) per rilanciarle con un tocco.
- **Indennizzo per ritardo**: salva un viaggio pianificato («💾 Salva viaggio»), poi in «🎫 I miei viaggi» inserisci l'orario di arrivo effettivo — l'app verifica le soglie della Carta della Mobilità ATM (≥15 min: biglietto ordinario; ≥30 min: biglietto giornaliero) e genera una richiesta di indennizzo precompilata (email o copia negli appunti). Le regole sono per-operatore e configurabili (`lib/compensation.ts`).

Non incluso in questo MVP (vedi "Prossimi passi"): orari in tempo reale, biglietti, altre città. Nota: senza dati real-time il ritardo è dichiarato dall'utente; l'invio della richiesta va completato sui canali ufficiali dell'operatore.

## Stack

- **Next.js 16 (App Router) + TypeScript**, frontend e API nello stesso progetto.
- **SQLite** (`better-sqlite3`) per i dati GTFS statici — nessun DB server da gestire.
- **Motore di routing proprio**, tipo RAPTOR semplificato (`lib/routing.ts`), che opera direttamente sulle tabelle SQLite: niente OpenTripPlanner o altri servizi Java.
- **Leaflet / react-leaflet** per la mappa.
- **Vitest** per i test del motore di routing.

## Struttura

```
app/
  api/stops/search/route.ts        # autocomplete fermate
  api/plan/route.ts                # pianificazione percorso (dedup + ordinamento)
  api/compensation/check/route.ts  # verifica soglie indennizzo
  page.tsx                         # UI principale (tab Cerca / I miei viaggi)
components/                        # form di ricerca, lista itinerari, mappa, i miei viaggi
lib/
  db.ts            # connessione SQLite + schema
  gtfs-import.ts   # parsing GTFS -> SQLite (incluso calcolo trasferimenti a piedi tra fermate vicine)
  routing.ts       # motore di pianificazione (RAPTOR semplificato)
  geo.ts           # haversine, tempi di cammino
  compensation.ts  # regole indennizzo per operatore (default: ATM Milano)
  format.ts        # formattazione orari/durate, icone per route_type
  storage.ts       # viaggi salvati + ricerche recenti (localStorage, useSyncExternalStore)
scripts/import-gtfs.ts        # CLI di import
data/sample-milano-gtfs/      # dataset di esempio (vedi sotto)
test/                         # fixture GTFS sintetica + test routing e indennizzo
```

## Avvio rapido

```bash
npm install
npm run import-gtfs -- data/sample-milano-gtfs   # popola data/transit.db
npm run dev
```

Apri http://localhost:3000, cerca ad es. "Duomo" → "De Angeli".

## Dataset incluso vs. dati reali ATM

**`data/sample-milano-gtfs/` è un dataset di esempio** (alcune fermate reali della M1 più una linea bus fittizia), generato a mano per poter testare l'app end-to-end in ambienti senza accesso a internet completo — questo è infatti quanto accaduto durante lo sviluppo: il sandbox usato per costruire questa base blocca il download da domini esterni (incluso `dati.comune.milano.it`), quindi non è stato possibile scaricare il feed GTFS reale di ATM in fase di sviluppo.

Per usare i **dati reali di ATM Milano** (aggiornati periodicamente da AMAT):

1. Scarica il feed GTFS da: https://dati.comune.milano.it/dataset/ds929-orari-del-trasporto-pubblico-locale-nel-comune-di-milano-in-formato-gtfs
2. Esegui `npm run import-gtfs -- /percorso/al/gtfs.zip` (accetta sia un file `.zip` che una cartella già estratta).

Lo script è identico in entrambi i casi: sostituisce interamente il contenuto di `data/transit.db`.

## Test

```bash
npm run test    # motore di routing su una fixture GTFS sintetica (test/fixtures/mini-gtfs)
npm run lint
npm run build
```

## Prossimi passi (fuori scope per questo MVP)

- Orari in tempo reale (GTFS-RT) — sbloccherebbe anche la verifica **automatica** del ritardo per l'indennizzo, oggi dichiarato dall'utente.
- Integrazione con i canali ufficiali dell'operatore per l'invio diretto della richiesta di indennizzo.
- Mappa completa di tutte le linee/fermate (oggi si mostra solo l'itinerario cercato).
- Account utente e biglietti.
- Altre città italiane (la struttura dati/import è pensata per essere riusabile: basta un altro feed GTFS e un oggetto `CompensationRules` per l'operatore locale).
