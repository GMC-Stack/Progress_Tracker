import type Database from "better-sqlite3";
import { haversineMeters, walkSeconds } from "./geo";

const MAX_ROUNDS = 5;
const MAX_STOP_CANDIDATES = 5;
const MAX_STOP_DISTANCE_METERS = 1000;
const DIRECT_WALK_MAX_METERS = 1500;
const CANDIDATE_DEPARTURES_PER_STOP = 50;

export type LatLon = { lat: number; lon: number };
export type PlanEndpoint = LatLon | { stopId: string };

export interface PlanRequest {
  from: PlanEndpoint;
  to: PlanEndpoint;
  /** GTFS-style date, e.g. "20260707" */
  date: string;
  /** Departure time as seconds since midnight of `date` */
  departureSeconds: number;
}

export interface ItineraryLeg {
  mode: "WALK" | "TRANSIT";
  fromStopId: string;
  fromStopName: string;
  fromLat: number;
  fromLon: number;
  toStopId: string;
  toStopName: string;
  toLat: number;
  toLon: number;
  departureSeconds: number;
  arrivalSeconds: number;
  routeShortName?: string;
  routeLongName?: string;
  routeColor?: string;
  tripHeadsign?: string;
}

export interface Itinerary {
  legs: ItineraryLeg[];
  departureSeconds: number;
  arrivalSeconds: number;
  transfers: number;
}

