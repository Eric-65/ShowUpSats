import { origin } from "./request";
export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
/** Must exactly match an "Authorized redirect URI" in Google Cloud. */
export async function redirectUri() {
  return `${process.env.APP_URL?.replace(/\/$/, "") || (await origin())}/api/auth/google/callback`;
}
