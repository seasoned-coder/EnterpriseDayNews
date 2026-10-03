// Team setup and login slips (issue #37): plain functions, so they're easy to test.
import type { EventDetails } from "@/lib/api";

/** Most teams in one go (the server's limit too). */
export const MAX_TEAMS = 200;

/** "team", 3 → team01, team02, team03 (numbers padded so they sort and line up on the slips). */
export function teamNamesFromPattern(prefix: string, count: number, start = 1): string[] {
  const safeCount = Math.max(0, Math.min(MAX_TEAMS, Math.floor(count)));
  const width = Math.max(2, String(start + safeCount - 1).length);
  const base = toUsername(prefix);
  return Array.from({ length: safeCount }, (_, i) => `${base}${String(start + i).padStart(width, "0")}`);
}

/**
 * One team per line (or comma), e.g. company names the students chose: "Rocket Lemonade" → rocket-lemonade.
 * Blank lines are ignored.
 */
export function teamNamesFromList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map(toUsername)
    .filter((name) => name.length > 0);
}

/** A valid username: lower case; spaces become dashes; anything other than letters, digits, . _ - is dropped. */
export function toUsername(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The address students open: the saved one, or else where this staff page is running. */
export function appAddress(details: EventDetails | undefined, origin: string): string {
  return withoutTrailingSlashes(details?.appAddress?.trim() || origin);
}

/** "http://x//" → "http://x". A plain loop: a regex like /\/+$/ can be slow on long runs of slashes. */
export function withoutTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
}

/** Where a slip's QR code goes: the student sign-in page with the team name filled in. */
export function studentLoginUrl(address: string, username: string): string {
  return `${address}/student/login?team=${encodeURIComponent(username)}`;
}

/**
 * Shown next to the QR code, to type if a phone can't scan. Without "http://" (browsers add it): shorter to
 * type, and it fits on one line of a 72 mm slip.
 */
export function studentPortalAddress(address: string): string {
  return `${address.replace(/^https?:\/\//, "")}/student`;
}

/**
 * The text of a "join this Wi-Fi" QR code, understood by iPhone and Android cameras. Special characters
 * are escaped as the format requires. Null when no Wi-Fi name has been saved.
 */
export function wifiQrText(details: EventDetails | undefined): string | null {
  const name = details?.wifiName?.trim();
  if (!name) return null;
  const escape = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");
  const password = details?.wifiPassword?.trim();
  return password
    ? `WIFI:T:WPA;S:${escape(name)};P:${escape(password)};;`
    : `WIFI:T:nopass;S:${escape(name)};;`;
}
