import { Check, X, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, formatRelative, type ApiSubmission } from "@/lib/api";

interface SubmissionCardProps {
  submission: ApiSubmission;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onClick?: (s: ApiSubmission) => void;
  busy?: boolean;
}

const statusStyles: Record<ApiSubmission["status"], string> = {
  PENDING: "bg-warning/15 text-warning-foreground border-warning/30",
  APPROVED: "bg-success/10 text-success border-success/20",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabel: Record<ApiSubmission["status"], string> = {
  PENDING: "New",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const SubmissionCard = ({ submission, onApprove, onReject, onClick, busy }: SubmissionCardProps) => {
  return (
    <Card
      onClick={() => onClick?.(submission)}
      className="group flex cursor-pointer flex-col overflow-hidden border-border/70 bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={api.imageUrl(submission.filePath)}
          alt={`Submission by ${submission.uploadedBy}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect fill='%23eee' width='100%25' height='100%25'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' fill='%23999'>preview unavailable</text></svg>";
          }}
        />
        <Badge
          variant="outline"
          className={cn("absolute left-3 top-3 backdrop-blur", statusStyles[submission.status])}
        >
          {statusLabel[submission.status]}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="font-display text-base font-bold leading-tight">{submission.uploadedBy}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatRelative(submission.uploadedAt)} · {submission.originalFileName}
          </p>
        </div>

        {submission.status === "PENDING" && (onApprove || onReject) && (
          <div className="mt-auto flex gap-2 pt-1">
            <Button
              size="sm"
              disabled={busy}
              className="flex-1 bg-success text-success-foreground hover:bg-success/90"
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.(submission.id);
              }}
            >
              <Check className="mr-1 h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onReject?.(submission.id);
              }}
            >
              <X className="mr-1 h-4 w-4" /> Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
