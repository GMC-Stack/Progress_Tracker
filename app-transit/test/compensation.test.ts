import { describe, it, expect } from "vitest";
import { evaluateCompensation, ATM_MILANO_RULES } from "../lib/compensation";

const H = 3600;

describe("evaluateCompensation", () => {
  it("is not eligible when the journey arrives on time", () => {
    const result = evaluateCompensation(10 * H, 10 * H);
    expect(result.eligible).toBe(false);
    expect(result.delayMinutes).toBe(0);
    expect(result.tier).toBeNull();
  });

  it("is not eligible when arriving early", () => {
    const result = evaluateCompensation(10 * H, 10 * H - 300);
    expect(result.eligible).toBe(false);
    expect(result.delayMinutes).toBe(0);
  });

  it("is not eligible just below the first threshold (14 min)", () => {
    const result = evaluateCompensation(10 * H, 10 * H + 14 * 60);
    expect(result.eligible).toBe(false);
    expect(result.delayMinutes).toBe(14);
  });

  it("matches the first tier at exactly 15 minutes of delay", () => {
    const result = evaluateCompensation(10 * H, 10 * H + 15 * 60);
    expect(result.eligible).toBe(true);
    expect(result.tier).toEqual(ATM_MILANO_RULES.tiers[0]);
  });

  it("matches the highest tier reached (45 min → biglietto giornaliero)", () => {
    const result = evaluateCompensation(10 * H, 10 * H + 45 * 60);
    expect(result.eligible).toBe(true);
    expect(result.tier).toEqual(ATM_MILANO_RULES.tiers[1]);
  });

  it("handles arrivals past midnight (planned 23:50, actual 00:20)", () => {
    const planned = 23 * H + 50 * 60;
    const actual = 20 * 60; // 00:20 the following day
    const result = evaluateCompensation(planned, actual);
    expect(result.delayMinutes).toBe(30);
    expect(result.eligible).toBe(true);
    expect(result.tier).toEqual(ATM_MILANO_RULES.tiers[1]);
  });
});
