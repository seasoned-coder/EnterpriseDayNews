import { useEffect, useState } from "react";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const Projector = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    document.title = "Projector · Enterprise Day News";
  }, []);

  const settingsQ = useQuery({
    queryKey: ["projector-settings"],
    queryFn: api.projectorSettings,
    refetchInterval: 60_000,
  });

  const refreshMs = (settingsQ.data?.imageRefreshSeconds ?? 15) * 1000;
  const intervalMs = (settingsQ.data?.displayDurationSeconds ?? 6) * 1000;

  const imagesQ = useQuery({
    queryKey: ["projector-images"],
    queryFn: api.projectorImages,
    refetchInterval: refreshMs,
  });

  const items = imagesQ.data ?? [];

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), intervalMs);
    return () => clearInterval(t);
  }, [paused, items.length, intervalMs]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (items.length === 0) return;
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % items.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + items.length) % items.length);
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  if (imagesQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-projector text-white">
        <p className="font-display text-2xl text-white/70">Loading the feed…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-projector text-white">
        <div className="text-center">
          <p className="font-display text-4xl font-bold">Waiting for approved stories…</p>
          <p className="mt-3 text-white/60">
            Submissions will appear here once staff approve them.
          </p>
        </div>
      </div>
    );
  }

  const current = items[index];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-projector text-white">
      {items.map((it, i) => (
        <div
          key={it.id}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          <img
            src={api.imageUrl(it.filePath)}
            alt={`${it.uploadedBy} submission`}
            className="ken-burns h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-10 sm:p-16">
        <div key={current.id} className="fade-in max-w-4xl">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/70">
            Enterprise Day · Live
          </p>
          <h2 className="mt-3 font-serif-display text-xl leading-none sm:text-2xl">
            {current.uploadedBy}
          </h2>
        </div>
      </div>

      <div className="pointer-events-auto absolute right-6 top-6 flex items-center gap-1 rounded-full border border-white/15 bg-black/40 p-1 backdrop-blur">
        <button
          onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
          className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPaused((p) => !p)}
          className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setIndex((i) => (i + 1) % items.length)}
          className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-6 right-6 flex gap-1.5">
        {items.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-white" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Projector;
