import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Printer, Trophy } from "lucide-react";
import { PrintArea, usePrintJob } from "@/components/PrintArea";
import { LeaderboardReceipt, TeamReceipt } from "@/components/ResultsReceipts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, formatRelative, type TeamResult } from "@/lib/api";
import { formatScreenTime, formatValue } from "@/lib/results";
import { cn } from "@/lib/utils";

type SortKey = "seconds" | "spent" | "value";

const SORTS: { key: SortKey; label: string; compare: (a: TeamResult, b: TeamResult) => number }[] = [
  { key: "seconds", label: "Most screen time", compare: (a, b) => b.seconds - a.seconds },
  { key: "spent", label: "Most spent", compare: (a, b) => b.spent - a.spent },
  {
    key: "value",
    label: "Best value",
    // Lowest cost per minute first; teams not shown yet go last.
    compare: (a, b) => (a.costPerMinute ?? Infinity) - (b.costPerMinute ?? Infinity),
  },
];

/**
 * The Results tab (issue #40): each team's spend and screen time as a leaderboard, printable on the till
 * printer or A4, with a receipt per team to hand out.
 */
export const ResultsPanel = () => {
  const [sort, setSort] = useState<SortKey>("seconds");
  const { job, print } = usePrintJob<"leaderboard" | "receipts">();
  const resultsQ = useQuery({ queryKey: ["results"], queryFn: api.eventResults, refetchInterval: 30_000 });
  const teams = useMemo(() => resultsQ.data?.teams ?? [], [resultsQ.data]);
  // Rankings for receipts are always by screen time (the server's order).
  const rankOf = useMemo(() => new Map(teams.map((t, i) => [t.team, i + 1])), [teams]);
  const sorted = useMemo(
    () => [...teams].sort(SORTS.find((s) => s.key === sort)!.compare),
    [teams, sort],
  );

  const lastPlayAt = resultsQ.data?.lastPlayAt ?? null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
            <Trophy className="h-5 w-5 text-primary" /> Results
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            What each team got for its money: event money spent on approved adverts, and how long they were on the
            big screen. <span className="font-medium text-foreground">Per min</span> is the cost of each minute on
            screen (lower is better value).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={teams.length === 0} onClick={() => print("leaderboard", "receipt-roll")}>
            <Printer className="mr-2 h-4 w-4" /> Leaderboard: till
          </Button>
          <Button
            variant="outline"
            disabled={teams.length === 0}
            onClick={() => print("leaderboard", "a4-sheet")}
          >
            Leaderboard: A4
          </Button>
          <Button
            variant="outline"
            disabled={teams.length === 0}
            onClick={() => print("receipts", "receipt")}
          >
            <Printer className="mr-2 h-4 w-4" /> Team receipts: till
          </Button>
          <Button
            variant="outline"
            disabled={teams.length === 0}
            onClick={() => print("receipts", "a4-cards")}
          >
            Team receipts: A4
          </Button>
        </div>
      </div>

      {/* Is the projector recording? It only does when opened from the staff app (Projector tab). */}
      {resultsQ.data && (
        <p
          className={cn(
            "mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
            lastPlayAt ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-800",
          )}
        >
          {lastPlayAt ? (
            <>The projector last recorded a showing {formatRelative(lastPlayAt)}.</>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No showings recorded yet. To record screen time, open the projector with <b>Open the projector</b> on the
              Projector tab.
            </>
          )}
        </p>
      )}

      <div className="mt-4 inline-flex rounded-lg border border-border p-1" role="group" aria-label="Sort by">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={sort === s.key}
            onClick={() => setSort(s.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              sort === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {resultsQ.isLoading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading results…
        </p>
      ) : resultsQ.isError ? (
        <p className="mt-6 text-sm text-destructive">Couldn't load the results: {(resultsQ.error as Error).message}</p>
      ) : teams.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No results yet: teams appear here once they upload adverts.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Adverts</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Shown</TableHead>
                <TableHead className="text-right">Screen time</TableHead>
                <TableHead className="text-right">Per min</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((t, i) => (
                <TableRow key={t.team}>
                  <TableCell className="font-medium">{i + 1}</TableCell>
                  <TableCell className="font-medium [overflow-wrap:anywhere]">{t.team}</TableCell>
                  <TableCell className="text-right">{t.adverts}</TableCell>
                  <TableCell className="text-right">{t.spent}</TableCell>
                  <TableCell className="text-right">{t.plays}</TableCell>
                  <TableCell className="text-right">{formatScreenTime(t.seconds)}</TableCell>
                  <TableCell className="text-right">{formatValue(t.costPerMinute)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {job && (
        <PrintArea>
          {job.what === "leaderboard" ? (
            <LeaderboardReceipt teams={teams} />
          ) : (
            teams.map((t) => (
              <TeamReceipt key={t.team} result={t} rank={rankOf.get(t.team) ?? 0} teamCount={teams.length} />
            ))
          )}
        </PrintArea>
      )}
    </Card>
  );
};
