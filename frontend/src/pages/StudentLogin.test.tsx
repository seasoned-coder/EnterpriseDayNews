import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentLogin from "@/pages/StudentLogin";

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

function renderPage(path = "/student/login") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StudentLogin />
    </MemoryRouter>,
  );
}

describe("StudentLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("labels the fields as the username and password students are given", () => {
    renderPage();

    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.queryByText(/your name|event code/i)).not.toBeInTheDocument();
  });

  it("fills in the team name from the login slip's QR code", () => {
    renderPage("/student/login?team=rocket-lemonade");

    expect(screen.getByLabelText("Username")).toHaveValue("rocket-lemonade");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("stops phone keyboards capitalising or autocorrecting the username", () => {
    renderPage();

    const username = screen.getByLabelText("Username");
    expect(username).toHaveAttribute("autocapitalize", "none");
    expect(username).toHaveAttribute("autocorrect", "off");
    expect(username).toHaveAttribute("autocomplete", "username");
  });

  it("signs in as a student and opens the upload page", async () => {
    mocks.login.mockResolvedValue({ username: "year10-team1", role: "STUDENT" });
    renderPage();

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: " year10-team1 " } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Sunrise7" } });
    fireEvent.click(screen.getByRole("button", { name: /enter portal/i }));

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/student"));
    expect(mocks.login).toHaveBeenCalledWith("year10-team1", "STUDENT", "Sunrise7");
  });

  it("shows the server's friendly message when sign-in fails", async () => {
    mocks.login.mockRejectedValue(new Error("Too many failed attempts. This account is temporarily locked."));
    renderPage();

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "year10-team1" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /enter portal/i }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Login failed",
          description: "Too many failed attempts. This account is temporarily locked.",
        }),
      ),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
