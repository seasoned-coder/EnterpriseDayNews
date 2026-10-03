import { TrendingDown, TrendingUp } from "lucide-react";
import type { PriceWobble } from "@/lib/api";
import { untilText, wobbleHeadline } from "@/lib/priceWobble";
import { cn } from "@/lib/utils";

/**
 * On the student upload page while staff have prices up or down (issue #41): what's happening, until when,
 * and that the price is fixed when you send it.
 */
export const PriceWobbleBanner = ({ wobble }: { wobble: PriceWobble }) => {
  const sale = wobble.percent < 100;
  const until = untilText(wobble.endsAt);
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        sale ? "border-emerald-400/40 bg-emerald-500/10" : "border-amber-400/40 bg-amber-500/10",
      )}
    >
      {sale ? (
        <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
      ) : (
        <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
      )}
      <div className="text-sm text-student-ink">
        <p className="font-display text-base font-bold">
          {wobbleHeadline(wobble.percent)}
          {until && <span className="font-sans text-sm font-medium text-student-muted"> {until}</span>}
        </p>
        {wobble.message && <p className="mt-0.5">{wobble.message}</p>}
        <p className="mt-1 text-xs text-student-muted">
          The prices below already include this. You pay the price shown when you send your advert.
        </p>
      </div>
    </div>
  );
};
