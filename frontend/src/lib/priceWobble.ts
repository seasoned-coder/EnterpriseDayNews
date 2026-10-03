// Describing a price wobble (issue #41) in words students get straight away. Plain functions for testing.

/** 50 → "Half price!", 75 → "25% off!", 200 → "Prices doubled!", 150 → "Prices up 50%!". */
export function wobbleHeadline(percent: number): string {
  if (percent === 100) return "Normal prices";
  if (percent === 50) return "Half price!";
  if (percent < 100) return `${100 - percent}% off!`;
  if (percent === 200) return "Prices doubled!";
  if (percent === 300) return "Prices tripled!";
  return `Prices up ${percent - 100}%!`;
}

/**
 * A short note on the prices an advert was uploaded at (issue #47): "half price", "25% off", "×2",
 * "up 50%", or null at normal prices.
 */
export function priceNote(percent: number | undefined): string | null {
  if (!percent || percent === 100) return null;
  if (percent === 50) return "half price";
  if (percent < 100) return `${100 - percent}% off`;
  if (percent % 100 === 0) return `×${percent / 100}`;
  return `up ${percent - 100}%`;
}

/** "until 12:45" for a time today, or nothing when there's no end time. */
export function untilText(endsAt: string | null): string {
  if (!endsAt) return "";
  const time = new Date(endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `until ${time}`;
}

/** "12:30" from a time input → that time today as an ISO timestamp (null if empty). */
export function todayAt(time: string, now = new Date()): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const at = new Date(now);
  at.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return at.toISOString();
}

/** Quick choices for staff. */
export const WOBBLE_PRESETS = [
  { percent: 50, label: "Half price" },
  { percent: 75, label: "25% off" },
  { percent: 150, label: "Up 50%" },
  { percent: 200, label: "Double" },
] as const;
