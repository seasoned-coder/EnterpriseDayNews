import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentUpload from "@/pages/StudentUpload";
import { makeSubmission } from "@/test/fixtures";

const mocks = vi.hoisted(() => {
  return {
    toast: vi.fn(),
    getCurrentUser: vi.fn(),
    studentGetMyUploads: vi.fn(),
    studentDeleteMyUpload: vi.fn(),
    studentSetPublished: vi.fn(),
    studentPrices: vi.fn(),
    imageUrl: vi.fn(),
    formatRelative: vi.fn(),
  };
});

vi.mock("@/hooks/useNsfwCheck", () => ({
  useNsfwCheck: () => ({
    scanStatus: "idle",
    scanFile: vi.fn(),
    resetScan: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: mocks.toast,
}));

vi.mock("@/components/BrandNav", () => ({
  BrandNav: () => <nav data-testid="brand-nav" />,
}));

vi.mock("@/components/UploadDropzone", () => ({
  UploadDropzone: ({ onFileChange }: { onFileChange: (f: File | null) => void }) => (
    <input
      data-testid="upload-dropzone"
      type="file"
      onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
    />
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getCurrentUser: mocks.getCurrentUser,
    studentGetMyUploads: mocks.studentGetMyUploads,
    studentDeleteMyUpload: mocks.studentDeleteMyUpload,
    studentSetPublished: mocks.studentSetPublished,
    studentPrices: mocks.studentPrices,
    studentResults: async () => ({
      team: { team: "year10-team1", adverts: 1, spent: 25, plays: 4, seconds: 80, costPerMinute: 18.8 },
      adverts: [{ imageId: 101, plays: 4, seconds: 80 }],
    }),
    imageUrl: mocks.imageUrl,
  },
  formatRelative: mocks.formatRelative,
}));

const sampleUpload = makeSubmission({
  id: 101,
  filePath: "photo-101.jpg",
  originalFileName: "my-upload.jpg",
  uploadedBy: "student1",
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <StudentUpload />
    </QueryClientProvider>,
  );
}

/** Deliberately different from the real prices: the page must show whatever the server sends. */
const PRICES = {
  priority: [
    { value: 1, cost: 7 },
    { value: 2, cost: 11 },
    { value: 3, cost: 13 },
    { value: 4, cost: 17 },
  ],
  durationSeconds: [
    { value: 10, cost: 3 },
    { value: 20, cost: 6 },
    { value: 30, cost: 9 },
  ],
};

function pick(file: File) {
  fireEvent.change(screen.getByTestId("upload-dropzone"), { target: { files: [file] } });
}

const MB = 1024 * 1024;

describe("StudentUpload wording and checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.studentPrices.mockResolvedValue(PRICES);
    mocks.getCurrentUser.mockReturnValue({ username: "student1", role: "STUDENT" });
    mocks.studentGetMyUploads.mockResolvedValue([
      sampleUpload,
      { ...sampleUpload, id: 102, status: "NEW", display: false },
      { ...sampleUpload, id: 103, status: "REJECTED", display: false },
      { ...sampleUpload, id: 104, status: "APPROVED", display: false },
    ]);
    mocks.imageUrl.mockImplementation((item: { filePath: string }) => `/uploads/${item.filePath}`);
    mocks.formatRelative.mockReturnValue("just now");
  });

  it("shows the team's spend and screen time above their uploads (issue #40)", async () => {
    renderPage();

    const summary = await screen.findByLabelText("Your results");
    expect(within(summary).getByText("25")).toBeInTheDocument();
    expect(within(summary).getByText("1 min 20 s")).toBeInTheDocument();
    expect(within(summary).getByText("18.8")).toBeInTheDocument();
  });

  it("shows friendly status labels instead of NEW / APPROVED / REJECTED", async () => {
    renderPage();

    expect(await screen.findByText("Waiting for approval")).toBeInTheDocument();
    expect(screen.getByText("On screen")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Not approved")).toBeInTheDocument();
    expect(screen.queryByText(/^(NEW|APPROVED|REJECTED)$/)).not.toBeInTheDocument();
  });

  it("lets the student publish an approved advert when they choose", async () => {
    mocks.studentSetPublished.mockResolvedValue({ ...sampleUpload, id: 104, display: true });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /publish now/i }));

    await waitFor(() => expect(mocks.studentSetPublished).toHaveBeenCalledWith(104, true));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "It's going on screen" }));
  });

  it("puts adverts on screen as soon as they're approved unless the student unticks it", () => {
    renderPage();

    const box = screen.getByRole("checkbox", { name: /as soon as it's approved/i });
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();
  });

  const totalCost = () => screen.getByText("Total Cost:").closest("div");

  it("builds the choices and total cost from the server's price list", async () => {
    renderPage();

    expect(await screen.findByText(/\(cost: 7\)/)).toBeInTheDocument(); // priority 1
    expect(screen.getByText(/\(cost: 3\)/)).toBeInTheDocument(); // 10 seconds
    expect(totalCost()).toHaveTextContent("Total Cost:10"); // 7 + 3

    // One tap/click per choice: no fiddly slider.
    const priority = screen.getByRole("radiogroup", { name: /priority/i });
    const duration = screen.getByRole("radiogroup", { name: /duration/i });
    expect(within(priority).getAllByRole("radio")).toHaveLength(4);
    fireEvent.click(within(priority).getByRole("radio", { name: "4, costs 17" }));
    fireEvent.click(within(duration).getByRole("radio", { name: "30s, costs 9" }));

    expect(within(priority).getByRole("radio", { name: "4, costs 17" })).toHaveAttribute("aria-checked", "true");
    expect(document.getElementById("priority-label")).toHaveTextContent("Priority: 4 (cost: 17)");
    expect(document.getElementById("duration-label")).toHaveTextContent("Duration: 30s (cost: 9)");
    expect(totalCost()).toHaveTextContent("Total Cost:26"); // 17 + 9
  });

  it("lets the arrow keys move between choices", async () => {
    renderPage();
    await screen.findByRole("radio", { name: "1, costs 7" });
    const priority = screen.getByRole("radiogroup", { name: /priority/i });

    fireEvent.keyDown(within(priority).getByRole("radio", { name: "1, costs 7" }), { key: "ArrowRight" });
    expect(within(priority).getByRole("radio", { name: "2, costs 11" })).toHaveAttribute("aria-checked", "true");

    fireEvent.keyDown(within(priority).getByRole("radio", { name: "2, costs 11" }), { key: "ArrowLeft" });
    fireEvent.keyDown(within(priority).getByRole("radio", { name: "1, costs 7" }), { key: "ArrowLeft" });
    expect(within(priority).getByRole("radio", { name: "4, costs 17" })).toHaveAttribute("aria-checked", "true");
  });

  it("talks about adverts and the real 10 MB limit", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/advert/i);
    expect(document.body.textContent).not.toMatch(/story|stories|15 MB|25 MB/i);
    expect(document.body.textContent).toMatch(/3 MB and 10 MB/);
  });

  it("rejects file types the server won't accept", () => {
    renderPage();

    pick(new File([new ArrayBuffer(4 * MB)], "clip.mp4", { type: "video/mp4" }));

    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "That file type can't be used", variant: "destructive" }),
    );
  });

  it("blocks pictures over 10 MB with a clear message", () => {
    renderPage();

    pick(new File([new ArrayBuffer(12 * MB)], "huge.jpg", { type: "image/jpeg" }));

    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "File too large",
        description: "That picture is over 10 MB. Please save a smaller copy and try again.",
      }),
    );
  });
});

