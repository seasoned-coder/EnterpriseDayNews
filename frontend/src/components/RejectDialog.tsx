import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MAX_REJECTION_REASON, REJECTION_REASONS } from "@/lib/rejectionReasons";
import { cn } from "@/lib/utils";

/**
 * Asks why an advert is being rejected (issue #38): pick a quick reason or write one. The student sees it
 * on their phone. A reason is optional, but encouraged.
 */
export const RejectDialog = ({
  open,
  teamName,
  onCancel,
  onReject,
}: {
  open: boolean;
  teamName?: string;
  onCancel: () => void;
  onReject: (reason: string | null) => void;
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const trimmed = reason.trim();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Why are you rejecting it?</DialogTitle>
          <DialogDescription>
            {teamName ? (
              <>
                <span className="font-semibold text-foreground">{teamName}</span> will see this on their phone,
                so they can fix it and upload it again.
              </>
            ) : (
              "The team will see this on their phone, so they can fix it and upload it again."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2" role="group" aria-label="Quick reasons">
          {REJECTION_REASONS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={reason === preset}
              onClick={() => setReason(preset)}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                reason === preset ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60",
              )}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reject-reason" className="text-sm font-medium">
            Or write your own
          </label>
          <Textarea
            id="reject-reason"
            rows={2}
            maxLength={MAX_REJECTION_REASON}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Kind and specific: what should they change?"
          />
          <p className="text-right text-xs text-muted-foreground">
            {reason.length}/{MAX_REJECTION_REASON}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button variant="outline" className="h-11" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" className="h-11" onClick={() => onReject(trimmed || null)}>
            <X className="mr-2 h-4 w-4" />
            {trimmed ? "Reject with this reason" : "Reject without a reason"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
