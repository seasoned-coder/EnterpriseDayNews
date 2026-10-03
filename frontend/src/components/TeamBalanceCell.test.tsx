import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamBalance } from "@/lib/api";
import { TeamBalanceCell } from "@/components/TeamBalanceCell";

const mocks = vi.hoisted(() => ({ balances: vi.fn(), teamAccount: vi.fn(), markPaid: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: mocks, formatDateTime: () => "3 Oct 10:00" }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const balance = (owed: number, paid = 0): TeamBalance => ({
  team: "rocket-lemonade",
  charged: owed + paid,
  credited: 0,
  paid,
  owed,
  advertsUploaded: 2,
  advertsCharged: 2,
});

function renderCell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TeamBalanceCell team="rocket-lemonade" />
    </QueryClientProvider>,
  );
}

describe("TeamBalanceCell (issue #48)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.teamAccount.mockResolvedValue({
      balance: balance(35),
      entries: [
        { kind: "CHARGE", amount: 20, description: "Approved: a.png (priority 2, 20 s)", at: "2026-10-03T10:00:00Z", recordedBy: "ms.okafor" },
        { kind: "CHARGE", amount: 15, description: "Approved: b.png (priority 1, 30 s)", at: "2026-10-03T11:00:00Z", recordedBy: "ms.okafor" },
      ],
    });
  });

  it("shows what the team owes and its charges", async () => {
    mocks.balances.mockResolvedValue([balance(35)]);
    renderCell();

    fireEvent.click(await screen.findByRole("button", { name: "Owes 35" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Approved: a.png (priority 2, 20 s)")).toBeInTheDocument();
    expect(within(dialog).getByText(/Only mark it paid once you have/)).toBeInTheDocument();
  });

  it("marks the whole balance paid, nothing less", async () => {
    mocks.balances.mockResolvedValue([balance(35)]);
    mocks.markPaid.mockResolvedValue(balance(0, 35));
    renderCell();

    fireEvent.click(await screen.findByRole("button", { name: "Owes 35" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Yes, mark 35 as paid" }));

    await waitFor(() => expect(mocks.markPaid).toHaveBeenCalledWith("rocket-lemonade", 35));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "rocket-lemonade: paid" }));
  });

  it("explains if the balance changed meanwhile", async () => {
    mocks.balances.mockResolvedValue([balance(35)]);
    mocks.markPaid.mockRejectedValue(new Error("rocket-lemonade now owes 45 (not 35): check, take that amount, and try again"));
    renderCell();

    fireEvent.click(await screen.findByRole("button", { name: "Owes 35" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /mark 35 as paid/i }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Not marked as paid", description: expect.stringContaining("now owes 45") }),
      ),
    );
  });

  it("offers nothing to pay when nothing is owed", async () => {
    mocks.balances.mockResolvedValue([balance(0, 35)]);
    renderCell();

    fireEvent.click(await screen.findByRole("button", { name: "Nothing owed" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /mark .* as paid/i })).not.toBeInTheDocument();
  });
});
