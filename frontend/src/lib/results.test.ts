import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatPlays, formatScreenTime, formatValue, openProjectorWithKey } from "@/lib/results";

const mocks = vi.hoisted(() => ({ projectorKey: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { projectorKey: mocks.projectorKey } }));

describe("results formatting (issue #40)", () => {
  it.each([
    [0, "0 s"],
    [45, "45 s"],
    [60, "1 min"],
    [260, "4 min 20 s"],
    [3600, "1 h"],
    [3900, "1 h 5 min"],
  ])("%i seconds → %s", (seconds, text) => {
    expect(formatScreenTime(seconds)).toBe(text);
  });

  it("describes plays and value in plain words", () => {
    expect(formatPlays(0)).toBe("Not shown yet");
    expect(formatPlays(1)).toBe("Shown once");
    expect(formatPlays(7)).toBe("Shown 7 times");
    expect(formatValue(null)).toBe("–");
    expect(formatValue(3.25)).toBe("3.3");
  });
});

describe("openProjectorWithKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the tab straight away, then sends it to the projector with its key", async () => {
    const tab = { location: { href: "" } };
    const open = vi.fn().mockReturnValue(tab);
    mocks.projectorKey.mockResolvedValue({ key: "a.b+c" });

    await openProjectorWithKey(open);

    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.location.href).toBe("/projector#key=a.b%2Bc");
  });

  it("still opens the projector (without recording) if the key can't be had", async () => {
    const tab = { location: { href: "" } };
    mocks.projectorKey.mockRejectedValue(new Error("offline"));

    await expect(openProjectorWithKey(vi.fn().mockReturnValue(tab))).rejects.toThrow("offline");
    expect(tab.location.href).toBe("/projector");
  });
});
