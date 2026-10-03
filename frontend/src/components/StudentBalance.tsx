import { Landmark } from "lucide-react";
import type { TeamAccount } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * The team's balance on the student page (issue #48): what it owes the (virtual) bank for approved adverts.
 * A teacher takes it from the team's bank account and marks it paid.
 */
export const StudentBalance = ({ account }: { account: TeamAccount }) => {
  const { owed, paid } = account.balance;
  return (
    <div
      aria-label="Your balance"
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        owed > 0 ? "border-amber-400/40 bg-amber-500/10" : "border-student-border bg-white/[0.03]",
      )}
    >
      <Landmark className={cn("mt-0.5 h-5 w-5 shrink-0", owed > 0 ? "text-amber-300" : "text-student-muted")} />
      <div className="text-sm text-student-ink">
        {owed > 0 ? (
          <>
            <p className="font-display text-base font-bold">You owe {owed}</p>
            <p className="text-xs text-student-muted">
              For your approved adverts. A teacher will take it from your team's bank account
              {paid > 0 && ` (you've paid ${paid} so far)`}.
            </p>
          </>
        ) : owed < 0 ? (
          <p className="font-display text-base font-bold">You're in credit: {-owed}</p>
        ) : (
          <>
            <p className="font-display text-base font-bold">Nothing owed {paid > 0 && "✓"}</p>
            <p className="text-xs text-student-muted">
              {paid > 0 ? `All paid: ${paid} so far.` : "You pay for adverts once a teacher approves them."}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
