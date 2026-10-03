import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectorSettingsPanel } from "@/components/ProjectorSettingsPanel";

const mocks = vi.hoisted(() => ({
  projectorSettings: vi.fn(),
  updateProjectorSettings: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    projectorSettings: mocks.projectorSettings,
    updateProjectorSettings: mocks.updateProjectorSettings,
  },
}));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProjectorSettingsPanel />
    </QueryClientProvider>,
  );
}

describe("ProjectorSettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.projectorSettings.mockResolvedValue({
      id: "DEFAULT",
      intervalSpeedSeconds: 60,
      displayDurationSeconds: 10,
      imageRefreshSeconds: 3,
    });
  });

  it("shows the current settings", async () => {
    renderPanel();

    expect(await screen.findByLabelText(/staff content interval/i)).toHaveValue(60);
    expect(screen.getByLabelText(/staff item display time/i)).toHaveValue(10);
    expect(screen.getByLabelText(/projector refresh/i)).toHaveValue(3);
  });

  it("saves changed settings", async () => {
    mocks.updateProjectorSettings.mockImplementation(async (s) => ({ id: "DEFAULT", ...s }));
    renderPanel();

    fireEvent.change(await screen.findByLabelText(/staff content interval/i), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText(/staff item display time/i), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() =>
      expect(mocks.updateProjectorSettings).toHaveBeenCalledWith({
        intervalSpeedSeconds: 0,
        displayDurationSeconds: 15,
        imageRefreshSeconds: 3,
      }),
    );
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Projector settings saved" }));
  });

  it("won't save values outside the allowed range", async () => {
    renderPanel();

    fireEvent.change(await screen.findByLabelText(/projector refresh/i), { target: { value: "1" } });

    expect(screen.getByText("Enter a whole number from 2 to 60.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save settings/i })).toBeDisabled();
  });

  it("shows the server's message if saving fails", async () => {
    mocks.updateProjectorSettings.mockRejectedValue(new Error("Projector refresh must be between 2 and 60 seconds"));
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /save settings/i }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Projector refresh must be between 2 and 60 seconds" }),
      ),
    );
  });
});
