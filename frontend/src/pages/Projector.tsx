import { useEffect, useState } from "react";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiSubmission } from "@/lib/api";

const Projector = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playlist, setPlaylist] = useState<ApiSubmission[]>([]);
  const [showToolbar, setShowToolbar] = useState(true);

  useEffect(() => {
    document.title = "Projector · BT Enterprise Day News";
  }, []);

  // Toolbar visibility timer
  useEffect(() => {
    if (!showToolbar) return;
    const t = setTimeout(() => setShowToolbar(false), 3000);
    return () => clearTimeout(t);
  }, [showToolbar]);

  const handleMouseMove = () => {
    if (!showToolbar) setShowToolbar(true);
  };

  const imagesQ = useQuery({
    queryKey: ["projector-images"],
    queryFn: api.projectorImages,
    refetchInterval: 15_000,
  });

  // Generate a weighted playlist: ensure all images shown in 10-min window, but prioritize higher priority items
  useEffect(() => {
    const items = imagesQ.data ?? [];
    if (items.length === 0) {
      setPlaylist([]);
      setIndex(0);
      return;
    }

    // Determine total weight of all items
    const totalWeight = items.reduce((sum, i) => sum + i.priority, 0);
    const tenMinutesMs = 10 * 60 * 1000;
    
    // Average duration of an item (weighted by priority)
    const weightedAvgDurationMs = items.reduce((sum, i) => sum + (i.durationSeconds * 1000 * i.priority), 0) / totalWeight;
    
    // How many slots do we have in 10 minutes?
    const totalSlots = Math.max(items.length, Math.floor(tenMinutesMs / weightedAvgDurationMs));

    // Build a playlist where each item gets slots proportional to its priority
    const newPlaylist: ApiSubmission[] = [];
    
    // 1. Ensure every item is in at least once
    const baseItems = [...items];
    
    // 2. Fill remaining slots weighted by priority
    const extraSlotsCount = totalSlots - items.length;
    const extraItems: ApiSubmission[] = [];
    
    if (extraSlotsCount > 0) {
      for (let i = 0; i < extraSlotsCount; i++) {
        let pick = Math.random() * totalWeight;
        for (const item of items) {
          pick -= item.priority;
          if (pick <= 0) {
            extraItems.push(item);
            break;
          }
        }
      }
    }

    // 3. Combine and shuffle everything
    const combined = [...baseItems, ...extraItems];
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    setPlaylist(combined);
    setIndex(0);
  }, [imagesQ.data]);

  const items = playlist;
  const current = items[index];

  // Auto-advance based on duration of current item
  useEffect(() => {
    if (paused || !current || items.length <= 1) {
      return;
    }

    const durationMs = current.durationSeconds * 1000;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
    }, durationMs);

    return () => clearTimeout(t);
  }, [paused, current, items.length, index]);

  useEffect(() => {
    if (index >= items.length) {
      setIndex(0);
    }
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


  return (
    <div 
      className="relative h-screen w-screen overflow-hidden bg-gradient-projector text-white"
      onMouseMove={handleMouseMove}
    >
      {items.map((it, i) => (
        <div
          key={`${it.id}-${i}`}
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

      <div className={`pointer-events-auto absolute right-6 top-6 flex items-center gap-1 rounded-full border border-white/15 bg-black/40 p-1 backdrop-blur transition-opacity duration-500 ${showToolbar ? 'opacity-100' : 'opacity-0'}`}>
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
            className={`h-1 rounded-full transition-all ${
              i === index ? "w-7 bg-white/70" : "w-1 bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Projector;
