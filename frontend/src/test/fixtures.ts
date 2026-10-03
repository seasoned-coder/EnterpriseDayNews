import type { ApiSubmission } from "@/lib/api";

let nextId = 1000;

/** A complete ApiSubmission for tests (an approved, displayed student advert); override what matters. */
export function makeSubmission(overrides: Partial<ApiSubmission> = {}): ApiSubmission {
  return {
    id: nextId++,
    filePath: "advert.jpg",
    originalFileName: "advert.jpg",
    uploadedBy: "year10-team1",
    uploadedAt: "2026-10-03T10:00:00Z",
    status: "APPROVED",
    vettedBy: "staff",
    vettedAt: null,
    display: true,
    publishOnApproval: true,
    displayOrder: 0,
    priority: 1,
    durationSeconds: 10,
    totalCost: 10,
    isInfoMessage: false,
    isFlashMode: false,
    messageText: null,
    ...overrides,
  };
}
