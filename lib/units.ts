/** NIP-47 speaks millisats; the DB stores sats. Convert only at the NWC boundary. */
export function satsToMsats(sats: number): number {
  if (!Number.isInteger(sats) || sats < 0) throw new Error("sats must be a non-negative integer");
  return sats * 1000;
}
export function msatsToSats(msats: number): number {
  if (!Number.isFinite(msats) || msats < 0) throw new Error("msats must be non-negative");
  return Math.floor(msats / 1000);
}
