import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ stops: [] });
  }

  const db = getDb();
  const stops = db
    .prepare(
      `SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops
       WHERE stop_name LIKE ? ORDER BY stop_name ASC LIMIT 10`
    )
    .all(`%${query}%`);

  return NextResponse.json({ stops });
}
