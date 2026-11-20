import { describe, it, expect } from "vitest";
import { satsToMsats, msatsToSats } from "../lib/units";
describe("units", () => {
  it("converts sats↔msats", () => {
    expect(satsToMsats(100)).toBe(100_000);
    expect(msatsToSats(100_999)).toBe(100);
    expect(msatsToSats(satsToMsats(12345))).toBe(12345);
  });
  it("rejects bad input", () => {
    expect(() => satsToMsats(1.5)).toThrow();
    expect(() => satsToMsats(-1)).toThrow();
    expect(() => msatsToSats(-1)).toThrow();
  });
});
