import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamBalance } from "@/lib/api";
import { EventResetPanel } from "@/components/EventResetPanel";

const mocks = vi.hoisted(() => ({ resetEvent: vi.fn(), balances: vi.fn(), toast: vi.fn() }));

vi.mock("@/lib/api", () => ({ api: { resetEvent: mocks.resetEvent, balances: mocks.balances } }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const team = (name: string, owed: number, paid: number, advertsCharged: number): TeamBalance => ({
  team: name,
  charged: owed + paid,
  credited: 0,
  paid,
  owed,
  advertsUploaded: advertsCharged + 1,
  advertsCharged,
});

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EventResetPanel />
    </QueryClientProvider>,
  );
}

/** Step 1 (issue #48): print the End of Day report, which unlocks the switch. */
async function printReport() {
  const till = screen.getByRole("button", { name: /till printer/i });
  await waitFor(() => expect(till).toBeEnabled());
  fireEvent.click(till);
}

describe("EventResetPanel (issue #34)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
    mocks.balances.mockResolvedValue([team("pixel-pals", 0, 30, 2), team("rocket-lemonade", 15, 20, 3)]);
  });

  afterEach(() => {
    document.body.className = "";
    delete document.body.dataset.printLayout;
    document.head.querySelectorAll("style[data-print-page]").forEach((s) => s.remove());
  });

  it("says what will be deleted and what is kept", () => {
    renderPanel();

    expect(screen.getByText(/Delete every student advert/)).toBeInTheDocument();
    expect(screen.getByText(/Clear every team's balance and payments/)).toBeInTheDocument();
    expect(screen.getByText(/projector settings back to normal/)).toBeInTheDocument();
    expect(screen.getByText(/Event Communications items/)).toBeInTheDocument();
    expect(screen.getByText(/Student and staff accounts/)).toBeInTheDocument();
  });

  it("won't reset until the End of Day report has been printed (issue #48)", async () => {
    renderPanel();

    expect(screen.getByRole("switch", { name: /reset the event/i })).toBeDisabled();

    await printReport();

    expect(window.print).toHaveBeenCalled();
    expect(document.body.dataset.printLayout).toBe("receipt-roll");
    const report = within(screen.getByTestId("print-area")).getByLabelText("End of Day report");
    expect(within(report).getByText("rocket-lemonade")).toBeInTheDocument();
    expect(within(report).getByText("OWES 15")).toBeInTheDocument();
    expect(within(report).getByText("Settled")).toBeInTheDocument();
    expect(within(report).getByText(/Adverts: 3 approved \(4 in the system\) · Paid 20/)).toBeInTheDocument();
    expect(within(report).getByText("Paid to the bank").nextSibling).toHaveTextContent("50");
    expect(within(report).getByText("Still owed").nextSibling).toHaveTextContent("15");
    expect(screen.getByText("Printed")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /reset the event/i })).toBeEnabled();
  });

  it("keeps Clear Down disabled until the switch is flipped", async () => {
    renderPanel();
    await printReport();

    const clearDown = screen.getByRole("button", { name: "Clear Down" });
    expect(clearDown).toBeDisabled();

    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    expect(clearDown).toBeEnabled();

    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    expect(clearDown).toBeDisabled();
  });

  it("needs 'clear down' typed before the final confirm works", async () => {
    renderPanel();
    await printReport();

    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Down" }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: /yes, reset the event/i });
    const field = within(dialog).getByLabelText(/type clear down to confirm/i);

    expect(confirm).toBeDisabled();
    fireEvent.change(field, { target: { value: "clear" } });
    expect(confirm).toBeDisabled();
    fireEvent.change(field, { target: { value: " Clear Down " } });
    expect(confirm).toBeEnabled();
    expect(mocks.resetEvent).not.toHaveBeenCalled();
  });

  it("then resets, turns the switch back off, and needs a fresh report next time", async () => {
    mocks.resetEvent.mockResolvedValue({ deletedAdverts: 3 });
    renderPanel();
    await printReport();

    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Down" }));
    expect(mocks.resetEvent).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/type clear down to confirm/i), { target: { value: "clear down" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /yes, reset the event/i }));

    await waitFor(() => expect(mocks.resetEvent).toHaveBeenCalledTimes(1));
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Event reset", description: "3 adverts deleted and projector settings restored." }),
    );
    const armSwitch = screen.getByRole("switch", { name: /reset the event/i });
    expect(armSwitch).not.toBeChecked();
    expect(armSwitch).toBeDisabled(); // a fresh report is needed before another reset
    expect(screen.getByRole("button", { name: "Clear Down" })).toBeDisabled();

    // A little animated explosion, until the switch is used again.
    const done = screen.getByRole("status");
    expect(done.querySelector("pre[data-frame]")).not.toBeNull();
    expect(done).toHaveTextContent("Event reset complete");
    expect(done).toHaveTextContent("3 adverts deleted");
    window.dispatchEvent(new Event("afterprint"));
    await printReport();
    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("cancelling the final question changes nothing", async () => {
    renderPanel();
    await printReport();

    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Down" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.resetEvent).not.toHaveBeenCalled();
  });
});
