/**
 * useNsfwCheck — unit tests
 *
 * We mock nsfwjs and @tensorflow/tfjs so no real model is loaded.
 * Tests run entirely in vitest/jsdom — no real images or GPUs required.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

// Control what the fake model returns
let mockPredictions: { className: string; probability: number }[] = [];

vi.mock("nsfwjs", () => ({
  load: vi.fn(async () => ({
    classify: vi.fn(async () => mockPredictions),
  })),
}));

vi.mock("@tensorflow/tfjs", () => ({}));

// jsdom doesn't implement URL.createObjectURL / revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// Helper: make a fake File whose image onload fires immediately
function makeImageFile(name = "photo.jpg", type = "image/jpeg"): File {
  return new File(["fake-image-bytes"], name, { type });
}

function makeNonImageFile(name = "video.mp4"): File {
  return new File(["fake-video-bytes"], name, { type: "video/mp4" });
}

// Patch HTMLImageElement so onload fires synchronously after src is set
function mockImageLoad(shouldError = false) {
  Object.defineProperty(window.HTMLImageElement.prototype, "src", {
    set(_src: string) {
      if (shouldError) {
        setTimeout(() => this.onerror?.(new Event("error")), 0);
      } else {
        setTimeout(() => this.onload?.(new Event("load")), 0);
      }
    },
    configurable: true,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

// Reset the singleton model cache before each test so each test gets a fresh mock
beforeEach(async () => {
  vi.resetModules();
  mockPredictions = [];
  mockImageLoad();
});

describe("useNsfwCheck", () => {
  it("returns 'clean' for a safe image (all scores below thresholds)", async () => {
    mockPredictions = [
      { className: "Neutral", probability: 0.95 },
      { className: "Drawing", probability: 0.03 },
      { className: "Sexy", probability: 0.01 },
      { className: "Porn", probability: 0.005 },
      { className: "Hentai", probability: 0.005 },
    ];

    const { useNsfwCheck } = await import("@/hooks/useNsfwCheck");
    const { result } = renderHook(() => useNsfwCheck());

    let scanResult: string | undefined;
    await act(async () => {
      scanResult = await result.current.scanFile(makeImageFile());
    });

    expect(scanResult).toBe("clean");
    expect(result.current.scanStatus).toBe("clean");
  });

  it("returns 'flagged' when Porn probability exceeds threshold (≥ 0.50)", async () => {
    mockPredictions = [
      { className: "Neutral", probability: 0.10 },
      { className: "Porn", probability: 0.85 },
      { className: "Sexy", probability: 0.03 },
      { className: "Hentai", probability: 0.01 },
      { className: "Drawing", probability: 0.01 },
    ];

    const { useNsfwCheck } = await import("@/hooks/useNsfwCheck");
    const { result } = renderHook(() => useNsfwCheck());

    let scanResult: string | undefined;
    await act(async () => {
      scanResult = await result.current.scanFile(makeImageFile());
    });

    expect(scanResult).toBe("flagged");
    expect(result.current.scanStatus).toBe("flagged");
  });

  it("returns 'flagged' when Hentai probability exceeds threshold (≥ 0.50)", async () => {
    mockPredictions = [
      { className: "Neutral", probability: 0.05 },
      { className: "Hentai", probability: 0.92 },
      { className: "Porn", probability: 0.02 },
      { className: "Sexy", probability: 0.01 },
      { className: "Drawing", probability: 0.0 },
    ];

    const { useNsfwCheck } = await import("@/hooks/useNsfwCheck");
    const { result } = renderHook(() => useNsfwCheck());

    let scanResult: string | undefined;
    await act(async () => {
      scanResult = await result.current.scanFile(makeImageFile());
    });

    expect(scanResult).toBe("flagged");
  });

  it("returns 'flagged' when Sexy probability exceeds threshold (≥ 0.70)", async () => {
    mockPredictions = [
      { className: "Neutral", probability: 0.20 },
      { className: "Sexy", probability: 0.75 },
      { className: "Porn", probability: 0.03 },
      { className: "Hentai", probability: 0.01 },
      { className: "Drawing", probability: 0.01 },
    ];

    const { useNsfwCheck } = await import("@/hooks/useNsfwCheck");
    const { result } = renderHook(() => useNsfwCheck());

    let scanResult: string | undefined;
    await act(async () => {
      scanResult = await result.current.scanFile(makeImageFile());
    });

    expect(scanResult).toBe("flagged");
  });

  it("returns 'clean' when Sexy is high but below the 0.70 threshold", async () => {
    mockPredictions = [
      { className: "Neutral", probability: 0.35 },
      { className: "Sexy", probability: 0.65 }, // just under threshold
      { className: "Porn", probability: 0.0 },
      { className: "Hentai", probability: 0.0 },
      { className: "Drawing", probability: 0.0 },
    ];

    const { useNsfwCheck } = await import("@/hooks/useNsfwCheck");
    const { result } = renderHook(() => useNsfwCheck());

    let scanResult: string | undefined;
    await act(async () => {
      scanResult = await result.current.scanFile(makeImageFile());
    });

    expect(scanResult).toBe("clean");
  });

  it("skips scanning and returns 'clean' for non-image files (videos, PDFs)", async () => {
    const { useNsfwCheck } = await import("@/hooks/useNsfwCheck");
    const { result } = renderHook(() => useNsfwCheck());

    let scanResult: string | undefined;
    await act(async () => {
      scanResult = await result.current.scanFile(makeNonImageFile());
    });

    expect(scanResult).toBe("clean");
    expect(result.current.scanStatus).toBe("clean");
  });

  it("fails open (returns 'clean') if the model throws an error", async () => {
    // Override the mock so the image fails to load
    mockImageLoad(true);

    const { useNsfwCheck } = await import("@/hooks/useNsfwCheck");
    const { result } = renderHook(() => useNsfwCheck());

    let scanResult: string | undefined;
    await act(async () => {
      scanResult = await result.current.scanFile(makeImageFile());
    });

    // Should NOT block the upload on a scan error
    expect(scanResult).toBe("clean");
    expect(result.current.scanStatus).toBe("clean");
  });

  it("resetScan sets status back to 'idle'", async () => {
    mockPredictions = [{ className: "Neutral", probability: 1.0 }];

    const { useNsfwCheck } = await import("@/hooks/useNsfwCheck");
    const { result } = renderHook(() => useNsfwCheck());

    await act(async () => {
      await result.current.scanFile(makeImageFile());
    });
    expect(result.current.scanStatus).toBe("clean");

    act(() => result.current.resetScan());
    expect(result.current.scanStatus).toBe("idle");
  });

  it("DEV mode: flags any file whose name contains '__flag__' without running the model", async () => {
    // Ensure we're in DEV mode (vitest runs with import.meta.env.DEV = true by default)
    const { useNsfwCheck } = await import("@/hooks/useNsfwCheck");
    const { result } = renderHook(() => useNsfwCheck());

    const devFile = makeImageFile("my_photo__flag__.jpg");

    let scanResult: string | undefined;
    await act(async () => {
      scanResult = await result.current.scanFile(devFile);
    });

    expect(scanResult).toBe("flagged");
    expect(result.current.scanStatus).toBe("flagged");
  });
});

