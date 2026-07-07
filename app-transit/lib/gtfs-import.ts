import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import type Database from "better-sqlite3";
import { haversineMeters, walkSeconds } from "./geo";

const MAX_TRANSFER_METERS = 500;
const GRID_CELL_DEGREES = 0.01; // ~1km at Italian latitudes, generous vs. the 500m radius

function timeToSeconds(hms: string): number {
  const [h, m, s] = hms.trim().split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

interface StopRow {
  stop_id: string;
  stop_lat: number;
  stop_lon: number;
}

/** Computes walking transfers between nearby stops using grid bucketing to avoid O(n^2) on large stop lists. */
function computeTransfers(stops: StopRow[]): { from: string; to: string; seconds: number }[] {
  const grid = new Map<string, StopRow[]>();
  const cellKey = (lat: number, lon: number) =>
    `${Math.floor(lat / GRID_CELL_DEGREES)}:${Math.floor(lon / GRID_CELL_DEGREES)}`;

  for (const s of stops) {
    const key = cellKey(s.stop_lat, s.stop_lon);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(s);
  }

  const transfers: { from: string; to: string; seconds: number }[] = [];
  for (const s of stops) {
    const cellLat = Math.floor(s.stop_lat / GRID_CELL_DEGREES);
    const cellLon = Math.floor(s.stop_lon / GRID_CELL_DEGREES);
    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLon = -1; dLon <= 1; dLon++) {
        const neighbors = grid.get(`${cellLat + dLat}:${cellLon + dLon}`);
        if (!neighbors) continue;
        for (const n of neighbors) {
          if (n.stop_id <= s.stop_id) continue; // dedupe unordered pairs, skip self
          const dist = haversineMeters(s.stop_lat, s.stop_lon, n.stop_lat, n.stop_lon);
          if (dist <= MAX_TRANSFER_METERS) {
            const seconds = walkSeconds(dist);
            transfers.push({ from: s.stop_id, to: n.stop_id, seconds });
            transfers.push({ from: n.stop_id, to: s.stop_id, seconds });
          }
        }
      }
    }
  }
  return transfers;
}

function readCsv(dir: string, filename: string): Record<string, string>[] {
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

/** Extracts a GTFS zip (or uses an already-extracted directory) and loads it into SQLite. */
export function importGtfs(db: Database.Database, sourcePath: string) {
  let gtfsDir = sourcePath;
  let tmpDir: string | null = null;

  const stat = fs.statSync(sourcePath);
  if (stat.isFile()) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gtfs-"));
    new AdmZip(sourcePath).extractAllTo(tmpDir, true);
    gtfsDir = tmpDir;
  }

  try {
    const agencies = readCsv(gtfsDir, "agency.txt");
    const stops = readCsv(gtfsDir, "stops.txt");
    const routes = readCsv(gtfsDir, "routes.txt");
    const trips = readCsv(gtfsDir, "trips.txt");
    const stopTimes = readCsv(gtfsDir, "stop_times.txt");
    const calendar = readCsv(gtfsDir, "calendar.txt");
    const calendarDates = readCsv(gtfsDir, "calendar_dates.txt");

    const insertAll = db.transaction(() => {
      db.exec(
        "DELETE FROM agency; DELETE FROM stops; DELETE FROM routes; DELETE FROM trips; DELETE FROM stop_times; DELETE FROM calendar; DELETE FROM calendar_dates; DELETE FROM transfers;"
      );

      const insAgency = db.prepare(
        "INSERT INTO agency (agency_id, agency_name, agency_url, agency_timezone) VALUES (?, ?, ?, ?)"
      );
      for (const a of agencies) {
        insAgency.run(a.agency_id ?? a.agency_name, a.agency_name, a.agency_url, a.agency_timezone);
      }

      const insStop = db.prepare(
        "INSERT INTO stops (stop_id, stop_name, stop_lat, stop_lon) VALUES (?, ?, ?, ?)"
      );
      for (const s of stops) {
        if (!s.stop_lat || !s.stop_lon) continue;
        insStop.run(s.stop_id, s.stop_name, Number(s.stop_lat), Number(s.stop_lon));
      }

      const insRoute = db.prepare(
        "INSERT INTO routes (route_id, agency_id, route_short_name, route_long_name, route_type, route_color) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const r of routes) {
        insRoute.run(
          r.route_id,
          r.agency_id,
          r.route_short_name,
          r.route_long_name,
          Number(r.route_type ?? 3),
          r.route_color
        );
      }

      const insTrip = db.prepare(
        "INSERT INTO trips (trip_id, route_id, service_id, trip_headsign, direction_id) VALUES (?, ?, ?, ?, ?)"
      );
      for (const t of trips) {
        insTrip.run(
          t.trip_id,
          t.route_id,
          t.service_id,
          t.trip_headsign ?? null,
          t.direction_id !== undefined && t.direction_id !== "" ? Number(t.direction_id) : null
        );
      }

      const insStopTime = db.prepare(
        "INSERT INTO stop_times (trip_id, stop_id, stop_sequence, arrival_seconds, departure_seconds) VALUES (?, ?, ?, ?, ?)"
      );
      for (const st of stopTimes) {
        if (!st.arrival_time || !st.departure_time) continue;
        insStopTime.run(
          st.trip_id,
          st.stop_id,
          Number(st.stop_sequence),
          timeToSeconds(st.arrival_time),
          timeToSeconds(st.departure_time)
        );
      }

      const insCalendar = db.prepare(
        `INSERT INTO calendar (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const c of calendar) {
        insCalendar.run(
          c.service_id,
          Number(c.monday),
          Number(c.tuesday),
          Number(c.wednesday),
          Number(c.thursday),
          Number(c.friday),
          Number(c.saturday),
          Number(c.sunday),
          c.start_date,
          c.end_date
        );
      }

      const insCalendarDate = db.prepare(
        "INSERT INTO calendar_dates (service_id, date, exception_type) VALUES (?, ?, ?)"
      );
      for (const cd of calendarDates) {
        insCalendarDate.run(cd.service_id, cd.date, Number(cd.exception_type));
      }

      const stopRows: StopRow[] = stops
        .filter((s) => s.stop_lat && s.stop_lon)
        .map((s) => ({ stop_id: s.stop_id, stop_lat: Number(s.stop_lat), stop_lon: Number(s.stop_lon) }));
      const transferPairs = computeTransfers(stopRows);
      const insTransfer = db.prepare(
        "INSERT INTO transfers (from_stop_id, to_stop_id, seconds) VALUES (?, ?, ?)"
      );
      for (const t of transferPairs) {
        insTransfer.run(t.from, t.to, t.seconds);
      }
    });

    insertAll();

    return {
      agencies: agencies.length,
      stops: stops.length,
      routes: routes.length,
      trips: trips.length,
      stopTimes: stopTimes.length,
    };
  } finally {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
