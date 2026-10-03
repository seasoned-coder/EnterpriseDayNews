import { describe, expect, it } from "vitest";
import type { ApiSubmission } from "@/lib/api";
import {
  advertRotation,
  INITIAL_SCHEDULE_STATE,
  nextSlide,
  slideSeconds,
  type ScheduleSettings,
  type ScheduleState,
} from "@/lib/projectorSchedule";

let nextId = 1;
function advert(name: string, priority = 1, durationSeconds = 10): ApiSubmission {
  return {
    id: nextId++,
    filePath: `${name}.jpg`,
    originalFileName: `${name}.jpg`,
    uploadedBy: name,
    uploadedAt: "2026-10-03T10:00:00Z",
    status: "APPROVED",
    vettedBy: "staff",
    vettedAt: null,
    display: true,
    displayOrder: 0,
    priority,
    durationSeconds,
    totalCost: 0,
    isInfoMessage: false,
    isFlashMode: false,
    messageText: null,
  };
}
const staffItem = (name: string, flash = false): ApiSubmission => ({
  ...advert(name, 4, 10),
  isInfoMessage: true,
  isFlashMode: flash,
});

const settings: ScheduleSettings = { intervalSpeedSeconds: 30, displayDurationSeconds: 15, imageRefreshSeconds: 3 };

/** Runs the scheduler `count` times and returns the names shown. */
function play(items: ApiSubmission[], count: number, s = settings, state: ScheduleState = INITIAL_SCHEDULE_STATE) {
  const shown: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = nextSlide(items, state, s);
    shown.push(r.item?.uploadedBy ?? "-");
    state = r.state;
  }
  return shown;
}

const names = (items: ApiSubmission[]) => items.map((i) => i.uploadedBy);

describe("advertRotation", () => {
  it("follows the staff's order exactly when priorities are equal", () => {
    expect(names(advertRotation([advert("A"), advert("B"), advert("C")]))).toEqual(["A", "B", "C"]);
  });

  it("gives each advert one appearance per priority point", () => {
    const rotation = advertRotation([advert("A", 1), advert("B", 2), advert("C", 4)]);
    const count = (n: string) => names(rotation).filter((x) => x === n).length;
    expect([count("A"), count("B"), count("C")]).toEqual([1, 2, 4]);
  });

  it("spreads repeats so the same advert isn't shown twice in a row, even across rotations", () => {
    const rotation = names(advertRotation([advert("A", 1), advert("B", 1), advert("C", 2)]));
    const twoRotations = [...rotation, ...rotation];
    for (let i = 1; i < twoRotations.length; i++) expect(twoRotations[i]).not.toBe(twoRotations[i - 1]);
  });

  it("clamps out-of-range priorities to 1-4", () => {
    expect(advertRotation([advert("A", 0), advert("B", 9)]).length).toBe(1 + 4);
  });

  it("is empty when there are no adverts", () => {
    expect(advertRotation([])).toEqual([]);
  });
});

describe("slideSeconds", () => {
  it("uses the duration the student paid for", () => {
    expect(slideSeconds(advert("A", 1, 30), settings)).toBe(30);
  });
  it("uses the staff item display time for staff content", () => {
    expect(slideSeconds(staffItem("Info"), settings)).toBe(15);
  });
});

describe("nextSlide", () => {
  it("loops through the advert rotation", () => {
    expect(play([advert("A"), advert("B")], 5)).toEqual(["A", "B", "A", "B", "A"]);
  });

  it("slips staff content in once the interval of advert time has passed", () => {
    // 10s adverts, 30s interval: three adverts, then a staff item.
    const items = [advert("A"), advert("B"), staffItem("Info1"), staffItem("Info2")];
    expect(play(items, 9)).toEqual(["A", "B", "A", "Info1", "B", "A", "B", "Info2", "A"]);
  });

  it("counts the paid duration towards the interval", () => {
    // A 30s advert alone fills the 30s interval.
    expect(play([advert("Long", 1, 30), staffItem("Info")], 4)).toEqual(["Long", "Info", "Long", "Info"]);
  });

  it("shows staff content after every advert when the interval is 0", () => {
    const items = [advert("A"), advert("B"), staffItem("Info")];
    expect(play(items, 4, { ...settings, intervalSpeedSeconds: 0 })).toEqual(["Info", "A", "Info", "B"]);
  });

  it("rotates staff content when there are no adverts", () => {
    expect(play([staffItem("Info1"), staffItem("Info2")], 3)).toEqual(["Info1", "Info2", "Info1"]);
  });

  it("shows only FLASH items while any are active", () => {
    const items = [advert("A"), staffItem("Urgent", true), staffItem("Info")];
    expect(play(items, 3)).toEqual(["Urgent", "Urgent", "Urgent"]);
  });

  it("returns nothing when there is nothing to show", () => {
    expect(nextSlide([], INITIAL_SCHEDULE_STATE, settings).item).toBeNull();
  });
});
