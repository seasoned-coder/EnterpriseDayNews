import { NavLink, useLocation } from "react-router-dom";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandNavProps {
  variant?: "light" | "dark";
}

const links = [
  { to: "/student", label: "Student Upload" },
  { to: "/staff", label: "Staff Dashboard" },
  { to: "/projector", label: "Projector" },
];

export const BrandNav = ({ variant = "light" }: BrandNavProps) => {
  const location = useLocation();
  if (location.pathname === "/projector") return null;

  const isDark = variant === "dark";

  return (
    <header
      className={cn(
        "relative z-20 w-full border-b backdrop-blur-md",
        isDark
          ? "border-student-border/60 bg-student-bg/70 text-student-ink"
          : "border-border/70 bg-background/80 text-foreground"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <NavLink to="/student" className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl",
              isDark ? "bg-gradient-neon" : "bg-foreground text-background"
            )}
          >
            <Newspaper className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Enterprise Day <span className={isDark ? "text-gradient-neon" : "text-primary"}>News</span>
          </span>
        </NavLink>

        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4",
                  isDark
                    ? isActive
                      ? "bg-white/10 text-white"
                      : "text-student-muted hover:text-white"
                    : isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <span className="hidden sm:inline">{l.label}</span>
              <span className="sm:hidden">{l.label.split(" ")[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};
