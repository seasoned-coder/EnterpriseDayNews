import { describe, expect, it } from "vitest";
import { todayAt, untilText, wobbleHeadline } from "@/lib/priceWobble";

describe("priceWobble (issue #41)", () => {
  it.each([
    [50, "Half price!"],
    [75, "25% off!"],
    [25, "75% off!"],
    [100, "Normal prices"],
    [150, "Prices up 50%!"],
    [200, "Prices doubled!"],
    [300, "Prices tripled!"],
  ])("%i%% → %s", (percent, text) => {
    expect(wobbleHeadline(percent)).toBe(text);
  });

  it("says until when", () => {
    const end = new Date();
    end.setHours(12, 45, 0, 0);
    expect(untilText(end.toISOString())).toBe("until 12:45");
    expect(untilText(null)).toBe("");
  });

  it("turns a time input into that time today", () => {
    const now = new Date(2026, 9, 3, 9, 30);
    const at = new Date(todayAt("12:05", now) as string);

    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual([2026, 9, 3, 12, 5]);
    expect(todayAt("", now)).toBeNull();
    expect(todayAt("soon", now)).toBeNull();
  });
});
