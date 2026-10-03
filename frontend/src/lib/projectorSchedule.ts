import type { ApiSubmission, ProjectorSettings } from "@/lib/api";

/**
 * Decides what the projector shows next. See docs/design-notes.md ("Projector scheduling").
 *
 * - Student adverts play in the order staff set on the Approved tab. Within each rotation an advert
 *   appears once per priority point (priority 1 = once, 4 = four times), with repeats spread evenly.
 *   Each appearance lasts the duration the student paid for.
 * - Staff content (Event Communications items that are displayed) slips in between adverts: once at
 *   least `intervalSpeedSeconds` of adverts have played since the last staff item, the next staff item
 *   is shown for `displayDurationSeconds`.
 * - FLASH items replace everything else (the API only returns FLASH items while any are active).
 */

export type ScheduleSettings = Pick<
  ProjectorSettings,
  "intervalSpeedSeconds" | "displayDurationSeconds" | "imageRefreshSeconds"
>;

export const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettings = {
  intervalSpeedSeconds: 60,
  displayDurationSeconds: 10,
  imageRefreshSeconds: 3,
};

export interface ScheduleState {
  advertCursor: number;
  staffCursor: number;
  /** Seconds of student adverts shown since the last staff item. */
  secondsSinceStaff: number;
  /** Staff items slip in *between* adverts, so never two in a row while adverts are waiting. */
  lastWasStaff: boolean;
}

export const INITIAL_SCHEDULE_STATE: ScheduleState = {
  advertCursor: 0,
  staffCursor: 0,
  secondsSinceStaff: 0,
  lastWasStaff: false,
};

const clampPriority = (p: number) => Math.min(4, Math.max(1, Math.round(p || 1)));

export const isStaffItem = (item: ApiSubmission) => item.isInfoMessage;

/**
 * One rotation of student adverts. Each advert gets `priority` evenly spaced slots on a 0..1 timeline,
 * offset per advert so equal-priority adverts keep the staff's order and repeats of the same advert
 * don't land next to each other (including across the wrap into the next rotation, where possible).
 */
export function advertRotation(adverts: ApiSubmission[]): ApiSubmission[] {
  const n = adverts.length;
  const slots: { pos: number; index: number }[] = [];
  adverts.forEach((advert, index) => {
    const weight = clampPriority(advert.priority);
    const phase = (index + 0.5) / n;
    for (let j = 0; j < weight; j++) slots.push({ pos: (j + phase) / weight, index });
  });
  slots.sort((a, b) => a.pos - b.pos || a.index - b.index);
  return slots.map((s) => adverts[s.index]);
}

/** How long an item stays on screen, in seconds. */
export function slideSeconds(item: ApiSubmission, settings: ScheduleSettings): number {
  if (isStaffItem(item)) return settings.displayDurationSeconds;
  return item.durationSeconds > 0 ? item.durationSeconds : settings.displayDurationSeconds;
}

/** Picks the next slide. Returns null when there is nothing to show. */
export function nextSlide(
  items: ApiSubmission[],
  state: ScheduleState,
  settings: ScheduleSettings,
): { item: ApiSubmission | null; state: ScheduleState } {
  const flash = items.filter((i) => i.isFlashMode);
  if (flash.length > 0) {
    return {
      item: flash[state.staffCursor % flash.length],
      state: { ...state, staffCursor: state.staffCursor + 1, secondsSinceStaff: 0, lastWasStaff: true },
    };
  }

  const staff = items.filter(isStaffItem);
  const rotation = advertRotation(items.filter((i) => !isStaffItem(i)));

  const staffDue =
    staff.length > 0 &&
    (rotation.length === 0 ||
      (!state.lastWasStaff && state.secondsSinceStaff >= settings.intervalSpeedSeconds));
  if (staffDue) {
    return {
      item: staff[state.staffCursor % staff.length],
      state: { ...state, staffCursor: state.staffCursor + 1, secondsSinceStaff: 0, lastWasStaff: true },
    };
  }

  if (rotation.length === 0) return { item: null, state };

  const item = rotation[state.advertCursor % rotation.length];
  return {
    item,
    state: {
      ...state,
      advertCursor: state.advertCursor + 1,
      secondsSinceStaff: state.secondsSinceStaff + slideSeconds(item, settings),
      lastWasStaff: false,
    },
  };
}
