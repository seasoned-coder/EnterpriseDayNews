// The projector's last good feed and settings, kept in the browser (issue #39), so it can carry on playing
// after a reload while the server or Wi-Fi is down. Storage can be unavailable or full: never let that break
// the projector.
import type { ApiSubmission, ProjectorSettings } from "@/lib/api";

const FEED_KEY = "projector.lastFeed";
const SETTINGS_KEY = "projector.lastSettings";

function load<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: carry on without it.
  }
}

/**
 * Gives up on a projector request after `ms` (or when the query is cancelled). A dropped Wi-Fi link or a
 * stopped backend can leave a request hanging for minutes, and no new check starts while one is pending.
 */
export function withTimeout<T>(ms: number, request: (signal: AbortSignal) => Promise<T>, outer?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("The server took too long to answer")), ms);
  outer?.addEventListener("abort", () => controller.abort(outer.reason));
  return request(controller.signal).finally(() => clearTimeout(timer));
}

export const loadLastFeed = () => {
  const feed = load<ApiSubmission[]>(FEED_KEY);
  return Array.isArray(feed) ? feed : undefined;
};
export const saveLastFeed = (feed: ApiSubmission[]) => save(FEED_KEY, feed);
export const loadLastSettings = () => load<ProjectorSettings>(SETTINGS_KEY);
export const saveLastSettings = (settings: ProjectorSettings) => save(SETTINGS_KEY, settings);
