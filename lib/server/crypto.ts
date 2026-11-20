import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

function key(): Buffer {
  const k = process.env.ENCRYPTION_KEY;
  if (!k) throw new Error("ENCRYPTION_KEY missing");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes base64");
  return buf;
}

/** AES-256-GCM. Output: base64(iv | tag | ciphertext). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
export function decrypt(blob: string): string {
  const b = Buffer.from(blob, "base64");
  const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}

export const sha256Hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

export function newPreimage() {
  const pre = randomBytes(32);
  return { preimage: pre.toString("hex"), paymentHash: sha256Hex(pre) };
}

export const randomToken = (bytes = 16) => randomBytes(bytes).toString("hex");
export const sixDigitCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export function safeEqualHex(a: string, b: string) {
  const A = Buffer.from(a, "hex"), B = Buffer.from(b, "hex");
  return A.length === B.length && timingSafeEqual(A, B);
}

/** Hash of lowercased Lightning address + server salt (derived from ENCRYPTION_KEY). */
export function clientIdHash(lnAddress: string) {
  return sha256Hex(`client:${lnAddress.trim().toLowerCase()}:${process.env.ENCRYPTION_KEY}`);
}
export const codeHash = (bookingId: string, code: string) => sha256Hex(`checkin:${bookingId}:${code}:${process.env.ENCRYPTION_KEY}`);
export const policyHash = (text: string) => sha256Hex(text.normalize("NFC"));
