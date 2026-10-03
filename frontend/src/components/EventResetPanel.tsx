import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarX, Check, Loader2, X } from "lucide-react";
import { AsciiExplosion } from "@/components/AsciiExplosion";
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
  "Put the projector settings back to their defaults",
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

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="arm-reset" className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
            <Switch
              id="arm-reset"
              checked={armed}
              onCheckedChange={(on) => {
                setArmed(on);
                if (on) setLastReset(null);
              }}
            />
            ARE YOU SURE? Yes, I want to reset the event
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
              All student adverts will be deleted and the projector settings restored to their defaults. Staff
              messages and accounts are kept. To confirm, type{" "}
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
    </Card>
  );
};
