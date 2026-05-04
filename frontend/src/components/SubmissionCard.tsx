import { useEffect, useState } from "react";
import { Check, X, Clock, Eye, EyeOff, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, formatRelative, type ApiSubmission } from "@/lib/api";

interface SubmissionCardProps {
  submission: ApiSubmission;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onToggleDisplay?: (id: number, display: boolean) => void;
  onDelete?: (id: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onToggleFlash?: (id: number, flash: boolean) => void;
  onClick?: (s: ApiSubmission) => void;
  busy?: boolean;
}

const statusStyles: Record<ApiSubmission["status"], string> = {
  NEW: "bg-warning/15 text-warning-foreground border-warning/30",
  APPROVED: "bg-success/10 text-success border-success/20",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabel: Record<ApiSubmission["status"], string> = {
  NEW: "New",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const SubmissionCard = ({
  submission,
  onApprove,
  onReject,
  onToggleDisplay,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleFlash,
  onClick,
  busy,
}: SubmissionCardProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <Card
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        setIsDragOver(true);
        onDragOver?.(e);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false);
        onDrop?.(e);
      }}
      onClick={() => onClick?.(submission)}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden border-border/70 bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-lg",
        onDragStart && "cursor-grab active:cursor-grabbing",
        isDragOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {submission.isInfoMessage && submission.messageText ? (
          <div className="flex h-full w-full items-center justify-center bg-indigo-900 p-6 text-center text-white">
             <p className="font-display text-lg font-bold italic line-clamp-4">"{submission.messageText}"</p>
          </div>
        ) : (
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
        )}
        <Badge
          variant="outline"
          className={cn("absolute left-3 top-3 backdrop-blur", statusStyles[submission.status])}
        >
          {submission.isInfoMessage ? "INFO" : statusLabel[submission.status]}
        </Badge>
        {submission.isFlashMode && (
          <Badge className="absolute right-3 top-3 bg-red-600 animate-pulse">FLASH</Badge>
        )}
      </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <p className="font-display text-base font-bold leading-tight">{submission.uploadedBy}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatRelative(submission.uploadedAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                🎯 P{submission.priority}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                ⏱️ {submission.durationSeconds}s
              </Badge>
              <Badge variant="secondary" className="text-xs">
                💰 {submission.totalCost}
              </Badge>
            </div>
          </div>

         {submission.status === "NEW" && (onApprove || onReject) && (
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

          {submission.status === "APPROVED" && (
            <div className="mt-auto space-y-2 pt-1">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  variant={submission.display ? "default" : "outline"}
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDisplay?.(submission.id, !submission.display);
                  }}
                >
                  {submission.display ? (
                    <>
                      <Eye className="mr-1 h-4 w-4" /> Hide
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-1 h-4 w-4" /> Display
                    </>
                  )}
                </Button>
                {submission.isInfoMessage && onToggleFlash && (
                   <Button
                    size="sm"
                    disabled={busy}
                    variant={submission.isFlashMode ? "destructive" : "outline"}
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFlash(submission.id, !submission.isFlashMode);
                    }}
                  >
                    Flash
                  </Button>
                )}
                {!submission.isInfoMessage && onReject && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(submission.id);
                    }}
                  >
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                )}
              </div>
              {(onMoveUp || onMoveDown) && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !canMoveUp}
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveUp?.();
                    }}
                  >
                    <ChevronUp className="mr-1 h-3 w-3" /> Up
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !canMoveDown}
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveDown?.();
                    }}
                  >
                    <ChevronDown className="mr-1 h-3 w-3" /> Down
                  </Button>
                </div>
              )}
            </div>
          )}

         {(submission.status === "REJECTED" || submission.isInfoMessage) && (onApprove || onDelete) && (
           <div className="mt-auto flex gap-2 pt-1">
             {onApprove && submission.status !== "APPROVED" && (
               <Button
                 size="sm"
                 disabled={busy}
                 className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                 onClick={(e) => {
                   e.stopPropagation();
                   onApprove(submission.id);
                 }}
               >
                 <Check className="mr-1 h-4 w-4" /> Approve
               </Button>
             )}
             {onDelete && (
               <Button
                 size="sm"
                 variant="outline"
                 disabled={busy}
                 className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                 onClick={(e) => {
                   e.stopPropagation();
                   onDelete(submission.id);
                 }}
               >
                 <Trash2 className="mr-1 h-4 w-4" /> Delete
               </Button>
             )}
           </div>
         )}
       </div>
    </Card>
  );
};
