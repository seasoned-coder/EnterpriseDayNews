import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * How things print (issues #37, #40):
 * - receipt: 80 mm till paper (Epson TM-T88), one item per page so the printer cuts between them. Epson
 *   driver: roll paper 80 mm, cut per page, "paper reduction" to trim the extra length.
 * - receipt-roll: 80 mm till paper, items one after another (e.g. a long leaderboard).
 * - a4-cards: as many items as fit on A4, with dashed lines to cut along.
 * - a4-sheet: a normal A4 page.
 */
export type PrintLayout = "receipt" | "receipt-roll" | "a4-cards" | "a4-sheet";

const PAGE_CSS: Record<PrintLayout, string> = {
  receipt: "@page { size: 80mm 150mm; margin: 0; }",
  "receipt-roll": "@page { size: 80mm 297mm; margin: 0; }",
  "a4-cards": "@page { size: A4; margin: 10mm; }",
  "a4-sheet": "@page { size: A4; margin: 15mm; }",
};

/**
 * Prints what's in the PrintArea: everything else on the page is hidden while printing (see index.css), and
 * the page size is set for the layout. Tidies up when the browser's print dialog closes.
 */
export function printPages(layout: PrintLayout): void {
  const style = document.createElement("style");
  style.dataset.printPage = layout;
  style.textContent = PAGE_CSS[layout];
  document.head.appendChild(style);
  document.body.classList.add("printing");
  document.body.dataset.printLayout = layout;

  const cleanUp = () => {
    style.remove();
    document.body.classList.remove("printing");
    delete document.body.dataset.printLayout;
    window.removeEventListener("afterprint", cleanUp);
  };
  window.addEventListener("afterprint", cleanUp);
  window.print();
}

/** What to print, rendered outside the app (straight under <body>) and only visible when printing. */
export const PrintArea = ({ children }: { children: ReactNode }) =>
  createPortal(
    <div className="print-area" data-testid="print-area">
      {children}
    </div>,
    document.body,
  );
