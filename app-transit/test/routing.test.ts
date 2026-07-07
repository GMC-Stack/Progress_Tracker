import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import type Database from "better-sqlite3";
import { openFreshDb } from "../lib/db";
import { importGtfs } from "../lib/gtfs-import";
import { planJourney } from "../lib/routing";

const FIXTURE_DIR = path.join(__dirname, "fixtures", "mini-gtfs");
const TEST_DATE = "20260706"; // a Monday
const DEPARTURE = 7 * 3600; // 07:00, before any scheduled trip

describe("planJourney", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openFreshDb(":memory:");
    importGtfs(db, FIXTURE_DIR);
  });

  it("finds a direct itinerary with no transfers (A -> C)", () => {
    const results = planJourney(db, {
      from: { stopId: "A" },
      to: { stopId: "C" },
      date: TEST_DATE,
      departureSeconds: DEPARTURE,
    });

    expect(results.length).toBeGreaterThan(0);
    const best = results[results.length - 1];
    expect(best.transfers).toBe(0);
    const transitLegs = best.legs.filter((l) => l.mode === "TRANSIT");
    expect(transitLegs).toHaveLength(1);
    expect(transitLegs[0].routeShortName).toBe("1");
    expect(best.arrivalSeconds).toBe(8 * 3600 + 10 * 60); // 08:10
  });

  it("finds an itinerary with one transfer (A -> D)", () => {
    const results = planJourney(db, {
      from: { stopId: "A" },
      to: { stopId: "D" },
      date: TEST_DATE,
      departureSeconds: DEPARTURE,
    });

    expect(results.length).toBeGreaterThan(0);
    const best = results[results.length - 1];
    expect(best.transfers).toBe(1);
    const transitLegs = best.legs.filter((l) => l.mode === "TRANSIT");
    expect(transitLegs).toHaveLength(2);
    expect(transitLegs[0].routeShortName).toBe("1");
    expect(transitLegs[1].routeShortName).toBe("2");
    expect(best.arrivalSeconds).toBe(8 * 3600 + 20 * 60); // 08:20
  });

  it("returns no itinerary when the destination is unreachable", () => {
    const results = planJourney(db, {
      from: { stopId: "A" },
      to: { stopId: "E" },
      date: TEST_DATE,
      departureSeconds: DEPARTURE,
    });

    expect(results).toHaveLength(0);
  });

  it("does not board a trip that departed before the requested time", () => {
    // A -> D is far enough that the walk-only fallback does not kick in,
    // so this only succeeds if a transit itinerary is found.
    const results = planJourney(db, {
      from: { stopId: "A" },
      to: { stopId: "D" },
      date: TEST_DATE,
      departureSeconds: 9 * 3600, // 09:00, after both trips already left
    });

    expect(results).toHaveLength(0);
  });
});
