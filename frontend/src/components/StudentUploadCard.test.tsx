import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ApiSubmission } from "@/lib/api";
import { publishingState, StudentUploadCard } from "@/components/StudentUploadCard";
import { makeSubmission } from "@/test/fixtures";

vi.mock("@/lib/api", () => ({
  api: {
    imageUrl: (item: { filePath: string }) => `/uploads/${item.filePath}`,
    thumbnailUrl: (item: { filePath: string; thumbnailUrl?: string | null }) => item.thumbnailUrl ?? `/uploads/${item.filePath}`,
  },
  formatRelative: () => "just now",
}));

/** A pending advert unless overridden. */
const upload = (overrides: Partial<ApiSubmission>): ApiSubmission =>
  makeSubmission({ status: "NEW", display: false, ...overrides });

describe("publishingState", () => {
  it.each([
    [{ status: "NEW", publishOnApproval: true }, "Waiting for approval", "Keep it off screen", false],
    [{ status: "NEW", publishOnApproval: false }, "Waiting for approval", "Publish when approved", true],
    [{ status: "APPROVED", display: true }, "On screen", "Withdraw", false],
    [{ status: "APPROVED", display: false }, "Approved", "Publish now", true],
  ] as const)("%o → %s / %s", (overrides, label, button, publishes) => {
    const state = publishingState(upload(overrides));
    expect(state.label).toBe(label);
    expect(state.action).toEqual({ text: button, published: publishes });
  });

  it("offers nothing for a rejected advert", () => {
    const state = publishingState(upload({ status: "REJECTED" }));
    expect(state.label).toBe("Not approved");
    expect(state.action).toBeUndefined();
  });
});

describe("StudentUploadCard", () => {
  it("publishes an approved advert when the student taps Publish now", () => {
    const onSetPublished = vi.fn();
    const advert = upload({ status: "APPROVED", display: false });
    render(<StudentUploadCard upload={advert} busy={false} onSetPublished={onSetPublished} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /publish now/i }));

    expect(onSetPublished).toHaveBeenCalledWith(advert, true);
  });

  it("withdraws an advert that is on screen", () => {
    const onSetPublished = vi.fn();
    const advert = upload({ status: "APPROVED", display: true });
    render(<StudentUploadCard upload={advert} busy={false} onSetPublished={onSetPublished} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /withdraw/i }));

    expect(onSetPublished).toHaveBeenCalledWith(advert, false);
  });

  it("shows the teacher's reason for a rejected advert (issue #38)", () => {
    const advert = upload({ status: "REJECTED", rejectionReason: "The picture is too blurry." });
    render(<StudentUploadCard upload={advert} busy={false} onSetPublished={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Teacher's note")).toBeInTheDocument();
    expect(screen.getByText("The picture is too blurry.")).toBeInTheDocument();
    expect(screen.getByText(/Fix it and upload a new version/)).toBeInTheDocument();
    expect(screen.queryByText(/Ask a member of staff/)).not.toBeInTheDocument();
  });

  it("shows how often and how long an approved advert has been on screen (issue #40)", () => {
    render(
      <StudentUploadCard
        upload={upload({ status: "APPROVED", display: true })}
        screenTime={{ plays: 3, seconds: 90 }}
        busy={false}
        onSetPublished={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Shown 3 times · 1 min 30 s on screen")).toBeInTheDocument();
  });

  it("says an approved advert hasn't been shown yet", () => {
    render(<StudentUploadCard upload={upload({ status: "APPROVED" })} busy={false} onSetPublished={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Not shown yet")).toBeInTheDocument();
  });

  it("says to ask staff when no reason was given", () => {
    render(<StudentUploadCard upload={upload({ status: "REJECTED" })} busy={false} onSetPublished={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.queryByText("Teacher's note")).not.toBeInTheDocument();
    expect(screen.getByText(/Ask a member of staff/)).toBeInTheDocument();
  });

  it("disables its buttons while busy and hands deletes to the page", () => {
    const onDelete = vi.fn();
    const advert = upload({});
    const { rerender } = render(
      <StudentUploadCard upload={advert} busy={true} onSetPublished={vi.fn()} onDelete={onDelete} />,
    );
    expect(screen.getByRole("button", { name: /keep it off screen/i })).toBeDisabled();

    rerender(<StudentUploadCard upload={advert} busy={false} onSetPublished={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(advert);
  });
});
