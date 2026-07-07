# DoveVado

Base per un pianificatore di percorsi di trasporto pubblico "tipo JakDojade", per l'Italia — MVP con Milano come città pilota.

## Cosa fa

- Cerca una fermata di partenza e una di arrivo (autocomplete).
- Calcola il percorso migliore con i mezzi pubblici (metro/tram/bus), inclusi i cambi.
- Mostra l'itinerario su una mappa (Leaflet + OpenStreetMap) con le tappe colorate per linea.

Non incluso in questo MVP (vedi "Prossimi passi"): orari in tempo reale, biglietti, altre città.

## Stack

- **Next.js 16 (App Router) + TypeScript**, frontend e API nello stesso progetto.
- **SQLite** (`better-sqlite3`) per i dati GTFS statici — nessun DB server da gestire.
- **Motore di routing proprio**, tipo RAPTOR semplificato (`lib/routing.ts`), che opera direttamente sulle tabelle SQLite: niente OpenTripPlanner o altri servizi Java.
- **Leaflet / react-leaflet** per la mappa.
- **Vitest** per i test del motore di routing.

## Struttura

```
app/
  api/stops/search/route.ts   # autocomplete fermate
  api/plan/route.ts           # pianificazione percorso
  page.tsx                    # UI principale
components/                   # form di ricerca, lista itinerari, mappa
lib/
  db.ts            # connessione SQLite + schema
  gtfs-import.ts   # parsing GTFS -> SQLite (incluso calcolo trasferimenti a piedi tra fermate vicine)
  routing.ts       # motore di pianificazione (RAPTOR semplificato)
  geo.ts           # haversine, tempi di cammino
scripts/import-gtfs.ts        # CLI di import
data/sample-milano-gtfs/      # dataset di esempio (vedi sotto)
test/                         # fixture GTFS sintetica + test del motore di routing
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

- Orari in tempo reale (GTFS-RT).
- Mappa completa di tutte le linee/fermate (oggi si mostra solo l'itinerario cercato).
- Account utente e biglietti.
- Altre città italiane (la struttura dati/import è pensata per essere riusabile: basta un altro feed GTFS).
