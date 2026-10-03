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
    localStorage.clear(); // the projector keeps its last feed there (issue #39)
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

  describe("when the server or Wi-Fi blips (issue #39)", () => {
    it("keeps playing the slides it has and shows a subtle OFFLINE MODE label", async () => {
      const a = advert("Alpha", 1, 10);
      const b = advert("Bravo", 1, 10);
      mocks.projectorImages.mockResolvedValue([a, b]);
      renderProjector();
      await tick(0.1);
      expect(currentAlt()).toBe("Alpha submission");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();

      mocks.projectorImages.mockRejectedValue(new Error("Failed to fetch"));
      await tick(3.1);
      expect(screen.queryByRole("status")).not.toBeInTheDocument(); // one blip: not worth showing
      await tick(3);
      expect(screen.getByRole("status")).toHaveTextContent(/offline mode/i);
      await tick(4);
      expect(currentAlt()).toBe("Bravo submission"); // still rotating

      mocks.projectorImages.mockResolvedValue([a, b]);
      await tick(3.1);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("counts a check that never answers as failed, instead of waiting forever", async () => {
      mocks.projectorImages.mockResolvedValue([advert("Alpha", 1, 30)]);
      renderProjector();
      await tick(0.1);

      // The server (or Wi-Fi) has gone: requests just hang until they're given up on.
      mocks.projectorImages.mockImplementation(
        (signal: AbortSignal) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
      );
      for (let s = 0; s < 20; s++) await tick(1); // step by step, so each failed check renders like in a browser

      expect(screen.getByRole("status")).toHaveTextContent(/offline mode/i);
      expect(currentAlt()).toBe("Alpha submission");
    });

    it("carries on from the last feed after a reload while offline", async () => {
      mocks.projectorImages.mockResolvedValue([advert("Alpha")]);
      const first = renderProjector();
      await tick(0.1);
      first.unmount();

      mocks.projectorImages.mockRejectedValue(new Error("Failed to fetch"));
      renderProjector();
      await tick(0.1);

      expect(currentAlt()).toBe("Alpha submission");
    });

    it("shows a calm 'Back shortly' screen when it has nothing to play", async () => {
      mocks.projectorImages.mockRejectedValue(new Error("Failed to fetch"));
      renderProjector();
      await tick(0.1);

      expect(screen.getByText("Back shortly")).toBeInTheDocument();
      expect(screen.queryByText(/error|failed/i)).not.toBeInTheDocument();

      // It stays calm while it keeps trying (no flicking back to "Loading the feed…").
      await tick(3.1);
      expect(screen.getByText("Back shortly")).toBeInTheDocument();
      expect(screen.queryByText(/Loading the feed/)).not.toBeInTheDocument();
    });

    it("skips a slide whose picture won't load instead of showing it broken", async () => {
      const a = advert("Alpha", 1, 30);
      const b = advert("Bravo", 1, 30);
      mocks.projectorImages.mockResolvedValue([a, b]);
      renderProjector();
      await tick(0.1);
      expect(currentAlt()).toBe("Alpha submission");

      const img = screen.getByTestId("current-slide").querySelector("img") as HTMLImageElement;
      await act(async () => {
        img.dispatchEvent(new Event("error"));
      });

      expect(currentAlt()).toBe("Bravo submission");
    });
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
