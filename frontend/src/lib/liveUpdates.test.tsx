import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isConnected,
  pollEvery,
  resetLiveUpdatesForTests,
  SAFETY_NET_MS,
  SILENCE_MS,
  subscribe,
  useLiveRefresh,
} from "@/lib/liveUpdates";

/** Just enough of EventSource to drive the module. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  handlers = new Map<string, () => void>();
  onerror: (() => void) | null = null;
  closed = false;
  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(name: string, handler: () => void) {
    this.handlers.set(name, handler);
  }
  emit(name: string) {
    this.handlers.get(name)?.();
  }
  close() {
    this.closed = true;
  }
}

const latest = () => FakeEventSource.instances.at(-1)!;

describe("live updates (issue #43)", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    resetLiveUpdatesForTests();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("opens one shared stream and passes on which topic changed", () => {
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = subscribe(first);
    subscribe(second);

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latest().url).toBe("/api/events");
    latest().emit("hello");
    expect(isConnected()).toBe(true);

    latest().emit("adverts");
    expect(first).toHaveBeenCalledWith("adverts");
    expect(second).toHaveBeenCalledWith("adverts");

    stopFirst();
    latest().emit("prices");
    expect(first).not.toHaveBeenCalledWith("prices");
    expect(second).toHaveBeenCalledWith("prices");
  });

  it("closes the stream when nothing is listening", () => {
    const stop = subscribe(vi.fn());
    stop();

    expect(latest().closed).toBe(true);
    expect(isConnected()).toBe(false);
  });

  it("counts as disconnected on an error (the browser retries by itself)", () => {
    subscribe(vi.fn());
    latest().emit("hello");

    latest().onerror?.();

    expect(isConnected()).toBe(false);
  });

  it("starts again if the stream goes quiet (e.g. the Wi-Fi dropped without an error)", () => {
    vi.useFakeTimers();
    subscribe(vi.fn());
    const first = latest();
    first.emit("hello");

    vi.advanceTimersByTime(SILENCE_MS / 2);
    first.emit("ping"); // still alive
    vi.advanceTimersByTime(SILENCE_MS / 2);
    expect(first.closed).toBe(false);

    vi.advanceTimersByTime(SILENCE_MS + SILENCE_MS / 4);
    expect(first.closed).toBe(true);
    expect(latest()).not.toBe(first);
  });

  it("polls normally when disconnected and only as a safety net when connected", () => {
    expect(pollEvery(false, 10_000)).toBe(10_000);
    expect(pollEvery(true, 10_000)).toBe(SAFETY_NET_MS);
  });

  it("reloads the right queries when their topic changes", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLiveRefresh({ adverts: [["submissions"]], prices: [["prices"]] }), { wrapper });

    expect(result.current).toBe(false);
    await act(async () => latest().emit("hello"));
    expect(result.current).toBe(true);

    await act(async () => latest().emit("prices"));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["prices"] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["submissions"] });
  });
});
