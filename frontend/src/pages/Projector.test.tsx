import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiSubmission } from "@/lib/api";
import Projector from "@/pages/Projector";
import { makeSubmission } from "@/test/fixtures";

const mocks = vi.hoisted(() => ({
  projectorImages: vi.fn(),
  projectorSettings: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    projectorImages: mocks.projectorImages,
    projectorSettings: mocks.projectorSettings,
    imageUrl: (item: { filePath: string }) => `/uploads/${item.filePath}`,
  },
}));

const advert = (name: string, priority = 1, durationSeconds = 10): ApiSubmission =>
  makeSubmission({ uploadedBy: name, filePath: `${name}.jpg`, priority, durationSeconds });

function renderProjector() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Projector />
    </QueryClientProvider>,
  );
}

const currentAlt = () => screen.getByTestId("current-slide").querySelector("img")?.getAttribute("alt");
const tick = async (seconds: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(seconds * 1000);
  });
};

describe("Projector", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.projectorSettings.mockResolvedValue({
      id: "DEFAULT",
      intervalSpeedSeconds: 600,
      displayDurationSeconds: 10,
      imageRefreshSeconds: 3,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("plays adverts in staff order for the time each student paid for", async () => {
    const a = advert("Alpha", 1, 10);
    const b = advert("Bravo", 1, 20);
    mocks.projectorImages.mockResolvedValue([a, b]);
    renderProjector();
    await tick(0.1);

    expect(currentAlt()).toBe("Alpha submission");
    await tick(10);
    expect(currentAlt()).toBe("Bravo submission");
    await tick(10); // Bravo paid for 20s: still showing
    expect(currentAlt()).toBe("Bravo submission");
    await tick(10);
    expect(currentAlt()).toBe("Alpha submission");
  });

  it("moves on straight away when staff hide what's on screen", async () => {
    const a = advert("Alpha", 1, 30);
    const b = advert("Bravo", 1, 30);
    mocks.projectorImages.mockResolvedValue([a, b]);
    renderProjector();
    await tick(0.1);
    expect(currentAlt()).toBe("Alpha submission");

    mocks.projectorImages.mockResolvedValue([b]); // Alpha hidden/rejected
    await tick(3.1); // next refresh

    expect(currentAlt()).toBe("Bravo submission");
  });

  it("shows the waiting message when nothing is approved", async () => {
    mocks.projectorImages.mockResolvedValue([]);
    renderProjector();
    await tick(0.1);

    expect(screen.getByText("Waiting for approved adverts…")).toBeInTheDocument();
  });

  it("shows staff text messages without a student name", async () => {
    const info: ApiSubmission = {
      ...advert("staff.member"),
      isInfoMessage: true,
      filePath: "",
      messageText: "Lunch is in the hall",
    };
    mocks.projectorImages.mockResolvedValue([info]);
    renderProjector();
    await tick(0.1);

    expect(screen.getByText("Lunch is in the hall")).toBeInTheDocument();
    expect(screen.queryByText("staff.member")).not.toBeInTheDocument();
    expect(screen.queryByText("Urgent Announcement")).not.toBeInTheDocument();
  });
});
