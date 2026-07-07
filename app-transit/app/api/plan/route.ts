import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { planJourney, type PlanEndpoint } from "@/lib/routing";

function isValidEndpoint(value: unknown): value is PlanEndpoint {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.stopId === "string") return true;
  return typeof v.lat === "number" && typeof v.lon === "number";
}

function toGtfsDate(dateStr: string | undefined): string {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function toSecondsSinceMidnight(timeStr: string | undefined): number {
  if (!timeStr) {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60;
  }
  const [h, m] = timeStr.split(":").map(Number);
  return h * 3600 + (m || 0) * 60;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !isValidEndpoint(body.from) || !isValidEndpoint(body.to)) {
    return NextResponse.json(
      { error: "Richiesta non valida: servono 'from' e 'to' (stopId oppure lat/lon)." },
      { status: 400 }
    );
  }

  const db = getDb();
  const itineraries = planJourney(db, {
    from: body.from,
    to: body.to,
    date: toGtfsDate(body.date),
    departureSeconds: toSecondsSinceMidnight(body.time),
  });

  const seen = new Set<string>();
  const deduped = itineraries.filter((it) => {
    const key = `${it.departureSeconds}-${it.arrivalSeconds}-${it.transfers}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  deduped.sort((a, b) => a.arrivalSeconds - b.arrivalSeconds || a.transfers - b.transfers);

  return NextResponse.json({ itineraries: deduped });
}
