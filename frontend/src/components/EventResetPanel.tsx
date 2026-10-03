import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX, Check, FileText, Loader2, Printer, X } from "lucide-react";
import { AsciiExplosion } from "@/components/AsciiExplosion";
import { EndOfDayReport } from "@/components/EndOfDayReport";
import { PrintArea, printPages, type PrintLayout } from "@/components/PrintArea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

/** Typed in the final step, so a reset never happens by accident. */
const CONFIRM_PHRASE = "clear down";


const WILL = [
  "Delete every student advert (new, approved and rejected) and its picture",
  "Delete the recorded screen time (print the Results first)",
  "Clear every team's balance and payments (print the report first)",
  "Put prices and the projector settings back to normal",
];
const WONT = ["Event Communications items (staff images and messages)", "Student and staff accounts"];

/**
 * End of Day (issue #34): reset the event. Three deliberate steps: turn on the "Yes, I want to reset
 * the event" switch, select the red Clear Down button, then type "clear down" and confirm.
 */
export const EventResetPanel = () => {
  const queryClient = useQueryClient();
  const [armed, setArmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  /** How many adverts the last reset deleted; shows the explosion until the switch is used again. */
  const [lastReset, setLastReset] = useState<number | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  // The End of Day report (issue #48): Clear Down only unlocks once it has been printed.
  const balancesQ = useQuery({ queryKey: ["balances"], queryFn: api.balances });
  const [reportJob, setReportJob] = useState<PrintLayout | null>(null);
  const [reportPrinted, setReportPrinted] = useState(false);
  useEffect(() => {
    if (!reportJob) return;
    printPages(reportJob);
    setReportPrinted(true);
    const done = () => setReportJob(null);
    window.addEventListener("afterprint", done, { once: true });
    return () => window.removeEventListener("afterprint", done);
  }, [reportJob]);

  // On narrow screens the result sits below the controls: bring it into view when it appears.
  useEffect(() => {
    if (lastReset !== null) resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [lastReset]);

  const openConfirm = () => {
    setTyped("");
    setConfirming(true);
  };

  const reset = useMutation({
    mutationFn: api.resetEvent,
    onSuccess: ({ deletedAdverts }) => {
      toast({
        title: "Event reset",
        description: `${deletedAdverts} advert${deletedAdverts === 1 ? "" : "s"} deleted and projector settings restored.`,
      });
      setConfirming(false);
      setArmed(false);
      setReportPrinted(false); // a fresh start: the next reset needs a fresh report
      setLastReset(deletedAdverts);
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast({ title: "Reset failed", description: error.message, variant: "destructive" }),
  });

  return (
    // Two columns on wider screens so the explanation, the controls AND the result all fit on screen.
    <Card className="mx-auto grid max-w-5xl gap-5 border-destructive/30 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <CalendarX className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-destructive">Reset the event</h3>
            <p className="text-sm text-muted-foreground">For the end of the day, or before the next event.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">This will</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {WILL.map((item) => (
                <li key={item} className="flex gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">This keeps</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {WONT.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-sm font-medium text-destructive">This can't be undone.</p>

        {/* Step 1 (issue #48): print what each company owes and paid, before it's wiped. */}
        <div className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" /> 1. Print the End of Day report
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Each company's adverts, what it paid and what it still owes. Clear Down wipes all of this, so print it
            first.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!balancesQ.data} onClick={() => setReportJob("receipt-roll")}>
              <Printer className="mr-2 h-4 w-4" /> Till printer
            </Button>
            <Button size="sm" variant="outline" disabled={!balancesQ.data} onClick={() => setReportJob("a4-sheet")}>
              A4 paper
            </Button>
            {reportPrinted && (
              <span className="flex items-center gap-1 text-xs text-success">
                <Check className="h-3.5 w-3.5" /> Printed
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label
            htmlFor="arm-reset"
            className={`flex items-center gap-3 text-sm font-semibold ${reportPrinted ? "cursor-pointer" : "opacity-60"}`}
            title={reportPrinted ? undefined : "Print the End of Day report first"}
          >
            <Switch
              id="arm-reset"
              disabled={!reportPrinted}
              checked={armed}
              onCheckedChange={(on) => {
                setArmed(on);
                if (on) setLastReset(null);
              }}
            />
            2. ARE YOU SURE? Yes, I want to reset the event
          </label>
          <Button variant="destructive" disabled={!armed || reset.isPending} onClick={openConfirm}>
            Clear Down
          </Button>
        </div>
      </div>

      {/* Result area: beside the controls on wide screens, scrolled into view on narrow ones. */}
      <div
        ref={resultRef}
        className="flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-destructive/30 bg-foreground p-4 text-center text-background"
      >
        {lastReset === null ? (
          <p className="text-sm opacity-60">The result of a reset will appear here.</p>
        ) : (
          <div role="status">
            <AsciiExplosion className="inline-block text-left font-mono text-[10px] leading-tight text-orange-300 sm:text-xs" />
            <p className="mt-2 font-display text-lg font-bold">Event reset complete</p>
            <p className="text-sm opacity-80">
              {lastReset} advert{lastReset === 1 ? "" : "s"} deleted · projector settings back to defaults
            </p>
          </div>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={(open) => !open && setConfirming(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Reset the event now?</DialogTitle>
            <DialogDescription>
              All student adverts, screen time, balances and payments will be deleted, and prices and the
              projector settings restored to normal. Staff messages and accounts are kept. To confirm, type{" "}
              <span className="font-bold text-foreground">{CONFIRM_PHRASE}</span> below.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label={`Type ${CONFIRM_PHRASE} to confirm`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={`Type '${CONFIRM_PHRASE}' to confirm`}
            autoComplete="off"
            autoCapitalize="none"
            className="h-12 border-destructive/30 text-base focus-visible:ring-destructive"
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={reset.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => reset.mutate()}
              disabled={reset.isPending || typed.trim().toLowerCase() !== CONFIRM_PHRASE}
            >
              {reset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, reset the event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {reportJob && balancesQ.data && (
        <PrintArea>
          <EndOfDayReport teams={balancesQ.data} />
        </PrintArea>
      )}
    </Card>
  );
};
