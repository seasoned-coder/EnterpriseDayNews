import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BrandNav } from "@/components/BrandNav";
import { StudentUploadCard } from "@/components/StudentUploadCard";
import { UploadDropzone } from "@/components/UploadDropzone";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, type ApiSubmission } from "@/lib/api";
import { checkFileSize, FILE_SIZE_LIMITS, isAllowedImageType } from "@/lib/fileSizeCheck";
import { useNsfwCheck } from "@/hooks/useNsfwCheck";

const PRIORITY_COSTS = { 1: 5, 2: 10, 3: 15, 4: 20 };
const DURATION_COSTS = { 10: 5, 20: 10, 30: 15 };

const StudentUpload = () => {
  const user = api.getCurrentUser("STUDENT");
  const name = user?.username || "";
  const [file, setFile] = useState<File | null>(null);
  const [priority, setPriority] = useState(1);
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [publishOnApproval, setPublishOnApproval] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ApiSubmission | null>(null);

  const { scanStatus, scanFile, resetScan } = useNsfwCheck();

  const handleFileChange = async (f: File | null) => {
    setFile(f);
    if (!f) {
      resetScan();
      return;
    }

    // ── Type and size checks ───────────────────────────────────────────────
    if (!isAllowedImageType(f)) {
      toast({
        title: "That file type can't be used",
        description: "Please choose a JPEG, PNG, GIF or WebP picture.",
        variant: "destructive",
      });
      setFile(null);
      resetScan();
      return;
    }

    const sizeResult = checkFileSize(f);
    if (sizeResult === "too-large") {
      toast({
        title: "File too large",
        description: `That picture is over ${FILE_SIZE_LIMITS.maxMb} MB. Please save a smaller copy and try again.`,
        variant: "destructive",
      });
      setFile(null);
      resetScan();
      return;
    }
    if (sizeResult === "too-small") {
      const kb = f.size / 1024;
      if (kb < 10) {
        // Hard block: file is almost certainly corrupted or invalid
        toast({
          title: "File is corrupted or invalid",
          description:
            "That file is too small or corrupted — it can't be processed. Please check the file and try again.",
          variant: "destructive",
        });
        setFile(null);
        resetScan();
        return;
      } else {
        // Soft warning: small but potentially valid image
        toast({
          title: "Image may look blurry",
          description: `This picture is under ${FILE_SIZE_LIMITS.warnBelowMb} MB, so it might look blurry on the big screen. A high-quality JPEG between ${FILE_SIZE_LIMITS.warnBelowMb} MB and ${FILE_SIZE_LIMITS.maxMb} MB will look much sharper. You can still send this one.`,
        });
        // Non-blocking: they can still submit if they want
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const result = await scanFile(f);
    if (result === "flagged") {
      toast({
        title: "Image not accepted",
        description:
          "That image can't be submitted — it may contain content that isn't appropriate for the school event. Please choose a different photo.",
        variant: "destructive",
      });
      setFile(null);
      resetScan();
    }
  };

  useEffect(() => {
    document.title = "Submit your advert · BT Enterprise Day News";
  }, []);

  const myUploadsQ = useQuery({
    queryKey: ["my-uploads", name],
    queryFn: async () => {
      return api.studentGetMyUploads(name);
    },
    enabled: name.length > 0,
    refetchInterval: 10_000,
  });

  const upload = useMutation({
    mutationFn: async () => {
      return api.studentUpload(name, file as File, priority, durationSeconds, publishOnApproval);
    },
    onSuccess: (sent) => {
      toast({
        title: "Sent it ✨",
        description: sent.publishOnApproval
          ? `Thanks ${name}! Your advert is waiting for a teacher to approve it.`
          : `Thanks ${name}! Once a teacher approves it, tap "Publish now" when you want it on screen.`,
      });
      setFile(null);
      setPriority(1);
      setDurationSeconds(10);
      setPublishOnApproval(true);
      resetScan();
      myUploadsQ.refetch();
    },
    onError: (err: Error) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteUpload = useMutation({
    mutationFn: async (id: number) => {
      return api.studentDeleteMyUpload(id, name);
    },
    onSuccess: () => {
      toast({
        title: "Upload deleted",
        description: "Your file was permanently deleted.",
      });
      setDeleteTarget(null);
      myUploadsQ.refetch();
    },
    onError: (err: Error) => {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const setPublished = useMutation({
    mutationFn: ({ upload, published }: { upload: ApiSubmission; published: boolean }) =>
      api.studentSetPublished(upload.id, published),
    onSuccess: (updated) => {
      const onScreen = updated.status === "APPROVED" && updated.display;
      toast({
        title:
          updated.status !== "APPROVED"
            ? "Got it"
            : onScreen
              ? "It's going on screen"
              : "Taken off screen",
        description:
          updated.status !== "APPROVED"
            ? updated.publishOnApproval
              ? "It'll go on screen as soon as it's approved."
              : "Once it's approved, you choose when it goes on screen."
            : onScreen
              ? "Your advert will appear on the big screen in a few seconds."
              : "Your advert won't be shown until you publish it again.",
      });
      myUploadsQ.refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't change that", description: err.message, variant: "destructive" });
    },
  });

  const totalCost = (PRIORITY_COSTS[priority as keyof typeof PRIORITY_COSTS] ?? 5) +
                    (DURATION_COSTS[durationSeconds as keyof typeof DURATION_COSTS] ?? 5);
  const canSubmit =
    name.trim().length > 0 &&
    file !== null &&
    !upload.isPending &&
    scanStatus !== "scanning" &&
    scanStatus !== "flagged";

  return (
    <div className="relative min-h-screen overflow-hidden bg-student-bg text-student-ink">
      <div className="aurora" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10">
        <BrandNav variant="dark" />

        <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
          <div className="fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-student-border bg-white/[0.04] px-3 py-1 text-xs font-medium text-student-muted backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-neon-2" />
              Enterprise Day · Live feed
            </div>

            <h1 className="font-display text-5xl font-extrabold leading-[0.95] sm:text-7xl">
              Drop your <br />
              <span className="text-gradient-neon">advert.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-student-muted sm:text-lg">
              Snap it, upload it, and your moment lands on the big screen for the whole school to see.
            </p>

            {/* Upload guidance */}
            <div className="mt-6 w-full rounded-2xl border border-student-border bg-white/[0.03] px-4 py-4 text-sm text-student-muted leading-relaxed sm:px-5">
              We recommend using a <span className="text-student-ink font-medium">4K resolution (3840 × 2160 px)</span> to keep your pictures crisp and sharp. For the best balance of quality and speed, save your images as <span className="text-student-ink font-medium">high-quality JPEGs</span> with a file size between <span className="text-student-ink font-medium">{FILE_SIZE_LIMITS.warnBelowMb} MB and {FILE_SIZE_LIMITS.maxMb} MB</span>. Pictures over {FILE_SIZE_LIMITS.maxMb} MB can't be uploaded.
            </div>
          </div>

          <div className="mt-10 space-y-6 fade-in" style={{ animationDelay: "120ms" }}>
            <UploadDropzone file={file} onFileChange={handleFileChange} scanStatus={scanStatus} />

            {/* Priority Slider */}
            <div className="space-y-2 rounded-xl border border-student-border bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-student-muted">
                  Priority: <span className="text-neon-2">{priority}</span> (cost: {PRIORITY_COSTS[priority as keyof typeof PRIORITY_COSTS]})
                </label>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full accent-neon-2"
              />
              <p className="text-xs text-student-muted">1=Low, 4=High - Higher priority shows more often</p>
            </div>

            {/* Duration Slider */}
            <div className="space-y-2 rounded-xl border border-student-border bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-student-muted">
                  Duration: <span className="text-neon-2">{durationSeconds}s</span> (cost: {DURATION_COSTS[durationSeconds as keyof typeof DURATION_COSTS]})
                </label>
              </div>
              <input
                type="range"
                min="10"
                max="30"
                step="10"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(parseInt(e.target.value))}
                className="w-full accent-neon-2"
              />
              <p className="text-xs text-student-muted">How long your advert appears on screen</p>
            </div>

            {/* When it goes on screen (issue #9) */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-student-border bg-white/[0.03] p-4">
              <input
                type="checkbox"
                checked={publishOnApproval}
                onChange={(e) => setPublishOnApproval(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-neon-2"
              />
              <span>
                <span className="block text-sm font-medium text-student-ink">
                  Put it on screen as soon as it's approved
                </span>
                <span className="mt-1 block text-xs text-student-muted">
                  Untick to upload it now and choose when it goes on screen later (for example, for a special offer).
                </span>
              </span>
            </label>

            {/* Total Cost */}
            <div className="rounded-xl border border-neon-2/30 bg-neon-2/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-student-muted">Total Cost:</span>
                <span className="text-2xl font-bold text-neon-2">{totalCost}</span>
              </div>
            </div>

            <Button
              onClick={() => upload.mutate()}
              disabled={!canSubmit}
              className="group h-16 w-full rounded-2xl bg-gradient-neon text-lg font-bold text-white shadow-[0_20px_60px_-20px_hsl(var(--neon-1)/0.8)] transition-all hover:scale-[1.01] hover:shadow-[0_25px_70px_-15px_hsl(var(--neon-1)/0.9)] disabled:opacity-50 disabled:hover:scale-100"
            >
              {upload.isPending
                ? "Sending…"
                : scanStatus === "scanning"
                ? "Checking image…"
                : "Send it"}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>

            <p className="text-center text-xs text-student-muted">
              By uploading you confirm everyone in the photo is happy to be featured.
            </p>
          </div>

          {/* My Previous Uploads */}
          {name.trim().length > 0 && (
            <div className="mt-16 space-y-4 fade-in" style={{ animationDelay: "240ms" }}>
              <h2 className="font-display text-2xl font-bold">Your uploads</h2>

              {myUploadsQ.isLoading ? (
                <div className="flex items-center justify-center py-8 text-student-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : myUploadsQ.data && myUploadsQ.data.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {myUploadsQ.data.map((upload) => (
                    <StudentUploadCard
                      key={upload.id}
                      upload={upload}
                      busy={deleteUpload.isPending || (setPublished.isPending && setPublished.variables?.upload.id === upload.id)}
                      onSetPublished={(target, published) => setPublished.mutate({ upload: target, published })}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-student-muted">No uploads yet</p>
              )}
            </div>
          )}

          <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete this upload?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. The file will be permanently removed from the system and will stop showing on the projector if it is currently live.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteUpload.isPending}>Keep upload</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    if (deleteTarget) {
                      deleteUpload.mutate(deleteTarget.id);
                    }
                  }}
                  disabled={deleteUpload.isPending}
                >
                  {deleteUpload.isPending ? "Deleting..." : "Delete permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
};

export default StudentUpload;
