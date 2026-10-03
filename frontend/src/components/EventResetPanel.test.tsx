import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventResetPanel } from "@/components/EventResetPanel";

const mocks = vi.hoisted(() => ({ resetEvent: vi.fn(), toast: vi.fn() }));

vi.mock("@/lib/api", () => ({ api: { resetEvent: mocks.resetEvent } }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EventResetPanel />
    </QueryClientProvider>,
  );
}

describe("EventResetPanel (issue #34)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("says what will be deleted and what is kept", () => {
    renderPanel();

    expect(screen.getByText(/Delete every student advert/)).toBeInTheDocument();
    expect(screen.getByText(/projector settings back to their defaults/)).toBeInTheDocument();
    expect(screen.getByText(/Event Communications items/)).toBeInTheDocument();
    expect(screen.getByText(/Student and staff accounts/)).toBeInTheDocument();
  });

  it("keeps Clear Down disabled until the switch is flipped", () => {
    renderPanel();

    const clearDown = screen.getByRole("button", { name: "Clear Down" });
    expect(clearDown).toBeDisabled();

    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    expect(clearDown).toBeEnabled();

    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    expect(clearDown).toBeDisabled();
  });

  it("asks once more, then resets and turns the switch back off", async () => {
    mocks.resetEvent.mockResolvedValue({ deletedAdverts: 3 });
    renderPanel();

    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Down" }));
    expect(mocks.resetEvent).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /yes, reset the event/i }));

    await waitFor(() => expect(mocks.resetEvent).toHaveBeenCalledTimes(1));
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Event reset", description: "3 adverts deleted and projector settings restored." }),
    );
    expect(screen.getByRole("switch", { name: /reset the event/i })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Clear Down" })).toBeDisabled();
  });

  it("cancelling the final question changes nothing", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("switch", { name: /reset the event/i }));
    fireEvent.click(screen.getByRole("button", { name: "Clear Down" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.resetEvent).not.toHaveBeenCalled();
  });
});
