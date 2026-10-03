import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PricesPanel } from "@/components/PricesPanel";

const mocks = vi.hoisted(() => ({
  priceWobble: vi.fn(),
  setPriceWobble: vi.fn(),
  stopPriceWobble: vi.fn(),
  staffPrices: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api: mocks }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const prices = (percent: number) => ({
  priority: [5, 10, 15, 20].map((c, i) => ({ value: i + 1, cost: Math.max(1, Math.round((c * percent) / 100)) })),
  durationSeconds: [5, 10, 15].map((c, i) => ({ value: (i + 1) * 10, cost: Math.max(1, Math.round((c * percent) / 100)) })),
});

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PricesPanel />
    </QueryClientProvider>,
  );
}

describe("PricesPanel (issue #41)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.priceWobble.mockResolvedValue(undefined);
    mocks.staffPrices.mockImplementation(async (percent: number) => prices(percent));
  });

  it("shows normal prices and previews a change before making it", async () => {
    renderPanel();

    expect(await screen.findByText(/Normal prices/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Double" }));

    const preview = await screen.findByRole("table", { name: "Price preview" });
    await waitFor(() => expect(within(preview).getByText("At 200%")).toBeInTheDocument());
    const priority4 = within(preview).getByText("Priority 4").closest("tr") as HTMLElement;
    await waitFor(() => expect(within(priority4).getByText("40")).toBeInTheDocument());
  });

  it("starts a price change now, with a message", async () => {
    mocks.setPriceWobble.mockResolvedValue({ percent: 50, message: "Quiet-time sale!", startsAt: null, endsAt: null, activeNow: true });
    renderPanel();
    await screen.findByText(/Normal prices/);

    fireEvent.click(screen.getByRole("button", { name: "Half price" }));
    fireEvent.change(screen.getByLabelText(/Message for students/), { target: { value: "Quiet-time sale!" } });
    fireEvent.click(screen.getByRole("button", { name: "Change prices now" }));

    await waitFor(() =>
      expect(mocks.setPriceWobble).toHaveBeenCalledWith({ percent: 50, message: "Quiet-time sale!", startsAt: null, endsAt: null }),
    );
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Prices changed" }));
  });

  it("won't allow a silly percentage", async () => {
    renderPanel();
    await screen.findByText(/Normal prices/);

    fireEvent.change(screen.getByLabelText("Percent of normal price"), { target: { value: "500" } });

    expect(screen.getByText("Choose 25% to 300% of normal.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change prices now/i })).toBeDisabled();
  });

  it("shows a running change and goes back to normal prices", async () => {
    mocks.priceWobble.mockResolvedValue({ percent: 200, message: "Lunchtime rush!", startsAt: null, endsAt: null, activeNow: true });
    mocks.stopPriceWobble.mockResolvedValue(undefined);
    renderPanel();

    expect(await screen.findByText("Prices doubled!")).toBeInTheDocument();
    expect(screen.getByText(/Lunchtime rush!/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /back to normal prices/i }));

    await waitFor(() => expect(mocks.stopPriceWobble).toHaveBeenCalled());
  });
});