interface StopRecord {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

type Parent =
  | {
      type: "transit";
      boardStop: string;
      alightStop: string;
      boardTime: number;
      alightTime: number;
      tripId: string;
      routeId: string;
    }
  | {
      type: "walk";
      fromStop: string;
      toStop: string;
      departTime: number;
      arrivalTime: number;
    };

function isStopId(endpoint: PlanEndpoint): endpoint is { stopId: string } {
  return "stopId" in endpoint;
}

function getActiveServiceIds(db: Database.Database, date: string): Set<string> {
  const dayIndex = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T12:00:00`).getDay();
  const dayColumns = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayColumn = dayColumns[dayIndex];

  const active = new Set<string>();
  const calendarRows = db
    .prepare(
      `SELECT service_id FROM calendar WHERE start_date <= ? AND end_date >= ? AND ${dayColumn} = 1`
    )
    .all(date, date) as { service_id: string }[];
  for (const row of calendarRows) active.add(row.service_id);

  const exceptions = db
    .prepare(`SELECT service_id, exception_type FROM calendar_dates WHERE date = ?`)
    .all(date) as { service_id: string; exception_type: number }[];
  for (const ex of exceptions) {
    if (ex.exception_type === 1) active.add(ex.service_id);
    else if (ex.exception_type === 2) active.delete(ex.service_id);
  }
  return active;
}

function nearestStops(db: Database.Database, point: LatLon): { stop: StopRecord; walk: number }[] {
  const stops = db.prepare("SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops").all() as StopRecord[];
  const withDist = stops
    .map((s) => ({ stop: s, distance: haversineMeters(point.lat, point.lon, s.stop_lat, s.stop_lon) }))
    .filter((s) => s.distance <= MAX_STOP_DISTANCE_METERS)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_STOP_CANDIDATES);
  return withDist.map((s) => ({ stop: s.stop, walk: walkSeconds(s.distance) }));
}

function resolveEndpoint(
  db: Database.Database,
  endpoint: PlanEndpoint
): { candidates: { stop: StopRecord; walk: number }[]; point: LatLon | null } {
  if (isStopId(endpoint)) {
    const stop = db
      .prepare("SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops WHERE stop_id = ?")
      .get(endpoint.stopId) as StopRecord | undefined;
    if (!stop) return { candidates: [], point: null };
    return { candidates: [{ stop, walk: 0 }], point: { lat: stop.stop_lat, lon: stop.stop_lon } };
  }
  return { candidates: nearestStops(db, endpoint), point: endpoint };
}

export function planJourney(db: Database.Database, req: PlanRequest): Itinerary[] {
  const origin = resolveEndpoint(db, req.from);
  const destination = resolveEndpoint(db, req.to);
  if (origin.candidates.length === 0 || destination.candidates.length === 0) return [];

  const destWalkByStop = new Map(destination.candidates.map((c) => [c.stop.stop_id, c.walk]));
  const activeServices = getActiveServiceIds(db, req.date);

  const bestArrival = new Map<string, number>();
  const parent = new Map<string, Parent>();
  const originStopIds = new Set(origin.candidates.map((c) => c.stop.stop_id));

  for (const c of origin.candidates) {
    bestArrival.set(c.stop.stop_id, req.departureSeconds + c.walk);
  }

  const candidateDeparturesStmt = db.prepare(
    `SELECT st.trip_id as trip_id, st.stop_sequence as stop_sequence, st.departure_seconds as departure_seconds,
            t.route_id as route_id, t.service_id as service_id, t.trip_headsign as trip_headsign
     FROM stop_times st JOIN trips t ON t.trip_id = st.trip_id
     WHERE st.stop_id = ? AND st.departure_seconds >= ?
     ORDER BY st.departure_seconds ASC LIMIT ?`
  );
  const restOfTripStmt = db.prepare(
    `SELECT stop_id, stop_sequence, arrival_seconds FROM stop_times
     WHERE trip_id = ? AND stop_sequence > ? ORDER BY stop_sequence ASC`
  );
  const transfersStmt = db.prepare(
    `SELECT to_stop_id, seconds FROM transfers WHERE from_stop_id = ?`
  );

  const itineraries: Itinerary[] = [];
  let bestDestinationArrival = Infinity;

  let marked = new Set(originStopIds);

  for (let round = 1; round <= MAX_ROUNDS && marked.size > 0; round++) {
    const roundStartArrival = new Map(bestArrival);
    const improved = new Set<string>();

    for (const stopId of marked) {
      const boardAfter = roundStartArrival.get(stopId);
      if (boardAfter === undefined) continue;

      const departures = candidateDeparturesStmt.all(stopId, boardAfter, CANDIDATE_DEPARTURES_PER_STOP) as {
        trip_id: string;
        stop_sequence: number;
        departure_seconds: number;
        route_id: string;
        service_id: string;
        trip_headsign: string | null;
      }[];

      const seenRoutes = new Set<string>();
      for (const dep of departures) {
        if (!activeServices.has(dep.service_id)) continue;
        if (seenRoutes.has(dep.route_id)) continue;
        seenRoutes.add(dep.route_id);

        const rest = restOfTripStmt.all(dep.trip_id, dep.stop_sequence) as {
          stop_id: string;
          stop_sequence: number;
          arrival_seconds: number;
        }[];

        for (const stop of rest) {
          const currentBest = bestArrival.get(stop.stop_id) ?? Infinity;
          if (stop.arrival_seconds < currentBest) {
            bestArrival.set(stop.stop_id, stop.arrival_seconds);
            parent.set(stop.stop_id, {
              type: "transit",
              boardStop: stopId,
              alightStop: stop.stop_id,
              boardTime: dep.departure_seconds,
              alightTime: stop.arrival_seconds,
              tripId: dep.trip_id,
              routeId: dep.route_id,
            });
            improved.add(stop.stop_id);
          }
        }
      }
    }

    for (const p of Array.from(improved)) {
      const departTime = bestArrival.get(p)!;
      const transfers = transfersStmt.all(p) as { to_stop_id: string; seconds: number }[];
      for (const t of transfers) {
        const arrival = departTime + t.seconds;
        const currentBest = bestArrival.get(t.to_stop_id) ?? Infinity;
        if (arrival < currentBest) {
          bestArrival.set(t.to_stop_id, arrival);
          parent.set(t.to_stop_id, {
            type: "walk",
            fromStop: p,
            toStop: t.to_stop_id,
            departTime,
            arrivalTime: arrival,
          });
          improved.add(t.to_stop_id);
        }
      }
    }

    marked = improved;

    let roundBestArrival = Infinity;
    let roundBestStop: string | null = null;
    for (const [stopId, walk] of destWalkByStop) {
      const arrival = bestArrival.get(stopId);
      if (arrival === undefined) continue;
      const total = arrival + walk;
      if (total < roundBestArrival) {
        roundBestArrival = total;
        roundBestStop = stopId;
      }
    }

    if (roundBestStop && roundBestArrival < bestDestinationArrival) {
      bestDestinationArrival = roundBestArrival;
      itineraries.push(
        reconstructItinerary(db, roundBestStop, origin, destination, parent, originStopIds, req)
      );
    }
  }

  if (itineraries.length === 0) {
    const direct = directWalkItinerary(origin, destination, req);
    return direct ? [direct] : [];
  }

  return itineraries;
}

function directWalkItinerary(
  origin: ReturnType<typeof resolveEndpoint>,
  destination: ReturnType<typeof resolveEndpoint>,
  req: PlanRequest
): Itinerary | null {
  if (!origin.point || !destination.point) return null;
  const distance = haversineMeters(origin.point.lat, origin.point.lon, destination.point.lat, destination.point.lon);
  if (distance > DIRECT_WALK_MAX_METERS) return null;
  const seconds = walkSeconds(distance);
  return {
    legs: [
      {
        mode: "WALK",
        fromStopId: "origin",
        fromStopName: "Partenza",
        fromLat: origin.point.lat,
        fromLon: origin.point.lon,
        toStopId: "destination",
        toStopName: "Arrivo",
        toLat: destination.point.lat,
        toLon: destination.point.lon,
        departureSeconds: req.departureSeconds,
        arrivalSeconds: req.departureSeconds + seconds,
      },
    ],
    departureSeconds: req.departureSeconds,
    arrivalSeconds: req.departureSeconds + seconds,
    transfers: 0,
  };
}

function reconstructItinerary(
  db: Database.Database,
  destinationStopId: string,
  origin: ReturnType<typeof resolveEndpoint>,
  destination: ReturnType<typeof resolveEndpoint>,
  parent: Map<string, Parent>,
  originStopIds: Set<string>,
  req: PlanRequest
): Itinerary {
  const destinationCandidates = destination.candidates;
  const stopInfoStmt = db.prepare("SELECT stop_name, stop_lat, stop_lon FROM stops WHERE stop_id = ?");
  const routeStmt = db.prepare("SELECT route_short_name, route_long_name, route_color FROM routes WHERE route_id = ?");
  const stopInfoCache = new Map<string, { stop_name: string; stop_lat: number; stop_lon: number }>();
  const stopInfo = (id: string) => {
    if (!stopInfoCache.has(id)) {
      const row = stopInfoStmt.get(id) as { stop_name: string; stop_lat: number; stop_lon: number } | undefined;
      stopInfoCache.set(id, row ?? { stop_name: id, stop_lat: 0, stop_lon: 0 });
    }
    return stopInfoCache.get(id)!;
  };

  const chain: Parent[] = [];
  let cursor = destinationStopId;
  while (!originStopIds.has(cursor)) {
    const p = parent.get(cursor);
    if (!p) break;
    chain.push(p);
    cursor = p.type === "transit" ? p.boardStop : p.fromStop;
  }
  chain.reverse();

  const legs: ItineraryLeg[] = [];

  const originStop = origin.candidates.find((c) => c.stop.stop_id === cursor);
  if (originStop && originStop.walk > 0 && origin.point) {
    legs.push({
      mode: "WALK",
      fromStopId: "origin",
      fromStopName: "Partenza",
      fromLat: origin.point.lat,
      fromLon: origin.point.lon,
      toStopId: originStop.stop.stop_id,
      toStopName: originStop.stop.stop_name,
      toLat: originStop.stop.stop_lat,
      toLon: originStop.stop.stop_lon,
      departureSeconds: req.departureSeconds,
      arrivalSeconds: req.departureSeconds + originStop.walk,
    });
  }

  for (const p of chain) {
    if (p.type === "transit") {
      const route = routeStmt.get(p.routeId) as
        | { route_short_name: string; route_long_name: string; route_color: string }
        | undefined;
      const boardInfo = stopInfo(p.boardStop);
      const alightInfo = stopInfo(p.alightStop);
      legs.push({
        mode: "TRANSIT",
        fromStopId: p.boardStop,
        fromStopName: boardInfo.stop_name,
        fromLat: boardInfo.stop_lat,
        fromLon: boardInfo.stop_lon,
        toStopId: p.alightStop,
        toStopName: alightInfo.stop_name,
        toLat: alightInfo.stop_lat,
        toLon: alightInfo.stop_lon,
        departureSeconds: p.boardTime,
        arrivalSeconds: p.alightTime,
        routeShortName: route?.route_short_name,
        routeLongName: route?.route_long_name,
        routeColor: route?.route_color,
      });
    } else {
      const fromInfo = stopInfo(p.fromStop);
      const toInfo = stopInfo(p.toStop);
      legs.push({
        mode: "WALK",
        fromStopId: p.fromStop,
        fromStopName: fromInfo.stop_name,
        fromLat: fromInfo.stop_lat,
        fromLon: fromInfo.stop_lon,
        toStopId: p.toStop,
        toStopName: toInfo.stop_name,
        toLat: toInfo.stop_lat,
        toLon: toInfo.stop_lon,
        departureSeconds: p.departTime,
        arrivalSeconds: p.arrivalTime,
      });
    }
  }

  const destStop = destinationCandidates.find((c) => c.stop.stop_id === destinationStopId);
  const lastArrival = legs.length > 0 ? legs[legs.length - 1].arrivalSeconds : req.departureSeconds;
  if (destStop && destStop.walk > 0 && destination.point) {
    const destStopInfo = stopInfo(destinationStopId);
    legs.push({
      mode: "WALK",
      fromStopId: destinationStopId,
      fromStopName: destStopInfo.stop_name,
      fromLat: destStopInfo.stop_lat,
      fromLon: destStopInfo.stop_lon,
      toStopId: "destination",
      toStopName: "Arrivo",
      toLat: destination.point.lat,
      toLon: destination.point.lon,
      departureSeconds: lastArrival,
      arrivalSeconds: lastArrival + destStop.walk,
    });
  }

  const transfers = legs.filter((l) => l.mode === "TRANSIT").length - 1;

  return {
    legs,
    departureSeconds: req.departureSeconds,
    arrivalSeconds: legs.length > 0 ? legs[legs.length - 1].arrivalSeconds : req.departureSeconds,
    transfers: Math.max(0, transfers),
  };
}
