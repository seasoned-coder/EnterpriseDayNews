import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiSubmission } from "@/lib/api";
import {
  DEFAULT_SCHEDULE_SETTINGS,
  INITIAL_SCHEDULE_STATE,
  nextSlide,
  slideSeconds,
  type ScheduleState,
} from "@/lib/projectorSchedule";

/** A slide on screen; `slot` increases with every change so each new slide fades in. */
interface Shown {
  item: ApiSubmission;
  slot: number;
}

const HISTORY_LIMIT = 50;

const Projector = () => {
  const [paused, setPaused] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [current, setCurrent] = useState<Shown | null>(null);
  const [previous, setPrevious] = useState<Shown | null>(null);
  const schedule = useRef<ScheduleState>(INITIAL_SCHEDULE_STATE);
  const history = useRef<ApiSubmission[]>([]);
  const slotCounter = useRef(0);

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

  const settingsQ = useQuery({
    queryKey: ["projector-settings"],
    queryFn: api.projectorSettings,
    refetchInterval: 60_000,
  });
  const settings = settingsQ.data ?? DEFAULT_SCHEDULE_SETTINGS;

  const imagesQ = useQuery({
    queryKey: ["projector-images"],
    queryFn: api.projectorImages,
    refetchInterval: Math.max(2, settings.imageRefreshSeconds) * 1000,
  });
  const items = imagesQ.data;

  const show = useCallback(
    (item: ApiSubmission | null) => {
      if (!item) {
        setPrevious(null);
        setCurrent(null);
        return;
      }
      if (current && current.item.id === item.id) {
        setCurrent({ item, slot: current.slot }); // same slide again: no re-fade
        return;
      }
      slotCounter.current += 1;
      setPrevious(current);
      setCurrent({ item, slot: slotCounter.current });
    },
    [current],
  );

  const advance = useCallback(() => {
    const list = items ?? [];
    const result = nextSlide(list, schedule.current, settings);
    schedule.current = result.state;
    if (current) {
      history.current = [...history.current, current.item].slice(-HISTORY_LIMIT);
    }
    show(result.item);
  }, [items, settings, current, show]);

  const goBack = () => {
    const prev = history.current.pop();
    if (prev && items?.some((i) => i.id === prev.id)) show(prev);
  };

  // React to feed changes: start when items appear, keep the current slide's data fresh, and move on
  // immediately if staff hid/rejected/deleted what's on screen or a FLASH takeover started.
  useEffect(() => {
    if (!items) return;
    if (!current) {
      if (items.length > 0) advance();
      return;
    }
    const fresh = items.find((i) => i.id === current.item.id);
    const flashTakeover = items.some((i) => i.isFlashMode) && !current.item.isFlashMode;
    if (!fresh || flashTakeover) {
      advance();
    } else if (fresh !== current.item) {
      setCurrent({ item: fresh, slot: current.slot });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Auto-advance after the current slide's time: what the student paid for, or the staff item time.
  useEffect(() => {
    if (paused || !current) return;
    const t = setTimeout(advance, slideSeconds(current.item, settings) * 1000);
    return () => clearTimeout(t);
  }, [paused, current, settings, advance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft") goBack();
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (imagesQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-projector text-white">
        <p className="font-display text-2xl text-white/70">Loading the feed…</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-projector text-white">
        <div className="text-center">
          <p className="font-display text-4xl font-bold">Waiting for approved adverts…</p>
          <p className="mt-3 text-white/60">
            Submissions will appear here once staff approve them.
          </p>
        </div>
      </div>
    );
  }

  const layers = [previous, current].filter((s): s is Shown => s !== null && (s === current || s.slot !== current.slot));

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-gradient-projector text-white"
      onMouseMove={handleMouseMove}
    >
      {layers.map(({ item: it, slot }) => (
        <div
          key={slot}
          data-testid={slot === current.slot ? "current-slide" : "previous-slide"}
          className={`absolute inset-0 ${slot === current.slot ? "crossfade-in" : ""}`}
          aria-hidden={slot !== current.slot}
        >
          {it.messageText ? (
            <div className="flex h-full w-full items-center justify-center bg-indigo-950 p-12 text-center">
               <div className="max-w-5xl">
                  {it.isFlashMode && (
                    <p className="mb-6 text-sm font-bold uppercase tracking-[0.5em] text-red-500 animate-pulse">
                      Urgent Announcement
                    </p>
                  )}
                  <h1 className="font-serif-display text-5xl leading-tight sm:text-7xl md:text-8xl">
                    {it.messageText}
                  </h1>
               </div>
            </div>
          ) : (
            <img
              src={api.imageUrl(it)}
              alt={`${it.uploadedBy} submission`}
              className="ken-burns h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-10 sm:p-16">
        <div key={current.slot} className="fade-in max-w-4xl">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/70">
            Enterprise Day · Live
          </p>
          {!current.item.isInfoMessage && (
            <h2 className="mt-3 font-serif-display text-xl leading-none sm:text-2xl">
              {current.item.uploadedBy}
            </h2>
          )}
        </div>
      </div>

      <div className={`pointer-events-auto absolute right-6 top-6 flex items-center gap-1 rounded-full border border-white/15 bg-black/40 p-1 backdrop-blur transition-opacity duration-500 ${showToolbar ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={goBack}
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
          onClick={advance}
          className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Projector;
