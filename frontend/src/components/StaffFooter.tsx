import { ExternalLink } from "lucide-react";

const LINKS = [
  { href: "/student", label: "Student portal" },
  { href: "/projector", label: "Projector" },
];

/** Quiet footer on staff pages: quick links to see what students and the big screen see. */
export const StaffFooter = () => (
  <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
    <nav
      aria-label="Other apps"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground"
    >
      <span>Open in a new tab:</span>
      {LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
        >
          {link.label}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      ))}
    </nav>
  </footer>
);
