import { NavLink, useLocation } from "react-router-dom";
import { Newspaper, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { NavItem } from "@/lib/staffNav";

interface BrandNavProps {
  variant?: "light" | "dark";
  /** Section links; the one for the current page is highlighted. */
  links?: NavItem[];
}

export const BrandNav = ({ variant = "light", links = [] }: BrandNavProps) => {
  const location = useLocation();
  if (location.pathname === "/projector") return null;

  const isDark = variant === "dark";
  // The dark (student) and light (staff) banners each show their own role's session.
  const role = isDark ? "STUDENT" : "STAFF";
  const user = api.getCurrentUser(role);

  const handleLogout = () => {
    api.logout(role);
  };

  return (
    // Sticky: the banner (section links, sign-out) stays pinned to the top while the page scrolls.
    <header
      className={cn(
        "sticky top-0 z-30 w-full border-b backdrop-blur-md",
        isDark
          ? "border-student-border/60 bg-student-bg/70 text-student-ink"
          : "border-border/70 bg-background/80 text-foreground"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <NavLink to="/" className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
              isDark ? "bg-gradient-neon" : "bg-foreground text-background"
            )}
          >
            <Newspaper className="h-5 w-5" />
          </span>
          {/* On phones the section links need the room, so only the logo shows. */}
          <span
            className={cn(
              "truncate font-display text-lg font-bold tracking-tight",
              user && links.length > 1 && "hidden md:inline"
            )}
          >
            BT Enterprise Day <span className={isDark ? "text-gradient-neon" : "text-primary"}>News</span>
          </span>
        </NavLink>

        {user && (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {links.length > 0 && (
              <nav aria-label="Sections" className="flex items-center gap-1.5">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end
                    className={({ isActive }) =>
                      cn(
                        "inline-flex rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                        isDark
                          ? "border-student-border/70 bg-white/[0.04] text-student-ink hover:bg-white/[0.08]"
                          : "border-border bg-card text-foreground hover:bg-muted",
                        isActive && (isDark ? "bg-white/[0.12]" : "border-primary/40 bg-primary/10 text-primary")
                      )
                    }
                  >
                    {link.shortLabel ? (
                      <>
                        <span className="lg:hidden">{link.shortLabel}</span>
                        <span className="hidden lg:inline">{link.label}</span>
                      </>
                    ) : (
                      link.label
                    )}
                  </NavLink>
                ))}
              </nav>
            )}
            <div className="hidden sm:flex sm:flex-col sm:items-end">
              <span className="text-xs font-medium uppercase tracking-wider opacity-60">Signed in as</span>
              <span className="text-sm font-bold">{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                isDark ? "hover:bg-white/10 text-student-ink" : "hover:bg-black/5 text-foreground"
              )}
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
