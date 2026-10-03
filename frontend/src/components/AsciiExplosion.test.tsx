import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AsciiExplosion, EXPLOSION_FRAMES } from "@/components/AsciiExplosion";

describe("AsciiExplosion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("frames are all the same height, so the panel doesn't jump", () => {
    const heights = new Set(EXPLOSION_FRAMES.map((frame) => frame.split("\n").length));
    expect(heights.size).toBe(1);
  });

  it("plays every frame once and then holds the BOOM", () => {
    const { container } = render(<AsciiExplosion />);
    const pre = () => container.querySelector("pre")!;
    const seen = [pre().dataset.frame];

    for (let i = 0; i < EXPLOSION_FRAMES.length + 3; i++) {
      act(() => {
        vi.advanceTimersByTime(300);
      });
      seen.push(pre().dataset.frame);
    }

    expect(new Set(seen).size).toBe(EXPLOSION_FRAMES.length);
    expect(pre().dataset.frame).toBe(String(EXPLOSION_FRAMES.length - 1));
    expect(pre()).toHaveTextContent("B O O M");
  });

  it("still plays when the device asks for reduced motion (it's a brief in-place text swap)", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => ({ matches: query.includes("reduce"), media: query }) as MediaQueryList,
    );

    const { container } = render(<AsciiExplosion />);

    expect(container.querySelector("pre")!.dataset.frame).toBe("0");
  });
});
