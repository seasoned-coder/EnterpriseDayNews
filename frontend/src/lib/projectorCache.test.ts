import { afterEach, describe, expect, it, vi } from "vitest";
import { loadLastFeed, loadLastSettings, saveLastFeed, saveLastSettings, withTimeout } from "@/lib/projectorCache";
import { makeSubmission } from "@/test/fixtures";

describe("projectorCache (issue #39)", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("remembers the last feed and settings", () => {
    const feed = [makeSubmission({ uploadedBy: "rocket-lemonade" })];
    saveLastFeed(feed);
    saveLastSettings({ id: "DEFAULT", intervalSpeedSeconds: 60, displayDurationSeconds: 10, imageRefreshSeconds: 3 });

    expect(loadLastFeed()).toEqual(feed);
    expect(loadLastSettings()?.imageRefreshSeconds).toBe(3);
  });

  it("has nothing before the first save, or if what's stored is unreadable", () => {
    expect(loadLastFeed()).toBeUndefined();
    localStorage.setItem("projector.lastFeed", "{not json");
    expect(loadLastFeed()).toBeUndefined();
    localStorage.setItem("projector.lastFeed", '{"not":"a list"}');
    expect(loadLastFeed()).toBeUndefined();
  });

  describe("withTimeout", () => {
    /** A request that never answers, like one to a server that has gone away. */
    const hanging = (signal: AbortSignal) =>
      new Promise<string>((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));

    it("gives up on a request that hangs", async () => {
      vi.useFakeTimers();
      const result = withTimeout(5000, hanging);
      const check = expect(result).rejects.toThrow("took too long");
      await vi.advanceTimersByTimeAsync(5000);
      await check;
      vi.useRealTimers();
    });

    it("passes on a quick answer, and a cancel from outside", async () => {
      await expect(withTimeout(5000, async () => "feed")).resolves.toBe("feed");

      const outer = new AbortController();
      const result = withTimeout(5000, hanging, outer.signal);
      outer.abort(new Error("cancelled"));
      await expect(result).rejects.toThrow("cancelled");
    });
  });

  it("never breaks the projector when storage is full or blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => saveLastFeed([])).not.toThrow();
    expect(loadLastFeed()).toBeUndefined();
  });
});
