// Live updates (issue #43): one stream per page tells it the moment something changes, so it can reload
// just that data, instead of asking every few seconds. Events carry only a topic name; the data still comes
// from the normal API with its access rules.
//
// While the stream is connected, pages only check in occasionally (a safety net); if it drops (server
// restarting, Wi-Fi blip), the browser reconnects by itself and pages go back to their normal polling.
import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";

export type LiveTopic = "adverts" | "projector-settings" | "prices" | "balances";
const TOPICS: LiveTopic[] = ["adverts", "projector-settings", "prices", "balances"];

/** How often to check anyway while the stream is connected (in case an event was missed). */
export const SAFETY_NET_MS = 60_000;
/** The server pings every 25 s; nothing for this long means the stream has quietly died (e.g. Wi-Fi). */
export const SILENCE_MS = 60_000;

type Listener = (topic: LiveTopic) => void;

let source: EventSource | null = null;
let connected = false;
let users = 0;
let lastHeard = 0;
let watchdog: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();
const statusListeners = new Set<() => void>();

function setConnected(value: boolean) {
  if (connected === value) return;
  connected = value;
  statusListeners.forEach((l) => l());
}

const heard = () => {
  lastHeard = Date.now();
  setConnected(true);
};

function open() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource(`${API_BASE}/api/events`);
  source.addEventListener("hello", heard);
  source.addEventListener("ping", heard);
  source.onerror = () => setConnected(false); // EventSource retries by itself
  for (const topic of TOPICS) {
    source.addEventListener(topic, () => {
      heard();
      listeners.forEach((l) => l(topic));
    });
  }
  // A stream can die without an error (a dropped Wi-Fi link): if the pings stop, start again.
  watchdog ??= setInterval(() => {
    if (connected && Date.now() - lastHeard > SILENCE_MS) {
      close();
      open();
    }
  }, SILENCE_MS / 4);
}

function close() {
  source?.close();
  source = null;
  setConnected(false);
}

function stopWatchdog() {
  if (watchdog) clearInterval(watchdog);
  watchdog = null;
}

/** Calls `onChange` when a topic changes, keeping the shared stream open while anything is listening. */
export function subscribe(onChange: Listener): () => void {
  listeners.add(onChange);
  users += 1;
  open();
  return () => {
    listeners.delete(onChange);
    users -= 1;
    if (users === 0) {
      stopWatchdog();
      close();
    }
  };
}

export const isConnected = () => connected;

/** Whether the live stream is connected (re-renders when that changes). */
export function useLiveConnected(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      statusListeners.add(onChange);
      return () => statusListeners.delete(onChange);
    },
    isConnected,
    () => false,
  );
}

/**
 * Reloads the given queries when their topic changes, e.g.
 * `useLiveRefresh({ adverts: [["submissions"]], prices: [["prices"]] })`.
 * Returns whether the stream is connected, to slow normal polling down to the safety net while it is.
 */
export function useLiveRefresh(map: Partial<Record<LiveTopic, QueryKey[]>>): boolean {
  const queryClient = useQueryClient();
  const key = JSON.stringify(map);
  useEffect(() => {
    const parsed = JSON.parse(key) as Partial<Record<LiveTopic, QueryKey[]>>;
    return subscribe((topic) => {
      for (const queryKey of parsed[topic] ?? []) queryClient.invalidateQueries({ queryKey });
    });
  }, [key, queryClient]);
  return useLiveConnected();
}

/** Normal polling when the stream is down; the safety net when it's up. */
export const pollEvery = (liveConnected: boolean, normalMs: number) =>
  liveConnected ? Math.max(normalMs, SAFETY_NET_MS) : normalMs;

/** For tests: forget the shared stream. */
export function resetLiveUpdatesForTests() {
  stopWatchdog();
  close();
  listeners.clear();
  users = 0;
}
