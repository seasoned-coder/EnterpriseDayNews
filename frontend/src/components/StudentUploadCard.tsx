import { EyeOff, Loader2, MessageCircle, MonitorUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, formatRelative, type ApiSubmission } from "@/lib/api";
import { formatPlays, formatScreenTime } from "@/lib/results";

interface Publishing {
  /** What the badge says. */
  label: string;
  badgeClass: string;
  /** A short explanation under the badge. */
  hint: string;
  /** The button that changes it, if any: what to send and what the button says. */
  action?: { published: boolean; text: string };
}

/**
 * Where an advert is in its life, in student-friendly words, and what they can do next (issue #9).
 * Staff approve; the student decides when an approved advert is on screen.
 */
export function publishingState(upload: ApiSubmission): Publishing {
  switch (upload.status) {
    case "NEW":
      return upload.publishOnApproval
        ? {
            label: "Waiting for approval",
            badgeClass: "bg-yellow-500/20 text-yellow-400",
            hint: "It goes on the big screen as soon as a teacher approves it.",
            action: { published: false, text: "Keep it off screen" },
          }
        : {
            label: "Waiting for approval",
            badgeClass: "bg-yellow-500/20 text-yellow-400",
            hint: "Once a teacher approves it, you choose when it goes on screen.",
            action: { published: true, text: "Publish when approved" },
          };
    case "APPROVED":
      return upload.display
        ? {
            label: "On screen",
            badgeClass: "bg-blue-500/20 text-blue-400",
            hint: "It's in the mix on the big screen right now.",
            action: { published: false, text: "Withdraw" },
          }
        : {
            label: "Approved",
            badgeClass: "bg-green-500/20 text-green-400",
            hint: "Ready when you are: it isn't on the big screen yet.",
            action: { published: true, text: "Publish now" },
          };
    default:
      return {
        label: "Not approved",
        badgeClass: "bg-red-500/20 text-red-400",
        // With a reason (issue #38), the card shows it in a box instead.
        hint: upload.rejectionReason
          ? "Fix it and upload a new version: it'll be checked again."
          : "A teacher said no. Ask a member of staff if you're not sure why.",
      };
  }
}

interface StudentUploadCardProps {
  upload: ApiSubmission;
  /** How often and for how long it has been on the big screen (issue #40). */
  screenTime?: { plays: number; seconds: number };
  busy: boolean;
  onSetPublished: (upload: ApiSubmission, published: boolean) => void;
  onDelete: (upload: ApiSubmission) => void;
}

export const StudentUploadCard = ({ upload, screenTime, busy, onSetPublished, onDelete }: StudentUploadCardProps) => {
  const state = publishingState(upload);
  const goesLive = state.action?.published;

  return (
    <div className="rounded-xl border border-student-border bg-white/[0.03] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-medium text-student-ink">{upload.originalFileName}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={() => onDelete(upload)}
          disabled={busy}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
      <img src={api.imageUrl(upload)} alt={upload.originalFileName} className="mb-3 aspect-video w-full rounded-lg object-cover" />
      <div className="space-y-2">
        <Badge className={state.badgeClass}>{state.label}</Badge>
        {upload.status === "REJECTED" && upload.rejectionReason && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-student-ink">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-300">
              <MessageCircle className="h-3.5 w-3.5" /> Teacher's note
            </p>
            <p className="mt-1">{upload.rejectionReason}</p>
          </div>
        )}
        <p className="text-xs text-student-muted">{state.hint}</p>
        {state.action && (
          <Button
            type="button"
            size="sm"
            variant={goesLive ? "default" : "outline"}
            className={
              goesLive
                ? "h-10 w-full bg-gradient-neon text-white"
                : "h-10 w-full border-student-border bg-transparent text-student-ink hover:bg-white/10"
            }
            disabled={busy}
            onClick={() => onSetPublished(upload, state.action!.published)}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : goesLive ? (
              <MonitorUp className="mr-2 h-4 w-4" />
            ) : (
              <EyeOff className="mr-2 h-4 w-4" />
            )}
            {state.action.text}
          </Button>
        )}
        {upload.status === "APPROVED" && (
          <p className="text-xs font-medium text-student-ink">
            {formatPlays(screenTime?.plays ?? 0)}
            {screenTime && screenTime.seconds > 0 && ` · ${formatScreenTime(screenTime.seconds)} on screen`}
          </p>
        )}
        <p className="text-xs text-student-muted">{formatRelative(upload.uploadedAt)}</p>
        <div className="flex items-center justify-between text-xs">
          <span>
            Priority: <span className="font-semibold text-neon-2">{upload.priority}</span>
          </span>
          <span>
            Duration: <span className="font-semibold text-neon-2">{upload.durationSeconds}s</span>
          </span>
          <span>
            Cost: <span className="font-semibold text-neon-2">{upload.totalCost}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
