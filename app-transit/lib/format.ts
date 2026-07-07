import type { ItineraryLeg } from "./routing";

export function formatTime(seconds: number): string {
  const s = ((seconds % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 1) return "meno di 1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** GTFS route_type → icona del mezzo. */
export function legIcon(leg: Pick<ItineraryLeg, "mode" | "routeType">): string {
  if (leg.mode === "WALK") return "🚶";
  switch (leg.routeType) {
    case 0:
      return "🚋";
    case 1:
      return "🚇";
    case 2:
      return "🚆";
    default:
      return "🚌";
  }
}

export function legModeName(leg: Pick<ItineraryLeg, "mode" | "routeType">): string {
  if (leg.mode === "WALK") return "A piedi";
  switch (leg.routeType) {
    case 0:
      return "Tram";
    case 1:
      return "Metro";
    case 2:
      return "Treno";
    default:
      return "Bus";
  }
}

export function parseHHMMToSeconds(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 3600 + m * 60;
}
