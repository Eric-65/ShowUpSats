/**
 * Node's native WebSocket ignores HTTPS_PROXY. In sandboxed/dev environments that
 * require an egress proxy we swap in `ws` with a proxy agent. On Vercel no proxy is
 * set, so this is a no-op and the native WebSocket is used.
 */
import WS from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";

const g = globalThis as unknown as { WebSocket?: unknown; __susWsPatched?: boolean };
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy && !g.__susWsPatched) {
  const agent = new HttpsProxyAgent(proxy);
  class ProxiedWS extends WS {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols, { agent });
    }
  }
  g.WebSocket = ProxiedWS;
  g.__susWsPatched = true;
}
export {};
