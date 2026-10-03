import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandNav } from "@/components/BrandNav";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getCurrentUser: mocks.getCurrentUser,
    logout: mocks.logout,
  },
}));

function renderNav(props: Parameters<typeof BrandNav>[0], path = "/staff") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BrandNav {...props} />
    </MemoryRouter>,
  );
}

describe("BrandNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockReturnValue({ username: "admin", role: "STAFF" });
  });

  it("renders the secondary link with both the full and the phone-width label", () => {
    renderNav({
      secondaryLink: { to: "/staff/students", label: "Student accounts", shortLabel: "Students" },
    });

    const link = screen.getByRole("link", { name: /students/i });
    expect(link).toHaveAttribute("href", "/staff/students");
    // Phone-width label is visible by default; the full label takes over from the `sm` breakpoint.
    expect(screen.getByText("Students")).toHaveClass("sm:hidden");
    expect(screen.getByText("Student accounts")).toHaveClass("hidden", "sm:inline");
  });

  it("keeps the secondary link visible on phone-width screens", () => {
    renderNav({ secondaryLink: { to: "/staff", label: "Back to Advert Dashboard", shortLabel: "Adverts" } });

    const link = screen.getByRole("link", { name: /adverts/i });
    expect(link).toHaveAttribute("href", "/staff");
    expect(link).not.toHaveClass("hidden");
  });

  it("falls back to the full label when no short label is given", () => {
    renderNav({ secondaryLink: { to: "/staff", label: "Back to Advert Dashboard" } });

    expect(screen.getByRole("link", { name: "Back to Advert Dashboard" })).toHaveAttribute("href", "/staff");
  });

  it("hides the secondary link and sign-out when nobody is signed in", () => {
    mocks.getCurrentUser.mockReturnValue(null);
    renderNav({ secondaryLink: { to: "/staff/students", label: "Student accounts" } });

    expect(screen.queryByRole("link", { name: "Student accounts" })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Logout")).not.toBeInTheDocument();
  });

  it("renders nothing on the projector", () => {
    const { container } = renderNav({}, "/projector");
    expect(container).toBeEmptyDOMElement();
  });
});
