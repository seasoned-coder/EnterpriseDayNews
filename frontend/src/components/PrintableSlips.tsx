import { createPortal } from "react-dom";
import { LoginSlip, type SlipLogin } from "@/components/LoginSlip";
import type { EventDetails } from "@/lib/api";

export type SlipLayout = "receipt" | "a4";

/**
 * Page set-up for each layout. Receipt: one slip per page on 80 mm roll paper, so the printer cuts between
 * slips (Epson driver: paper "Roll Paper 80 x 297 mm", cut "per page"; "Paper reduction" trims the extra
 * length). A4: as many slips as fit, with dashed lines to cut along.
 */
const PAGE_CSS: Record<SlipLayout, string> = {
  receipt: "@page { size: 80mm 150mm; margin: 0; }",
  a4: "@page { size: A4; margin: 10mm; }",
};

/**
 * Prints the slips: everything else on the page is hidden while printing (see index.css), and the page
 * size is set for the chosen layout. Tidies up when the browser's print dialog closes.
 */
export function printSlips(layout: SlipLayout): void {
  const style = document.createElement("style");
  style.dataset.slipPage = layout;
  style.textContent = PAGE_CSS[layout];
  document.head.appendChild(style);
  document.body.classList.add("printing-slips");
  document.body.dataset.slipLayout = layout;

  const cleanUp = () => {
    style.remove();
    document.body.classList.remove("printing-slips");
    delete document.body.dataset.slipLayout;
    window.removeEventListener("afterprint", cleanUp);
  };
  window.addEventListener("afterprint", cleanUp);
  window.print();
}

/** The slips to print, rendered outside the app (straight under <body>) and only visible when printing. */
export const PrintableSlips = ({
  logins,
  details,
  address,
}: {
  logins: SlipLogin[];
  details?: EventDetails;
  address: string;
}) =>
  createPortal(
    <div className="print-slips" data-testid="printable-slips">
      {logins.map((login) => (
        <LoginSlip key={login.username} login={login} details={details} address={address} />
      ))}
    </div>,
    document.body,
  );
