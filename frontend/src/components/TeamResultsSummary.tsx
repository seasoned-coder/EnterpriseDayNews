import type { ReactNode } from "react";
import { Clock, Coins, Gauge } from "lucide-react";
import type { TeamResult } from "@/lib/api";
import { formatScreenTime, formatValue } from "@/lib/results";

/**
 * The team's totals on the student page (issue #40): what they've spent and how long their adverts have
 * been on the big screen, so they can see whether it was worth it.
 */
export const TeamResultsSummary = ({ result }: { result: TeamResult }) => (
  <div className="grid grid-cols-3 gap-2 rounded-xl border border-student-border bg-white/[0.03] p-3" aria-label="Your results">
    <Stat icon={<Coins className="h-4 w-4" />} label="Spent" value={String(result.spent)} />
    <Stat icon={<Clock className="h-4 w-4" />} label="Screen time" value={formatScreenTime(result.seconds)} />
    <Stat
      icon={<Gauge className="h-4 w-4" />}
      label="Per minute"
      value={formatValue(result.costPerMinute)}
      hint="What each minute on the big screen cost you. Lower is better value."
    />
  </div>
);

const Stat = ({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) => (
  <div className="min-w-0 text-center" title={hint}>
    <p className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-student-muted">
      {icon}
      {label}
    </p>
    <p className="mt-1 truncate font-display text-lg font-bold text-neon-2">{value}</p>
  </div>
);
