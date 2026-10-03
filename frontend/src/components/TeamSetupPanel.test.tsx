import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiAccount, TeamLogin } from "@/lib/api";
import { TeamSetupPanel } from "@/components/TeamSetupPanel";

const mocks = vi.hoisted(() => ({
  createTeams: vi.fn(),
  newTeamPassword: vi.fn(),
  eventDetails: vi.fn(),
  saveEventDetails: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: mocks }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const account = (id: number, username: string): ApiAccount => ({
  id,
  username,
  locked: false,
  manuallyLocked: false,
  failedLoginAttempts: 0,
  temporaryLockUntil: null,
  lastLoginAt: null,
  lastLoginIp: null,
  createdAt: "2026-10-03T09:00:00Z",
  updatedAt: "2026-10-03T09:00:00Z",
});

const created = (username: string, password: string): TeamLogin => ({ username, password, status: "CREATED", message: null });

function renderPanel(accounts: ApiAccount[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TeamSetupPanel accounts={accounts} />
    </QueryClientProvider>,
  );
}

describe("TeamSetupPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventDetails.mockResolvedValue({ wifiName: "EnterpriseDay", wifiPassword: "Sunflower88", appAddress: "http://192.168.1.10" });
    window.print = vi.fn();
  });

  afterEach(() => {
    document.body.className = "";
    delete document.body.dataset.slipLayout;
  });

  it("previews the numbered team names before creating them", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText("How many"), { target: { value: "52" } });

    expect(screen.getByText(/Creates 52 teams: team01, team02, team03, … team52/)).toBeInTheDocument();
  });

  it("turns a pasted list of company names into usernames", async () => {
    mocks.createTeams.mockResolvedValue([]);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "List of names" }));
    fireEvent.change(screen.getByLabelText("One team per line"), { target: { value: "Rocket Lemonade\nPixel Pals" } });
    fireEvent.click(screen.getByRole("button", { name: "Create teams" }));

    await waitFor(() => expect(mocks.createTeams).toHaveBeenCalledWith(["rocket-lemonade", "pixel-pals"]));
  });

  it("refuses more than 200 teams at once", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText("How many"), { target: { value: "500" } });

    // The pattern helper caps at 200, so 500 shows as the maximum rather than being sent.
    expect(screen.getByText(/Creates 200 teams/)).toBeInTheDocument();
  });

  it("shows the new passwords once, explains skipped names, and prints slips for the till printer", async () => {
    mocks.createTeams.mockResolvedValue([
      created("team01", "Tiger-Maple-47"),
      { username: "team02", password: null, status: "SKIPPED", message: "A student account with that username already exists" },
    ]);
    renderPanel();

    fireEvent.change(screen.getByLabelText("How many"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Create teams" }));

    const results = await screen.findByLabelText("New team logins");
    expect(within(results).getByText("1 login slip ready. Print them now: the passwords are only shown here.")).toBeInTheDocument();
    expect(within(results).getAllByText("Tiger-Maple-47").length).toBeGreaterThan(0);
    expect(within(results).getByText(/already exists/)).toBeInTheDocument();

    // Only the created team gets a slip.
    const printable = screen.getByTestId("printable-slips");
    expect(within(printable).getAllByRole("article")).toHaveLength(1);
    expect(within(printable).getByText("team01")).toBeInTheDocument();

    fireEvent.click(within(results).getByRole("button", { name: /till printer/i }));
    expect(window.print).toHaveBeenCalled();
    expect(document.body.dataset.slipLayout).toBe("receipt");
    expect(document.head.querySelector("style[data-slip-page]")?.textContent).toContain("80mm");

    window.dispatchEvent(new Event("afterprint"));
    expect(document.body.classList.contains("printing-slips")).toBe(false);
    expect(document.head.querySelector("style[data-slip-page]")).toBeNull();
  });

  it("hides the passwords when done", async () => {
    mocks.createTeams.mockResolvedValue([created("team01", "Tiger-Maple-47")]);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Create teams" }));
    fireEvent.click(await screen.findByRole("button", { name: /done, hide the passwords/i }));

    expect(screen.queryByText("Tiger-Maple-47")).not.toBeInTheDocument();
  });

  it("asks before giving a team a new password for a lost slip", async () => {
    mocks.newTeamPassword.mockResolvedValue({ username: "pixel-pals", password: "Panda-River-38", status: "RESET", message: null });
    renderPanel([account(4, "rocket-lemonade"), account(7, "pixel-pals")]);

    fireEvent.change(screen.getByLabelText("Team to reprint"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "New slip" }));
    expect(mocks.newTeamPassword).not.toHaveBeenCalled();

    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Set new password" }));

    await waitFor(() => expect(mocks.newTeamPassword).toHaveBeenCalledWith(7));
    expect((await screen.findAllByText("Panda-River-38")).length).toBeGreaterThan(0);
  });

  it("saves the Wi-Fi and address printed on the slips", async () => {
    mocks.saveEventDetails.mockImplementation(async (d) => d);
    renderPanel();

    const name = await screen.findByLabelText("Wi-Fi name");
    await waitFor(() => expect(name).toHaveValue("EnterpriseDay"));
    fireEvent.change(name, { target: { value: "BigEventWiFi" } });
    fireEvent.click(screen.getByRole("button", { name: "Save slip details" }));

    await waitFor(() =>
      expect(mocks.saveEventDetails).toHaveBeenCalledWith({
        wifiName: "BigEventWiFi",
        wifiPassword: "Sunflower88",
        appAddress: "http://192.168.1.10",
      }),
    );
  });
});
