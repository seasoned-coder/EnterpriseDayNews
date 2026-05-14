import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentUpload from "@/pages/StudentUpload";

const mocks = vi.hoisted(() => {
  return {
    toast: vi.fn(),
    getCurrentUser: vi.fn(),
    studentGetMyUploads: vi.fn(),
    studentDeleteMyUpload: vi.fn(),
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
  UploadDropzone: () => <div data-testid="upload-dropzone" />,
}));

vi.mock("@/lib/api", () => ({
  api: {
    getCurrentUser: mocks.getCurrentUser,
    studentGetMyUploads: mocks.studentGetMyUploads,
    studentDeleteMyUpload: mocks.studentDeleteMyUpload,
    imageUrl: mocks.imageUrl,
  },
  formatRelative: mocks.formatRelative,
}));

const sampleUpload = {
  id: 101,
  filePath: "photo-101.jpg",
  originalFileName: "my-upload.jpg",
  uploadedBy: "student1",
  uploadedAt: "2026-05-14T08:00:00Z",
  status: "APPROVED" as const,
  vettedBy: "staff1",
  vettedAt: "2026-05-14T08:02:00Z",
  display: true,
  displayOrder: 0,
  priority: 2,
  durationSeconds: 10,
  totalCost: 15,
  isInfoMessage: false,
  isFlashMode: false,
  messageText: null,
};

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

describe("StudentUpload delete flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getCurrentUser.mockReturnValue({ username: "student1", role: "STUDENT" });
    mocks.studentGetMyUploads.mockResolvedValue([sampleUpload]);
    mocks.studentDeleteMyUpload.mockResolvedValue(undefined);
    mocks.imageUrl.mockImplementation((filePath: string) => `/uploads/${filePath}`);
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

