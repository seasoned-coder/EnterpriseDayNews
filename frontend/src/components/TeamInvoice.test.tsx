import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TeamAccount } from "@/lib/api";
import { TeamInvoice } from "@/components/TeamInvoice";

const account: TeamAccount = {
  balance: { team: "rocket-lemonade", charged: 45, credited: 10, paid: 20, owed: 15, advertsUploaded: 3, advertsCharged: 2 },
  entries: [
    { kind: "CHARGE", amount: 20, description: "Approved: summer.png (priority 4, 30 s)", at: "2026-10-03T10:00:00Z", recordedBy: "ms.okafor" },
    { kind: "CHARGE", amount: 10, description: "Approved: oops.png (priority 1, 10 s)", at: "2026-10-03T10:30:00Z", recordedBy: "ms.okafor" },
    { kind: "CREDIT", amount: 10, description: "Refund, not approved after all: oops.png (priority 1, 10 s)", at: "2026-10-03T11:00:00Z", recordedBy: "ms.okafor" },
    { kind: "PAYMENT", amount: 20, description: "Paid from the team's bank", at: "2026-10-03T12:00:00Z", recordedBy: "ms.okafor" },
    { kind: "CHARGE", amount: 15, description: "Approved: rush.png (priority 2, 20 s)", at: "2026-10-03T13:00:00Z", recordedBy: "ms.okafor" },
  ],
};

describe("TeamInvoice (issue #50)", () => {
  it("lists the adverts, refunds and payments, and what's left to pay", () => {
    render(<TeamInvoice account={account} now={new Date("2026-10-03T14:00:00Z")} />);

    const invoice = screen.getByLabelText("Invoice for rocket-lemonade");
    expect(invoice).toHaveTextContent("INVOICE");
    expect(invoice).toHaveTextContent("INV-ROCKET-LEMONADE-20261003");
    expect(screen.getByText("summer.png (priority 4, 30 s)")).toBeInTheDocument();
    expect(screen.getAllByText(/oops\.png \(priority 1, 10 s\)/)).toHaveLength(2); // charged, then refunded
    expect(invoice).toHaveTextContent("Refund: oops.png");
    expect(invoice).toHaveTextContent("Payment: paid from your bank");
    expect(screen.getByText("Refunds").nextSibling).toHaveTextContent("−10");
    expect(screen.getByText("Already paid").nextSibling).toHaveTextContent("−20");
    expect(screen.getByText("TO PAY").nextSibling).toHaveTextContent("15");
  });

  it("says when there's nothing on it yet", () => {
    render(
      <TeamInvoice
        account={{ balance: { ...account.balance, charged: 0, credited: 0, paid: 0, owed: 0 }, entries: [] }}
      />,
    );

    expect(screen.getByText("No approved adverts yet.")).toBeInTheDocument();
    expect(screen.queryByText("Refunds")).not.toBeInTheDocument();
    expect(screen.getByText("TO PAY").nextSibling).toHaveTextContent("0");
  });
});
