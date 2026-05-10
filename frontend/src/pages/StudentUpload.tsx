import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BrandNav } from "@/components/BrandNav";
import { UploadDropzone } from "@/components/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { api, formatRelative } from "@/lib/api";
import { useNsfwCheck } from "@/hooks/useNsfwCheck";

const PRIORITY_COSTS = { 1: 5, 2: 10, 3: 15, 4: 20 };
const DURATION_COSTS = { 10: 5, 20: 10, 30: 15 };

const StudentUpload = () => {
  const user = api.getCurrentUser();
  const name = user?.username || "";
  const [file, setFile] = useState<File | null>(null);
  const [priority, setPriority] = useState(1);
  const [durationSeconds, setDurationSeconds] = useState(10);

  const { scanStatus, scanFile, resetScan } = useNsfwCheck();

  const handleFileChange = async (f: File | null) => {
    setFile(f);
    if (!f) {
      resetScan();
      return;
    }
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
    document.title = "Submit your story · BT Enterprise Day News";
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
      return api.studentUpload(name, file as File, priority, durationSeconds);
    },
    onSuccess: () => {
      toast({
        title: "Sent it ✨",
        description: `Thanks ${name}! Your story is in the queue.`,
      });
      setFile(null);
      setPriority(1);
      setDurationSeconds(10);
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
              <span className="text-gradient-neon">story.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-student-muted sm:text-lg">
              Snap it, upload it, and your moment lands on the big screen for the whole school to see.
            </p>
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
              <p className="text-xs text-student-muted">How long your story appears on screen</p>
            </div>

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
                    <div key={upload.id} className="rounded-xl border border-student-border bg-white/[0.03] p-4">
                      <img
                        src={api.imageUrl(upload.filePath)}
                        alt={upload.originalFileName}
                        className="mb-3 aspect-video w-full rounded-lg object-cover"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              upload.status === "APPROVED"
                                ? "bg-green-500/20 text-green-400"
                                : upload.status === "REJECTED"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }
                          >
                            {upload.status}
                          </Badge>
                          {upload.display && (
                            <Badge className="bg-blue-500/20 text-blue-400">On Projector</Badge>
                          )}
                        </div>
                        <p className="text-xs text-student-muted">
                          {formatRelative(upload.uploadedAt)}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span>Priority: <span className="font-semibold text-neon-2">{upload.priority}</span></span>
                          <span>Duration: <span className="font-semibold text-neon-2">{upload.durationSeconds}s</span></span>
                          <span>Cost: <span className="font-semibold text-neon-2">{upload.totalCost}</span></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-student-muted">No uploads yet</p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentUpload;
