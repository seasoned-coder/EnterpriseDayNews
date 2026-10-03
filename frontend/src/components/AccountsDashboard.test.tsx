import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiAccount } from "@/lib/api";
import StaffAccountsDashboard from "@/pages/StaffAccountsDashboard";
import StudentAccountsDashboard from "@/pages/StudentAccountsDashboard";

const mocks = vi.hoisted(() => ({
  accountApi: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  setLocked: vi.fn(),
  changePassword: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  accountApi: mocks.accountApi,
  api: { getCurrentUser: () => ({ username: "head.teacher", role: "STAFF" }) },
  formatDateTime: (iso: string | null) => iso ?? "Never",
  formatRelative: () => "just now",
}));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/components/BrandNav", () => ({ BrandNav: () => <nav /> }));
// Tested on its own (TeamSetupPanel.test.tsx); its team picker would repeat the names checked here.
vi.mock("@/components/TeamSetupPanel", () => ({ TeamSetupPanel: () => <div data-testid="team-setup" /> }));
vi.mock("@/components/InvoicesPanel", () => ({ InvoicesPanel: () => <div data-testid="invoices" /> }));
// Tested on its own (TeamBalanceCell.test.tsx).
vi.mock("@/components/TeamBalanceCell", () => ({ TeamBalanceCell: ({ team }: { team: string }) => <span>balance of {team}</span> }));

const account = (id: number, username: string, locked = false): ApiAccount => ({
  id,
  username,
  locked,
  manuallyLocked: locked,
  failedLoginAttempts: 0,
  temporaryLockUntil: null,
  lastLoginAt: null,
  lastLoginIp: null,
  createdAt: "2026-10-03T10:00:00Z",
  updatedAt: "2026-10-03T10:00:00Z",
});

