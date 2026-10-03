// The projector telling the server which adverts it showed, and for how long (issue #40).
//
// It only records with a key that staff give it (by opening the projector from the staff app), so nobody
// else on the Wi-Fi can add plays. Showings are queued and sent in batches; while offline (#39) they're kept
// (also across a reload) and sent once the server is back.
import { API_BASE } from "@/lib/api";

export interface Showing {
  imageId: number;
  seconds: number;
  /** When it came off screen (ISO). */
  playedAt: string;
}

const KEY_STORAGE = "projector.key";
const QUEUE_STORAGE = "projector.unsentPlays";
/** Keep at most this many unsent (about 5 hours of 10-second adverts). */
export const MAX_QUEUE = 2000;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: keep going without it.
  }
}

/**
 * Takes the key from the address the staff app opened (`/projector#key=…`), keeps it, and removes it from
 * the address bar so it isn't left on show. Returns the key in use, if any.
 */
export function adoptProjectorKey(location: Location = window.location, history: History = window.history): string | null {
  const match = /(?:^#|&)key=([^&]+)/.exec(location.hash);
  if (match) {
    write(KEY_STORAGE, decodeURIComponent(match[1]));
    history.replaceState(null, "", location.pathname + location.search);
  }
  return projectorKey();
}

export const projectorKey = (): string | null => read<string | null>(KEY_STORAGE, null);

export function queueShowing(showing: Showing): void {
  if (!projectorKey() || showing.seconds < 1) return;
  const queue = read<Showing[]>(QUEUE_STORAGE, []);
  write(QUEUE_STORAGE, [...queue, showing].slice(-MAX_QUEUE));
}

export const unsentShowings = (): Showing[] => read<Showing[]>(QUEUE_STORAGE, []);

/**
 * Sends what's queued. Kept for later if the server can't be reached; dropped (along with the key) if the key
 * is refused, e.g. the staff member who issued it was locked.
 *
 * @returns how many were sent
 */
export async function sendShowings(fetchImpl: typeof fetch = fetch): Promise<number> {
  const key = projectorKey();
  const batch = unsentShowings().slice(0, 500);
  if (!key || batch.length === 0) return 0;
  let res: Response;
  try {
    res = await fetchImpl(`${API_BASE}/api/projector/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout?.(10_000),
    });
  } catch {
    return 0; // offline: try again next time
  }
  if (res.status === 401 || res.status === 403) {
    write(KEY_STORAGE, null);
    write(QUEUE_STORAGE, null);
    return 0;
  }
  if (!res.ok) return 0;
  // Anything queued while this was being sent stays for next time.
  write(QUEUE_STORAGE, unsentShowings().slice(batch.length));
  return batch.length;
}
