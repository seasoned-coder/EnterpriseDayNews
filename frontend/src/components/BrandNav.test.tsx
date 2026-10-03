import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandNav } from "@/components/BrandNav";
import { STAFF_NAV } from "@/lib/staffNav";

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

  it("shows every staff section with full and phone-width labels", () => {
    renderNav({ links: STAFF_NAV });

    for (const [name, href] of [
      [/adverts/i, "/staff"],
      [/students/i, "/staff/students"],
      [/^staff/i, "/staff/staff-accounts"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.getByText("Students")).toHaveClass("lg:hidden");
    expect(screen.getByText("Student accounts")).toHaveClass("hidden", "lg:inline");
  });

  it("highlights only the current section", () => {
    renderNav({ links: STAFF_NAV }, "/staff/staff-accounts");

    expect(screen.getByRole("link", { name: /^staff/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /adverts/i })).not.toHaveAttribute("aria-current");
  });

  it("keeps section links visible on phones and makes room by hiding the title", () => {
    renderNav({ links: STAFF_NAV });

    expect(screen.getByRole("link", { name: /adverts/i })).not.toHaveClass("hidden");
    expect(screen.getByText(/BT Enterprise Day/)).toHaveClass("hidden", "md:inline");
  });

  it("uses the full label when there is no short one", () => {
    renderNav({ links: [{ to: "/staff", label: "Back to Advert Dashboard" }] });

    expect(screen.getByRole("link", { name: "Back to Advert Dashboard" })).toHaveAttribute("href", "/staff");
  });

  it("hides links and sign-out when nobody is signed in", () => {
    mocks.getCurrentUser.mockReturnValue(null);
    renderNav({ links: STAFF_NAV });

    expect(screen.queryByRole("navigation", { name: "Sections" })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Logout")).not.toBeInTheDocument();
  });

  it("cuts long usernames short instead of breaking the banner", () => {
    const longName = "christopher.long-borthwicksmith";
    mocks.getCurrentUser.mockReturnValue({ username: longName, role: "STAFF" });
    renderNav({ links: STAFF_NAV });

    const name = screen.getByTestId("signed-in-user");
    expect(name).toHaveClass("truncate");
    expect(name).toHaveAttribute("title", longName);
    expect(name.parentElement).toHaveClass("max-w-[9rem]", "min-w-0");
  });

  it("stays pinned to the top while the page scrolls", () => {
    renderNav({ links: STAFF_NAV });

    expect(screen.getByRole("banner")).toHaveClass("sticky", "top-0");
  });

  it("renders nothing on the projector", () => {
    const { container } = renderNav({}, "/projector");
    expect(container).toBeEmptyDOMElement();
  });
});
