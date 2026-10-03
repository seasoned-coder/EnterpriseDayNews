import type { MouseEvent } from "react";
import { ExternalLink } from "lucide-react";
import { openProjectorWithKey } from "@/lib/results";
import { APP_VERSION } from "@/lib/version";

const LINKS = [
  { href: "/student", label: "Student portal" },
  { href: "/projector", label: "Projector" },
];

/** The projector link also gives the projector its key, so it records screen time (issue #40). */
const openProjector = (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return; // let the browser handle it
  event.preventDefault();
  void openProjectorWithKey().catch(() => undefined); // it still opens, just without recording
};

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
          onClick={link.href === "/projector" ? openProjector : undefined}
          className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
        >
          {link.label}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      ))}
      {/* Which release is running (issue #46), e.g. to check the event server got the latest one. */}
      <span className="ml-auto font-mono" title="The version of the app that's running">
        Version {APP_VERSION}
      </span>
    </nav>
  </footer>
);
