import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamAccount } from "@/lib/api";
import { InvoicesPanel } from "@/components/InvoicesPanel";

const mocks = vi.hoisted(() => ({ invoices: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: mocks }));

const account = (team: string, owed: number): TeamAccount => ({
  balance: { team, charged: owed, credited: 0, paid: 0, owed, advertsUploaded: 1, advertsCharged: 1 },
  entries: [{ kind: "CHARGE", amount: owed, description: "Approved: a.png (priority 1, 10 s)", at: "2026-10-03T10:00:00Z", recordedBy: "x" }],
});

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InvoicesPanel />
    </QueryClientProvider>,
  );
}

describe("InvoicesPanel (issue #50)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
    mocks.invoices.mockImplementation(async (owingOnly: boolean) =>
      owingOnly ? [account("pixel-pals", 15), account("rocket-lemonade", 30)] : [account("pixel-pals", 15), account("rocket-lemonade", 30), account("sock-it", 0)],
    );
  });

  afterEach(() => {
    document.body.className = "";
    delete document.body.dataset.printLayout;
    document.head.querySelectorAll("style[data-print-page]").forEach((s) => s.remove());
  });

  it("prints an invoice for every team that owes, one per till receipt", async () => {
    renderPanel();

    expect(await screen.findByText("2 invoices to print.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /till printer/i }));

    const printed = await screen.findByTestId("print-area");
    expect(within(printed).getAllByRole("article")).toHaveLength(2);
    expect(within(printed).getByLabelText("Invoice for rocket-lemonade")).toBeInTheDocument();
    expect(window.print).toHaveBeenCalled();
    expect(document.body.dataset.printLayout).toBe("receipt-long");
  });

  it("can include every team, laid out on A4", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "All teams" }));
    expect(await screen.findByText("3 invoices to print.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "A4 paper" }));

    await waitFor(() => expect(document.body.dataset.printLayout).toBe("a4-cards"));
    expect(mocks.invoices).toHaveBeenCalledWith(false);
  });

  it("has nothing to print when nobody owes", async () => {
    mocks.invoices.mockResolvedValue([]);
    renderPanel();

    expect(await screen.findByText("No team owes anything right now.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /till printer/i })).toBeDisabled();
  });
});
