import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RejectDialog } from "@/components/RejectDialog";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";

function renderDialog() {
  const onReject = vi.fn();
  const onCancel = vi.fn();
  render(<RejectDialog open teamName="rocket-lemonade" onReject={onReject} onCancel={onCancel} />);
  return { onReject, onCancel };
}

describe("RejectDialog (issue #38)", () => {
  it("says who will see the reason", () => {
    renderDialog();

    expect(screen.getByText("rocket-lemonade")).toBeInTheDocument();
    expect(screen.getByText(/will see this on their phone/)).toBeInTheDocument();
  });

  it("rejects with a quick reason", () => {
    const { onReject } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: REJECTION_REASONS[0] }));
    expect(screen.getByRole("button", { name: REJECTION_REASONS[0] })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Reject with this reason" }));

    expect(onReject).toHaveBeenCalledWith(REJECTION_REASONS[0]);
  });

  it("rejects with the staff member's own words, trimmed", () => {
    const { onReject } = renderDialog();

    fireEvent.change(screen.getByLabelText("Or write your own"), { target: { value: "  Add your stand number  " } });
    fireEvent.click(screen.getByRole("button", { name: "Reject with this reason" }));

    expect(onReject).toHaveBeenCalledWith("Add your stand number");
  });

  it("can still reject without a reason, or be cancelled", () => {
    const { onReject, onCancel } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Reject without a reason" }));
    expect(onReject).toHaveBeenCalledWith(null);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("keeps the preset reasons short enough for the server", () => {
    for (const reason of REJECTION_REASONS) expect(reason.length).toBeLessThanOrEqual(200);
  });
});
