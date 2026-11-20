import { NWCClient } from "@getalby/sdk/nwc";
import { withNwc } from "./nwc";
import { msatsToSats } from "../units";
import { UserError } from "./errors";
import { DEMO_MODE } from "../config";

const RECEIVE_REQUIRED = ["make_invoice", "lookup_invoice", "make_hold_invoice", "settle_hold_invoice", "cancel_hold_invoice"];
const SPEND = ["pay_invoice", "pay_keysend", "multi_pay_invoice", "multi_pay_keysend"];
const allowFullTest = () => process.env.ALLOW_TEST_FULL_ACCESS_NWC === "1";

function parse(uri: string) {
  try { NWCClient.parseWalletConnectUrl(uri); } catch { throw new UserError("That doesn't look like a wallet connection string. Copy it again from your wallet.", 400, "BAD_URI"); }
}

export async function verifyReceiveConnection(uri: string) {
  if (DEMO_MODE) return { methods: RECEIVE_REQUIRED, warning: "DEMO mode: connection not checked." };
  parse(uri);
  let methods: string[];
  try { methods = await withNwc(uri, async (c) => (await c.getInfo()).methods as string[]); }
  catch { throw new UserError("We couldn't reach your wallet with that connection. Check your wallet is online and try again.", 502, "UNREACHABLE"); }
  const missing = RECEIVE_REQUIRED.filter((m) => !methods.includes(m));
  if (missing.length) throw new UserError(`This connection is missing permissions: ${missing.join(", ")}. Create a connection with "Receive" + hold invoice permissions.`, 400, "MISSING_PERMS");
  const spends = SPEND.filter((m) => methods.includes(m));
  let warning: string | undefined;
  if (spends.length) {
    if (!allowFullTest()) throw new UserError("This connection can SPEND money. For safety, connection A must be receive-only. Create a new connection without “Send payments”.", 400, "CAN_SPEND");
    warning = "TEST WALLET: this faucet connection can also spend. Allowed only because ALLOW_TEST_FULL_ACCESS_NWC=1. Never do this with a real wallet.";
  }
  return { methods, warning };
}

export async function verifyRefundConnection(uri: string) {
  if (DEMO_MODE) return { methods: ["pay_invoice"], budget: null, warning: "DEMO mode: connection not checked." };
  parse(uri);
  try {
    return await withNwc(uri, async (c) => {
      const info = await c.getInfo();
      const methods = info.methods as string[];
      if (!methods.includes("pay_invoice")) throw new UserError("Connection B needs the “Send payments” (pay_invoice) permission so refunds can go out.", 400, "MISSING_PERMS");
      let budget: { usedSats: number; totalSats: number; renewal: string } | null = null;
      if (methods.includes("get_budget")) {
        const b = await c.getBudget().catch(() => ({}));
        if ("total_budget" in b) budget = { usedSats: msatsToSats(b.used_budget), totalSats: msatsToSats(b.total_budget), renewal: b.renewal_period };
      }
      return { methods, budget, warning: budget ? undefined : "No budget limit detected. Set a daily budget (we suggest 20,000 sats) on this connection in your wallet." };
    });
  } catch (e) {
    if (e instanceof UserError) throw e;
    throw new UserError("We couldn't reach your wallet with that connection. Check your wallet is online and try again.", 502, "UNREACHABLE");
  }
}
