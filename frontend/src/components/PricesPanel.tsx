import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { api, type PriceList } from "@/lib/api";
import { todayAt, untilText, WOBBLE_PRESETS, wobbleHeadline } from "@/lib/priceWobble";
import { cn } from "@/lib/utils";

const MIN = 25;
const MAX = 300;

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * The Prices tab (issue #41): the price list, and the "price wobble": make every price go up or down for a
 * while, now or at a set time. Students see it straight away; the price is locked in when they upload.
 */
export const PricesPanel = () => {
  const qc = useQueryClient();
  const [percent, setPercent] = useState(50);
  const [message, setMessage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const wobbleQ = useQuery({ queryKey: ["price-wobble"], queryFn: api.priceWobble, refetchInterval: 30_000 });
  const validPercent = Number.isInteger(percent) && percent >= MIN && percent <= MAX;
  const normalQ = useQuery({ queryKey: ["staff-prices", 100], queryFn: () => api.staffPrices(100) });
  const previewQ = useQuery({
    queryKey: ["staff-prices", percent],
    queryFn: () => api.staffPrices(percent),
    enabled: validPercent,
  });
  const wobble = wobbleQ.data;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["price-wobble"] });
  };

  const start = useMutation({
    mutationFn: () =>
      api.setPriceWobble({
        percent,
        message: message.trim() || null,
        startsAt: todayAt(startTime),
        endsAt: todayAt(endTime),
      }),
    onSuccess: (saved) => {
      toast({
        title: saved.activeNow ? "Prices changed" : "Price wobble scheduled",
        description: saved.activeNow
          ? `${wobbleHeadline(saved.percent)} Students see the new prices now.`
          : `Starts at ${saved.startsAt ? timeOf(saved.startsAt) : "the set time"}.`,
      });
      refresh();
    },
    onError: (e: Error) => toast({ title: "Couldn't change prices", description: e.message, variant: "destructive" }),
  });

  const stop = useMutation({
    mutationFn: api.stopPriceWobble,
    onSuccess: () => {
      toast({ title: "Back to normal prices" });
      refresh();
    },
    onError: (e: Error) => toast({ title: "Couldn't change prices", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="max-w-3xl p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
        <Tags className="h-5 w-5 text-primary" /> Prices
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Make screen time cheaper at quiet times or dearer in a rush, so teams make real supply-and-demand
        decisions. Students see the change straight away. Each advert keeps the price it was uploaded at.
      </p>

      {/* Now */}
      <div
        className={cn(
          "mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4",
          wobble ? "border-primary/40 bg-primary/5" : "border-border",
        )}
        role="status"
      >
        <div className="text-sm">
          {!wobble ? (
            <span>
              <b>Normal prices</b> right now.
            </span>
          ) : wobble.activeNow ? (
            <span>
              <b>{wobbleHeadline(wobble.percent)}</b> ({wobble.percent}% of normal) {untilText(wobble.endsAt) || "until you stop it"}.
              {wobble.message && <span className="block text-muted-foreground">Message: "{wobble.message}"</span>}
            </span>
          ) : (
            <span>
              Scheduled: <b>{wobbleHeadline(wobble.percent)}</b> from {wobble.startsAt && timeOf(wobble.startsAt)}
              {wobble.endsAt && ` to ${timeOf(wobble.endsAt)}`}. Normal prices until then.
            </span>
          )}
        </div>
        {wobble && (
          <Button variant="outline" size="sm" onClick={() => stop.mutate()} disabled={stop.isPending}>
            <RotateCcw className="mr-2 h-4 w-4" /> Back to normal prices
          </Button>
        )}
      </div>

      {/* Set a wobble */}
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (validPercent) start.mutate();
        }}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Prices</p>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick choices">
            {WOBBLE_PRESETS.map((p) => (
              <button
                key={p.percent}
                type="button"
                aria-pressed={percent === p.percent}
                onClick={() => setPercent(p.percent)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium",
                  percent === p.percent ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                )}
              >
                {p.label}
              </button>
            ))}
            <label className="flex items-center gap-2 text-sm">
              or
              <Input
                aria-label="Percent of normal price"
                type="number"
                min={MIN}
                max={MAX}
                className="h-9 w-24"
                value={Number.isNaN(percent) ? "" : percent}
                onChange={(e) => setPercent(e.target.valueAsNumber)}
              />
              % of normal
            </label>
          </div>
          {!validPercent && <p className="text-xs text-destructive">Choose {MIN}% to {MAX}% of normal.</p>}
        </div>

        <label className="block space-y-1.5 text-sm font-medium">
          <span>Message for students (optional)</span>
          <Input
            maxLength={120}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={percent < 100 ? "Quiet-time sale!" : "Lunchtime rush!"}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Starts</span>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <span className="block text-xs font-normal text-muted-foreground">Leave empty to start now.</span>
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Ends</span>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <span className="block text-xs font-normal text-muted-foreground">Leave empty to run until you stop it.</span>
          </label>
        </div>

        {/* What it would cost */}
        {validPercent && previewQ.data && normalQ.data && (
          <PricePreview normal={normalQ.data} wobbled={previewQ.data} percent={percent} />
        )}

        <Button type="submit" disabled={!validPercent || start.isPending}>
          {start.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {startTime ? "Schedule the price change" : wobble ? "Change prices now (replaces the current one)" : "Change prices now"}
        </Button>
      </form>
    </Card>
  );
};

/** Normal and wobbled price of each choice side by side. */
const PricePreview = ({ normal, wobbled, percent }: { normal: PriceList; wobbled: PriceList; percent: number }) => (
  <div className="overflow-x-auto rounded-lg border border-border">
    <table className="w-full text-sm" aria-label="Price preview">
      <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="px-3 py-2">Choice</th>
          <th className="px-3 py-2 text-right">Normal</th>
          <th className="px-3 py-2 text-right">At {percent}%</th>
        </tr>
      </thead>
      <tbody>
        {normal.priority.map((o, i) => (
          <tr key={`p${o.value}`} className="border-t border-border">
            <td className="px-3 py-1.5">Priority {o.value}</td>
            <td className="px-3 py-1.5 text-right">{o.cost}</td>
            <td className="px-3 py-1.5 text-right font-semibold">{wobbled.priority[i]?.cost}</td>
          </tr>
        ))}
        {normal.durationSeconds.map((o, i) => (
          <tr key={`d${o.value}`} className="border-t border-border">
            <td className="px-3 py-1.5">{o.value} seconds</td>
            <td className="px-3 py-1.5 text-right">{o.cost}</td>
            <td className="px-3 py-1.5 text-right font-semibold">{wobbled.durationSeconds[i]?.cost}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
