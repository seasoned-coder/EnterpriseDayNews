import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarX, Check, Loader2, X } from "lucide-react";
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
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast({ title: "Reset failed", description: error.message, variant: "destructive" }),
  });

  return (
    <Card className="mx-auto max-w-2xl border-destructive/30 p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <CalendarX className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-destructive">Reset the event</h3>
          <p className="text-sm text-muted-foreground">For the end of the day, or before the next event.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">This will</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {WILL.map((item) => (
              <li key={item} className="flex gap-2">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">This keeps</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {WONT.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-destructive">This can't be undone.</p>

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="arm-reset" className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
          <Switch id="arm-reset" checked={armed} onCheckedChange={setArmed} />
          ARE YOU SURE? Yes, I want to reset the event
        </label>
        <Button variant="destructive" disabled={!armed || reset.isPending} onClick={openConfirm}>
          Clear Down
        </Button>
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
