import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiSubmission } from "@/lib/api";
import StaffDashboard from "@/pages/StaffDashboard";
import { makeSubmission } from "@/test/fixtures";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  list: vi.fn(),
  listInfo: vi.fn(),
  delete: vi.fn(),
  toggleDisplay: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  projectorSettings: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getCurrentUser: mocks.getCurrentUser,
    list: mocks.list,
    listInfo: mocks.listInfo,
    delete: mocks.delete,
    toggleDisplay: mocks.toggleDisplay,
    approve: mocks.approve,
    reject: mocks.reject,
    projectorSettings: mocks.projectorSettings,
    imageUrl: (item: { filePath: string }) => `/uploads/${item.filePath}`,
    thumbnailUrl: (item: { filePath: string }) => `/uploads/thumbs/${item.filePath}.jpg`,
  },
  formatRelative: () => "just now",
}));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/components/BrandNav", () => ({ BrandNav: () => <nav /> }));

const base: ApiSubmission = makeSubmission({ id: 1, filePath: "a.jpg", uploadedBy: "year10-team1" });

const urgent: ApiSubmission = makeSubmission({
  id: 7,
  filePath: "",
  uploadedBy: "staff",
  isInfoMessage: true,
  isFlashMode: true,
  messageText: "Fire drill at 11",
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StaffDashboard />
    </QueryClientProvider>,
  );
}

async function openTab(name: RegExp) {
  const tab = screen.getByRole("tab", { name });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
}

describe("StaffDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockReturnValue({ username: "head.teacher", role: "STAFF" });
    mocks.list.mockImplementation(async (kind: string) => (kind === "approved" ? [base] : []));
    mocks.listInfo.mockResolvedValue([urgent]);
    mocks.projectorSettings.mockResolvedValue({
      id: "DEFAULT",
      intervalSpeedSeconds: 60,
      displayDurationSeconds: 10,
      imageRefreshSeconds: 3,
    });
  });

  it("leaves Flash Mode unticked for new information uploads", async () => {
    renderPage();
    await openTab(/event communications/i);

    expect(await screen.findByLabelText("Flash Mode")).not.toBeChecked();
  });

  it("asks before deleting the urgent message", async () => {
    renderPage();
    await openTab(/event communications/i);

    fireEvent.click(await screen.findByRole("button", { name: /delete urgent message/i }));

    expect(mocks.delete).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /yes, delete permanently/i }));
    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith(7, "head.teacher"));
  });

  it("shows small previews on the cards but the full picture when opened (issue #42)", async () => {
    renderPage();
    await openTab(/approved/i);

    const card = await screen.findByAltText("Submission by year10-team1");
    expect(card).toHaveAttribute("src", "/uploads/thumbs/a.jpg.jpg");
    fireEvent.click(card);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "/uploads/a.jpg");
  });

  it("shows the price the team was charged at upload, and if it was a sale (issue #47)", async () => {
    const sale = makeSubmission({ id: 9, filePath: "s.jpg", uploadedBy: "sale-team", status: "NEW", totalCost: 18, pricePercent: 50 });
    mocks.list.mockImplementation(async (kind: string) => (kind === "new" ? [sale] : []));
    renderPage();

    const price = await screen.findByText(/Price 18/);
    expect(price).toHaveTextContent("💰 Price 18· half price");
    expect(price).toHaveAttribute("title", expect.stringContaining("when they uploaded it"));

    fireEvent.click(screen.getByAltText("Submission by sale-team"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/charged when uploaded/)).toBeInTheDocument();
    expect(within(dialog).getByText("Price 18")).toBeInTheDocument();
  });

  it("doesn't show a price on staff items", async () => {
    renderPage();
    await openTab(/event communications/i);

    await screen.findAllByText(/Fire drill at 11/);
    expect(screen.queryByText(/Price \d/)).not.toBeInTheDocument();
  });

  it("previews a text message as text, not a broken image", async () => {
    renderPage();
    await openTab(/event communications/i);

    const cards = await screen.findAllByText(/Fire drill at 11/);
    fireEvent.click(cards[0]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Fire drill at 11")).toBeInTheDocument();
    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
  });

  it("updates the preview's Hide/Display button straight away", async () => {
    mocks.toggleDisplay.mockResolvedValue({ ...base, display: false });
    renderPage();
    await openTab(/approved/i);

    fireEvent.click(await screen.findByAltText("Submission by year10-team1"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /hide from projector/i }));

    expect(await within(dialog).findByRole("button", { name: /display on projector/i })).toBeInTheDocument();
  });

  it("describes what End of Day keeps", async () => {
    renderPage();
    await openTab(/end of day/i);

    expect(await screen.findByText(/Event Communications items/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear Down" })).toBeDisabled();
    expect(screen.queryByText(/ALL database records/)).not.toBeInTheDocument();
  });

  it("has a Projector tab with the settings", async () => {
    renderPage();
    await openTab(/^projector$/i);

    expect(await screen.findByLabelText(/staff content interval/i)).toHaveValue(60);
  });

  it("has quiet footer links to the student portal and projector", async () => {
    renderPage();

    const footer = await screen.findByRole("navigation", { name: "Other apps" });
    expect(within(footer).getByRole("link", { name: /student portal/i })).toHaveAttribute("href", "/student");
    expect(within(footer).getByRole("link", { name: /projector/i })).toHaveAttribute("target", "_blank");
  });

  it("explains and refreshes when another member of staff reviewed the advert first", async () => {
    const pending = makeSubmission({ id: 3, filePath: "b.jpg", uploadedBy: "year10-team2", status: "NEW" });
    mocks.list.mockImplementation(async (kind: string) => (kind === "new" ? [pending] : []));
    const message = "This advert has already been approved, probably by another member of staff. The list will refresh.";
    mocks.approve.mockRejectedValue(new Error(message));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /approve/i }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Approve failed", description: message })),
    );
    await waitFor(() => expect(mocks.list.mock.calls.filter(([kind]) => kind === "new").length).toBeGreaterThan(1));
  });

  it("asks why before rejecting, and sends the reason (issue #38)", async () => {
    const pending = makeSubmission({ id: 3, filePath: "b.jpg", uploadedBy: "year10-team2", status: "NEW" });
    mocks.list.mockImplementation(async (kind: string) => (kind === "new" ? [pending] : []));
    mocks.reject.mockResolvedValue({ ...pending, status: "REJECTED" });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /^reject$/i }));
    expect(mocks.reject).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("year10-team2")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Or write your own"), { target: { value: "Add your stand number" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject with this reason" }));

    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith(3, "head.teacher", "Add your stand number"));
  });

  it("shows the reason on rejected cards", async () => {
    const rejected = makeSubmission({ id: 5, filePath: "c.jpg", status: "REJECTED", rejectionReason: "Too blurry" });
    mocks.list.mockImplementation(async (kind: string) => (kind === "rejected" ? [rejected] : []));
    renderPage();

    await openTab(/rejected/i);

    expect(await screen.findByText("Too blurry")).toBeInTheDocument();
  });

  it("uses friendly empty-state text", async () => {
    renderPage();

    expect(await screen.findByText("No new submissions")).toBeInTheDocument();
    await openTab(/rejected/i);
    expect(await screen.findByText("Nothing rejected")).toBeInTheDocument();
  });
});
