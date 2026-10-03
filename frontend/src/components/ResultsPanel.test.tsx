import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamResult } from "@/lib/api";
import { ResultsPanel } from "@/components/ResultsPanel";

const mocks = vi.hoisted(() => ({ eventResults: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { eventResults: mocks.eventResults }, formatRelative: () => "2 min ago" }));

const team = (name: string, spent: number, plays: number, seconds: number, costPerMinute: number | null): TeamResult => ({
  team: name,
  adverts: 2,
  spent,
  plays,
  seconds,
  costPerMinute,
});

// Server order: most screen time first.
const TEAMS = [
  team("rocket-lemonade", 45, 30, 600, 4.5),
  team("pixel-pals", 60, 20, 300, 12),
  team("sock-it", 10, 0, 0, null),
];

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ResultsPanel />
    </QueryClientProvider>,
  );
}

const teamColumn = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1].textContent);

describe("ResultsPanel (issue #40)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
    mocks.eventResults.mockResolvedValue({ teams: TEAMS, lastPlayAt: "2026-10-03T10:00:00Z" });
  });

  afterEach(() => {
    document.body.className = "";
    delete document.body.dataset.printLayout;
    document.head.querySelectorAll("style[data-print-page]").forEach((s) => s.remove());
  });

  it("shows each team's spend, plays, screen time and value, most screen time first", async () => {
    renderPanel();

    expect(await screen.findByText("rocket-lemonade")).toBeInTheDocument();
    expect(teamColumn()).toEqual(["rocket-lemonade", "pixel-pals", "sock-it"]);
    const rocket = screen.getAllByRole("row")[1];
    expect(within(rocket).getByText("10 min")).toBeInTheDocument();
    expect(within(rocket).getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText(/last recorded a showing 2 min ago/)).toBeInTheDocument();
  });

  it("sorts by spend or by best value", async () => {
    renderPanel();
    await screen.findByText("rocket-lemonade");

    fireEvent.click(screen.getByRole("button", { name: "Most spent" }));
    expect(teamColumn()).toEqual(["pixel-pals", "rocket-lemonade", "sock-it"]);

    fireEvent.click(screen.getByRole("button", { name: "Best value" }));
    expect(teamColumn()).toEqual(["rocket-lemonade", "pixel-pals", "sock-it"]); // not shown yet goes last
  });

  it("warns when the projector hasn't recorded anything", async () => {
    mocks.eventResults.mockResolvedValue({ teams: TEAMS, lastPlayAt: null });
    renderPanel();

    expect(await screen.findByText(/No showings recorded yet/)).toBeInTheDocument();
  });

  it("prints the leaderboard as one long till receipt", async () => {
    renderPanel();
    await screen.findByText("rocket-lemonade");

    fireEvent.click(screen.getByRole("button", { name: /leaderboard: till/i }));

    const printed = await screen.findByTestId("print-area");
    expect(within(printed).getByLabelText("Leaderboard receipt")).toBeInTheDocument();
    expect(within(printed).getByText(/Spent 45 · shown 30× · 4.5 per min/)).toBeInTheDocument();
    expect(window.print).toHaveBeenCalled();
    expect(document.body.dataset.printLayout).toBe("receipt-roll");
  });

  it("prints a receipt for every team, with their screen-time ranking", async () => {
    renderPanel();
    await screen.findByText("rocket-lemonade");

    fireEvent.click(screen.getByRole("button", { name: /team receipts: a4/i }));

    const printed = await screen.findByTestId("print-area");
    expect(within(printed).getAllByRole("article")).toHaveLength(3);
    const pixels = within(printed).getByLabelText("Receipt for pixel-pals");
    expect(within(pixels).getByText("2nd of 3")).toBeInTheDocument();
    expect(document.body.dataset.printLayout).toBe("a4-cards");

    window.dispatchEvent(new Event("afterprint"));
    expect(await screen.findByText("rocket-lemonade")).toBeInTheDocument();
    expect(screen.queryByTestId("print-area")).not.toBeInTheDocument();
  });
});
