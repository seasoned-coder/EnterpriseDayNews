import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { BrandNav } from "@/components/BrandNav";
import { UploadDropzone } from "@/components/UploadDropzone";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const StudentUpload = () => {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    document.title = "Submit your story · Enterprise Day News";
    const saved = localStorage.getItem("edn:student-name");
    if (saved) setName(saved);
  }, []);

  const upload = useMutation({
    mutationFn: () => api.studentUpload(name.trim(), file as File),
    onSuccess: () => {
      toast({
        title: "Sent it ✨",
        description: `Thanks ${name.trim()}! Your story is in the queue.`,
      });
      localStorage.setItem("edn:student-name", name.trim());
      setFile(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const canSubmit = name.trim().length > 0 && file && !upload.isPending;

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
            <div className="relative">
              <input
                id="student-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
                className="peer h-16 w-full rounded-2xl border border-student-border bg-white/[0.04] px-5 pt-5 text-lg text-student-ink placeholder-transparent outline-none ring-0 transition focus:border-neon-2 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_hsl(var(--neon-2)/0.15)]"
              />
              <label
                htmlFor="student-name"
                className="pointer-events-none absolute left-5 top-2 text-xs font-medium uppercase tracking-wider text-student-muted transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-xs peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-neon-2"
              >
                Your name
              </label>
            </div>

            <UploadDropzone file={file} onFileChange={setFile} />

            <Button
              onClick={() => upload.mutate()}
              disabled={!canSubmit}
              className="group h-16 w-full rounded-2xl bg-gradient-neon text-lg font-bold text-white shadow-[0_20px_60px_-20px_hsl(var(--neon-1)/0.8)] transition-all hover:scale-[1.01] hover:shadow-[0_25px_70px_-15px_hsl(var(--neon-1)/0.9)] disabled:opacity-50 disabled:hover:scale-100"
            >
              {upload.isPending ? "Sending…" : "Send it"}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>

            <p className="text-center text-xs text-student-muted">
              By uploading you confirm everyone in the photo is happy to be featured.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentUpload;
