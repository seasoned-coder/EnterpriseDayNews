// Formatting screen time and results (issue #40). Plain functions, so they're easy to test.
import { api } from "@/lib/api";

/** 45 → "45 s", 260 → "4 min 20 s", 3900 → "1 h 5 min". */
export function formatScreenTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) {
    const rest = s % 60;
    return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours} h ${restMinutes} min` : `${hours} h`;
}

/** "Shown 3 times", "Shown once", "Not shown yet". */
export function formatPlays(plays: number): string {
  if (plays === 0) return "Not shown yet";
  return plays === 1 ? "Shown once" : `Shown ${plays} times`;
}

/** Cost per minute on screen, or a dash before it's been shown. */
export const formatValue = (costPerMinute: number | null) => (costPerMinute === null ? "–" : costPerMinute.toFixed(1));

/**
 * Opens the projector in a new tab with a key, so it records what it shows. The tab is opened straight away
 * (browsers block pop-ups opened after waiting for the server), then pointed at the projector. Without a key
 * it still opens the projector, which then plays but doesn't record.
 */
export async function openProjectorWithKey(open: typeof window.open = window.open.bind(window)): Promise<void> {
  const tab = open("about:blank", "_blank");
  let url = "/projector";
  try {
    const { key } = await api.projectorKey();
    url = `/projector#key=${encodeURIComponent(key)}`;
  } finally {
    if (tab) tab.location.href = url;
  }
}
