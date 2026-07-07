import path from "node:path";
import { openFreshDb } from "../lib/db";
import { importGtfs } from "../lib/gtfs-import";

async function main() {
  const source = process.argv[2];
  if (!source) {
    console.error("Uso: npm run import-gtfs -- <path-allo-zip-o-cartella-GTFS>");
    console.error(
      "Feed ATM Milano (open data): https://dati.comune.milano.it/dataset/ds929-orari-del-trasporto-pubblico-locale-nel-comune-di-milano-in-formato-gtfs"
    );
    process.exit(1);
  }

  const dbPath = path.join(process.cwd(), "data", "transit.db");
  const db = openFreshDb(dbPath);
  console.log(`Import da ${source} in ${dbPath}...`);
  const stats = importGtfs(db, path.resolve(source));
  console.log("Import completato:", stats);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