function renderPage(page: JSX.Element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const rowFor = async (username: string) => (await screen.findByText(username)).closest("tr") as HTMLElement;

describe("AccountsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accountApi.mockReturnValue({
      list: mocks.list,
      create: mocks.create,
      setLocked: mocks.setLocked,
      changePassword: mocks.changePassword,
      rename: mocks.rename,
      remove: mocks.remove,
    });
    window.innerWidth = 1024;
  });

  describe("for staff accounts", () => {
    beforeEach(() => {
      mocks.list.mockResolvedValue([account(1, "head.teacher"), account(2, "supply.teacher")]);
    });

    it("uses the staff account API and shows the staff wording and password policy", async () => {
      renderPage(<StaffAccountsDashboard />);

      expect(await screen.findByRole("heading", { name: "Staff Account Dashboard" })).toBeInTheDocument();
      expect(mocks.accountApi).toHaveBeenCalledWith("staff");
      expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add staff account/i })).toBeInTheDocument();
    });

    it("won't let you lock or delete your own account", async () => {
      renderPage(<StaffAccountsDashboard />);

      const mine = await rowFor("head.teacher");
      expect(within(mine).getByText("(you)")).toBeInTheDocument();
      expect(within(mine).getByRole("button", { name: /lock/i })).toBeDisabled();
      expect(within(mine).getByRole("button", { name: /delete/i })).toBeDisabled();
      expect(within(mine).getByRole("button", { name: /password/i })).toBeEnabled();

      const theirs = await rowFor("supply.teacher");
      expect(within(theirs).getByRole("button", { name: /lock/i })).toBeEnabled();
    });

    it("locks another staff account", async () => {
      mocks.setLocked.mockResolvedValue(account(2, "supply.teacher", true));
      renderPage(<StaffAccountsDashboard />);

      fireEvent.click(within(await rowFor("supply.teacher")).getByRole("button", { name: /lock/i }));

      await waitFor(() => expect(mocks.setLocked).toHaveBeenCalledWith(2, true));
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Account locked" }));
    });

    it("deletes another staff account after confirmation", async () => {
      mocks.remove.mockResolvedValue(undefined);
      renderPage(<StaffAccountsDashboard />);

      fireEvent.click(within(await rowFor("supply.teacher")).getByRole("button", { name: /delete/i }));
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText(/Delete staff account\?/)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole("button", { name: /delete account/i }));

      await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(2));
    });

    it("shows the server's reason when something is refused", async () => {
      mocks.create.mockRejectedValue(new Error("Password must be at least 10 characters long"));
      renderPage(<StaffAccountsDashboard />);

      fireEvent.change(await screen.findByLabelText("Username"), { target: { value: "new.teacher" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Short1" } });
      fireEvent.click(screen.getByRole("button", { name: /add staff account/i }));

      await waitFor(() =>
        expect(mocks.toast).toHaveBeenCalledWith(
          expect.objectContaining({ description: "Password must be at least 10 characters long" }),
        ),
      );
    });
  });

  describe("renaming (issue #15)", () => {
    beforeEach(() => {
      mocks.list.mockResolvedValue([account(7, "year10-team1"), account(8, "year10-team2")]);
    });

    it("renames an account, starting from its current name", async () => {
      mocks.rename.mockResolvedValue(account(7, "the-cake-co"));
      renderPage(<StudentAccountsDashboard />);

      fireEvent.click(within(await rowFor("year10-team1")).getByRole("button", { name: /rename/i }));
      const dialog = await screen.findByRole("dialog");
      const field = within(dialog).getByLabelText("New username");
      expect(field).toHaveValue("year10-team1");
      expect(within(dialog).getByRole("button", { name: /save username/i })).toBeDisabled();
      expect(within(dialog).getByText(/even a locked one/)).toBeInTheDocument();

      fireEvent.change(field, { target: { value: "  the-cake-co " } });
      fireEvent.click(within(dialog).getByRole("button", { name: /save username/i }));

      await waitFor(() => expect(mocks.rename).toHaveBeenCalledWith(7, "the-cake-co"));
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Username changed", description: "year10-team1 is now the-cake-co." }),
      );
    });

    it("shows why a name was refused (e.g. already taken)", async () => {
      mocks.rename.mockRejectedValue(new Error('The username "year10-team2" is already taken by another student account'));
      renderPage(<StudentAccountsDashboard />);

      fireEvent.click(within(await rowFor("year10-team1")).getByRole("button", { name: /rename/i }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("New username"), { target: { value: "year10-team2" } });
      fireEvent.click(within(dialog).getByRole("button", { name: /save username/i }));

      await waitFor(() =>
        expect(mocks.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Could not rename account",
            description: 'The username "year10-team2" is already taken by another student account',
          }),
        ),
      );
    });
  });

  describe("on a phone", () => {
    beforeEach(() => {
      window.innerWidth = 375;
      mocks.list.mockResolvedValue([account(7, "year10-team1"), account(8, "year10-team2", true)]);
    });

    it("shows each account as a card with big buttons instead of a wide table", async () => {
      renderPage(<StudentAccountsDashboard />);

      const cards = await screen.findAllByTestId("account-card");
      expect(cards).toHaveLength(2);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      const rename = within(cards[0]).getByRole("button", { name: /rename/i });
      expect(rename).toHaveClass("h-11");
      expect(within(cards[1]).getByRole("button", { name: /unlock/i })).toBeInTheDocument();
    });

    it("renames from a card", async () => {
      mocks.rename.mockResolvedValue(account(8, "renamed-team"));
      renderPage(<StudentAccountsDashboard />);

      const [, second] = await screen.findAllByTestId("account-card");
      fireEvent.click(within(second).getByRole("button", { name: /rename/i }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("New username"), { target: { value: "renamed-team" } });
      fireEvent.click(within(dialog).getByRole("button", { name: /save username/i }));

      await waitFor(() => expect(mocks.rename).toHaveBeenCalledWith(8, "renamed-team"));
    });
  });

  describe("summary tiles", () => {
    beforeEach(() => {
      mocks.list.mockResolvedValue([
        account(1, "active.never.seen"),
        { ...account(2, "active.seen"), lastLoginAt: "2026-10-03T09:00:00Z" },
        account(3, "locked.team", true),
      ]);
    });

    const tile = (name: RegExp) => screen.getByRole("button", { name });
    const shownUsernames = () =>
      screen.queryAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);

    it("count each group and filter the table when clicked", async () => {
      renderPage(<StudentAccountsDashboard />);
      await screen.findByText("locked.team");

      expect(tile(/total accounts/i)).toHaveTextContent("3");
      expect(tile(/^active/i)).toHaveTextContent("2");
      expect(tile(/locked/i)).toHaveTextContent("1");
      expect(tile(/seen at least once/i)).toHaveTextContent("1");

      fireEvent.click(tile(/locked/i));
      expect(tile(/locked/i)).toHaveAttribute("aria-pressed", "true");
      expect(shownUsernames()).toEqual([expect.stringContaining("locked.team")]);

      fireEvent.click(tile(/seen at least once/i));
      expect(shownUsernames()).toEqual([expect.stringContaining("active.seen")]);

      fireEvent.click(tile(/^active/i));
      expect(shownUsernames()).toHaveLength(2);

      fireEvent.click(tile(/total accounts/i));
      expect(shownUsernames()).toHaveLength(3);
      expect(tile(/total accounts/i)).toHaveAttribute("aria-pressed", "true");
    });

    it("works the same on the staff page, with a Show all link", async () => {
      renderPage(<StaffAccountsDashboard />);
      await screen.findByText("locked.team");

      fireEvent.click(tile(/locked/i));
      expect(shownUsernames()).toHaveLength(1);

      fireEvent.click(screen.getByRole("button", { name: "Show all" }));
      expect(shownUsernames()).toHaveLength(3);
    });

    it("explains when a filter matches nobody", async () => {
      mocks.list.mockResolvedValue([account(1, "only.active")]);
      renderPage(<StudentAccountsDashboard />);
      await screen.findByText("only.active");

      fireEvent.click(tile(/locked/i));

      expect(screen.getByText('No accounts match "Locked"')).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Show all accounts" }));
      expect(screen.getByText("only.active")).toBeInTheDocument();
    });
  });

  describe("for student accounts", () => {
    beforeEach(() => {
      mocks.list.mockResolvedValue([account(7, "year10-team1"), account(8, "head.teacher")]);
    });

    it("uses the student account API and doesn't apply the 'not yourself' rule", async () => {
      renderPage(<StudentAccountsDashboard />);

      expect(await screen.findByRole("heading", { name: "Student Account Dashboard" })).toBeInTheDocument();
      expect(mocks.accountApi).toHaveBeenCalledWith("student");
      const sameNameAsStaff = await rowFor("head.teacher");
      expect(within(sameNameAsStaff).queryByText("(you)")).not.toBeInTheDocument();
      expect(within(sameNameAsStaff).getByRole("button", { name: /delete/i })).toBeEnabled();
    });

    it("creates an account and resets a password", async () => {
      mocks.create.mockResolvedValue(account(9, "year10-team2"));
      mocks.changePassword.mockResolvedValue(account(7, "year10-team1"));
      renderPage(<StudentAccountsDashboard />);

      fireEvent.change(await screen.findByLabelText("Username"), { target: { value: "year10-team2" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Sunrise7" } });
      fireEvent.click(screen.getByRole("button", { name: /add student account/i }));
      await waitFor(() => expect(mocks.create).toHaveBeenCalledWith("year10-team2", "Sunrise7"));

      fireEvent.click(within(await rowFor("year10-team1")).getByRole("button", { name: /password/i }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("New password"), { target: { value: "Moonset9" } });
      fireEvent.click(within(dialog).getByRole("button", { name: /save password/i }));
      await waitFor(() => expect(mocks.changePassword).toHaveBeenCalledWith(7, "Moonset9"));
    });
  });
});
