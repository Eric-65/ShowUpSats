import "./ws-polyfill";
import { NWCClient } from "@getalby/sdk/nwc";
import { NWC_TIMEOUT_MS } from "../config";

export function withTimeout<T>(p: Promise<T>, ms = NWC_TIMEOUT_MS, label = "nwc"): Promise<T> {
  let t: NodeJS.Timeout;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise<T>((_, rej) => { t = setTimeout(() => rej(Object.assign(new Error(`${label} timed out`), { code: "TIMEOUT" })), ms); }),
  ]);
}

/** Run fn with a short-lived client and always close it. */
export async function withNwc<T>(uri: string, fn: (c: NWCClient) => Promise<T>): Promise<T> {
  const c = new NWCClient({ nostrWalletConnectUrl: uri });
  try {
    return await withTimeout(fn(c));
  } finally {
    c.close();
  }
}

export function nwcErrorCode(e: unknown): string {
  const any = e as { code?: string; message?: string };
  return any?.code || (any?.message ?? "UNKNOWN");
}

/** Treat "already settled/cancelled/not found" as success for idempotent sweeps. */
export function isIdempotentOk(e: unknown) {
  const s = `${(e as { code?: string })?.code ?? ""} ${(e as Error)?.message ?? ""}`.toLowerCase();
  return /not_found|not found|already|settled|cancel/.test(s);
}