describe("StudentUpload delete flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.studentPrices.mockResolvedValue(PRICES);

    mocks.getCurrentUser.mockReturnValue({ username: "student1", role: "STUDENT" });
    mocks.studentGetMyUploads.mockResolvedValue([sampleUpload]);
    mocks.studentDeleteMyUpload.mockResolvedValue(undefined);
    mocks.imageUrl.mockImplementation((item: { filePath: string }) => `/uploads/${item.filePath}`);
    mocks.formatRelative.mockReturnValue("just now");
  });

  it("opens a confirmation dialog and does not delete when cancelled", async () => {
    renderPage();

    const deleteBtn = await screen.findByRole("button", { name: /delete/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText("Permanently delete this upload?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /keep upload/i }));

    await waitFor(() => {
      expect(screen.queryByText("Permanently delete this upload?")).not.toBeInTheDocument();
    });
    expect(mocks.studentDeleteMyUpload).not.toHaveBeenCalled();
  });

  it("deletes after confirmation and shows success toast", async () => {
    renderPage();

    const deleteBtn = await screen.findByRole("button", { name: /delete/i });
    fireEvent.click(deleteBtn);

    fireEvent.click(screen.getByRole("button", { name: /delete permanently/i }));

    await waitFor(() => {
      expect(mocks.studentDeleteMyUpload).toHaveBeenCalledWith(101, "student1");
    });

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Upload deleted" }),
      );
    });

    await waitFor(() => {
      expect(mocks.studentGetMyUploads.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});

