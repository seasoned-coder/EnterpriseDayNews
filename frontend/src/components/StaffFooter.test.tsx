import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/results", () => ({ openProjectorWithKey: vi.fn() }));

/** The footer reads the version when it's loaded, so load it fresh for each build setting. */
async function renderFooter() {
  vi.resetModules();
  const { StaffFooter } = await import("@/components/StaffFooter");
  return render(<StaffFooter />);
}

describe("StaffFooter", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("shows which release is running (issue #46)", async () => {
    vi.stubEnv("VITE_APP_VERSION", "v2026.10.04");
    await renderFooter();

    const footer = screen.getByRole("navigation", { name: "Other apps" });
    expect(within(footer).getByText("Version v2026.10.04")).toBeInTheDocument();
  });

  it("says 'dev' for a local build", async () => {
    vi.stubEnv("VITE_APP_VERSION", "");
    await renderFooter();

    expect(screen.getByText("Version dev")).toBeInTheDocument();
  });
});
