import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Upload, ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export const UploadDropzone = ({ file, onFileChange }: UploadDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFiles = useCallback(
    (f: File | null) => {
      onFileChange(f);
      if (preview) URL.revokeObjectURL(preview);
      if (f && f.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(f));
      } else {
        setPreview(null);
      }
    },
    [onFileChange, preview]
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) handleFiles(f);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files?.[0] ?? null);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={cn(
        "group relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-all",
        dragOver
          ? "border-neon-2 bg-white/5 glow-neon scale-[1.01]"
          : "border-student-border bg-white/[0.03] hover:border-neon-1/60 hover:bg-white/[0.05]"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onChange}
        accept="image/*,video/*,.pdf"
      />

      {preview ? (
        <div className="relative w-full max-w-md">
          <img
            src={preview}
            alt="Selected file preview"
            className="mx-auto max-h-56 w-auto rounded-2xl object-contain shadow-2xl"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFiles(null);
            }}
            className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-neon transition-transform group-hover:scale-110 group-hover:rotate-6">
            <Upload className="h-7 w-7 text-white" />
          </div>
          <p className="font-display text-2xl font-bold text-student-ink">
            Drop your story here
          </p>
          <p className="mt-1.5 text-sm text-student-muted">
            or <span className="text-neon-2 underline-offset-4 group-hover:underline">click to browse</span> · images, video, or PDF
          </p>
        </>
      )}

      {file && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs text-student-ink backdrop-blur">
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="max-w-[180px] truncate font-medium">{file.name}</span>
          <span className="text-student-muted">· {(file.size / 1024).toFixed(0)} KB</span>
        </div>
      )}
    </div>
  );
};
