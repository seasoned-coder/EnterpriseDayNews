import { NavLink, useLocation } from "react-router-dom";
import { Newspaper, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface BrandNavProps {
  variant?: "light" | "dark";
}

export const BrandNav = ({ variant = "light" }: BrandNavProps) => {
  const location = useLocation();
  if (location.pathname === "/projector") return null;

  const isDark = variant === "dark";
  const user = api.getCurrentUser();

  const handleLogout = () => {
    api.logout();
  };

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
        <NavLink to="/" className="flex items-center gap-2.5">
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

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end hidden sm:flex">
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
