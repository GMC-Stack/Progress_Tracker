import { NextResponse } from "next/server";
import { evaluateCompensation } from "@/lib/compensation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const planned = body?.plannedArrivalSeconds;
  const actual = body?.actualArrivalSeconds;

  if (typeof planned !== "number" || typeof actual !== "number" || planned < 0 || actual < 0) {
    return NextResponse.json(
      { error: "Servono 'plannedArrivalSeconds' e 'actualArrivalSeconds' (secondi da mezzanotte)." },
      { status: 400 }
    );
  }

  return NextResponse.json({ result: evaluateCompensation(planned, actual) });
}
