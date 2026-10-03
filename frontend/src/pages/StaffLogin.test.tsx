import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffLogin from "@/pages/StaffLogin";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  toast: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: { login: mocks.login } }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/components/BrandNav", () => ({ BrandNav: () => <nav data-testid="brand-nav" /> }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mocks.navigate,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <StaffLogin />
    </MemoryRouter>,
  );
}

function signIn(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/staff username/i), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("StaffLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not hint at any real staff username", () => {
    renderPage();

    const username = screen.getByLabelText(/staff username/i);
    expect(username).toHaveAttribute("placeholder", "Your staff username");
    expect(document.body.textContent).not.toMatch(/staff1|admin/i);
  });

  it("keeps Sign In disabled until both fields are filled", () => {
    renderPage();

    const button = screen.getByRole("button", { name: /sign in/i });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/staff username/i), { target: { value: "head.teacher" } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Staffroom42" } });
    expect(button).toBeEnabled();
  });

  it("signs in as STAFF and opens the Advert Dashboard", async () => {
    mocks.login.mockResolvedValue({ username: "head.teacher", role: "STAFF" });
    renderPage();

    signIn("  head.teacher ", "Staffroom42");

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/staff"));
    expect(mocks.login).toHaveBeenCalledWith("head.teacher", "STAFF", "Staffroom42");
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Staff Access Granted" }));
  });

  it("shows Access Denied and stays on the page when sign-in fails", async () => {
    mocks.login.mockRejectedValue(new Error("Invalid username or password"));
    renderPage();

    signIn("head.teacher", "wrong");

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Access Denied", variant: "destructive" }),
      ),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
