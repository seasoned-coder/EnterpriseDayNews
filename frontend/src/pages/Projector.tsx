import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiSubmission } from "@/lib/api";
import { useLiveRefresh } from "@/lib/liveUpdates";
import { adoptProjectorKey, queueShowing, sendShowings } from "@/lib/playRecorder";
import { loadLastFeed, loadLastSettings, saveLastFeed, saveLastSettings, withTimeout } from "@/lib/projectorCache";
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
/** A feed check that takes longer than this counts as failed (issue #39); normally it takes milliseconds. */
const REQUEST_TIMEOUT_MS = 5000;
/** How often recorded showings are sent to the server (issue #40). */
const PLAYS_SEND_MS = 30_000;

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

  // Both start from the last good copy kept in the browser (issue #39), so a reload while the server or
  // Wi-Fi is down still has something to play. initialDataUpdatedAt 0 = refresh from the server at once.
  const settingsQ = useQuery({
    queryKey: ["projector-settings"],
    queryFn: ({ signal }) => withTimeout(REQUEST_TIMEOUT_MS, api.projectorSettings, signal),
    refetchInterval: 60_000,
    refetchIntervalInBackground: true, // unattended: keep checking even if the window isn't in front
    initialData: loadLastSettings,
    initialDataUpdatedAt: 0,
  });
  const settings = settingsQ.data ?? DEFAULT_SCHEDULE_SETTINGS;

  // Told the moment staff change something (issue #43). It still checks at the configured refresh rate too:
  // it's one device on a cable, and those checks are how it notices being offline (#39).
  useLiveRefresh({ adverts: [["projector-images"]], "projector-settings": [["projector-settings"]] });

  const imagesQ = useQuery({
    queryKey: ["projector-images"],
    queryFn: ({ signal }) => withTimeout(REQUEST_TIMEOUT_MS, api.projectorImages, signal),
    refetchInterval: Math.max(2, settings.imageRefreshSeconds) * 1000,
    refetchIntervalInBackground: true,
    // The refresh interval is the retry. The library's own retries back off for longer than one interval,
    // so each refresh would restart them and a dropped connection would never count as failed.
    retry: false,
    initialData: loadLastFeed,
    initialDataUpdatedAt: 0,
  });
  const items = imagesQ.data;

  // Failed refreshes in a row. Keep playing what we have meanwhile (the query keeps its last data). With
  // slides to play, a single blip isn't worth showing; with nothing to play, say so straight away.
  const [failedRefreshes, setFailedRefreshes] = useState(0);
  useEffect(() => {
    if (imagesQ.errorUpdatedAt > 0) setFailedRefreshes((n) => n + 1);
  }, [imagesQ.errorUpdatedAt]);
  useEffect(() => {
    if (imagesQ.dataUpdatedAt > 0) setFailedRefreshes(0);
  }, [imagesQ.dataUpdatedAt]);
  const offline = failedRefreshes >= (items && items.length > 0 ? 2 : 1);
  // Slides whose picture couldn't load (e.g. not saved in the browser yet while offline) are skipped
  // rather than shown broken.
  const broken = useRef(new Set<number>());
  const [brokenCount, setBrokenCount] = useState(0);
  const playable = useMemo(
    () => (items ?? []).filter((i) => !broken.current.has(i.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, brokenCount],
  );
  const skipBroken = (item: ApiSubmission) => {
    broken.current.add(item.id);
    setBrokenCount((n) => n + 1);
  };

  useEffect(() => {
    if (imagesQ.dataUpdatedAt > 0 && imagesQ.data) saveLastFeed(imagesQ.data);
    if (imagesQ.dataUpdatedAt > 0 && broken.current.size > 0) {
      broken.current.clear(); // the server answered: give pictures that failed another go
      setBrokenCount((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesQ.dataUpdatedAt]);

  useEffect(() => {
    if (settingsQ.dataUpdatedAt > 0 && settingsQ.data) saveLastSettings(settingsQ.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsQ.dataUpdatedAt]);

  // Load every slide's picture ahead of time, so it's already in the browser if the connection drops.
  const preloaded = useRef(new Set<string>());
  useEffect(() => {
    for (const item of items ?? []) {
      const url = item.messageText ? null : api.imageUrl(item);
      if (!url || preloaded.current.has(url)) continue;
      preloaded.current.add(url);
      new Image().src = url;
    }
  }, [items]);

  // Recording what was shown (issue #40): when a student advert comes off screen, note how long it was up
  // (at most what the team paid for, e.g. if the projector was paused). Sent every 30 seconds.
  const shownAt = useRef(Date.now());
  const recordOutgoing = useCallback(
    (outgoing: Shown | null) => {
      if (!outgoing || outgoing.item.isInfoMessage) return;
      const elapsed = Math.round((Date.now() - shownAt.current) / 1000);
      queueShowing({
        imageId: outgoing.item.id,
        seconds: Math.min(elapsed, slideSeconds(outgoing.item, settings)),
        playedAt: new Date().toISOString(),
      });
    },
    [settings],
  );

  useEffect(() => {
    adoptProjectorKey();
    const timer = setInterval(() => void sendShowings(), PLAYS_SEND_MS);
    return () => clearInterval(timer);
  }, []);

  const show = useCallback(
    (item: ApiSubmission | null) => {
      if (!item) {
        recordOutgoing(current);
        setPrevious(null);
        setCurrent(null);
        return;
      }
      if (current && current.item.id === item.id) {
        setCurrent({ item, slot: current.slot }); // same slide again: no re-fade
        return;
      }
      recordOutgoing(current);
      shownAt.current = Date.now();
      slotCounter.current += 1;
      setPrevious(current);
      setCurrent({ item, slot: slotCounter.current });
    },
    [current, recordOutgoing],
  );

  const advance = useCallback(() => {
    const result = nextSlide(playable, schedule.current, settings);
    schedule.current = result.state;
    if (current) {
      history.current = [...history.current, current.item].slice(-HISTORY_LIMIT);
    }
    show(result.item);
  }, [playable, settings, current, show]);

  const goBack = () => {
    const prev = history.current.pop();
    if (prev && playable.some((i) => i.id === prev.id)) show(prev);
  };

  // React to feed changes: start when items appear, keep the current slide's data fresh, and move on
  // immediately if staff hid/rejected/deleted what's on screen, its picture failed, or a FLASH takeover started.
  useEffect(() => {
    if (!items) return;
    if (!current) {
      if (playable.length > 0) advance();
      return;
    }
    const fresh = playable.find((i) => i.id === current.item.id);
    const flashTakeover = playable.some((i) => i.isFlashMode) && !current.item.isFlashMode;
    if (!fresh || flashTakeover) {
      advance();
    } else if (fresh !== current.item) {
      setCurrent({ item: fresh, slot: current.slot });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playable]);

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

  if (imagesQ.isLoading && failedRefreshes === 0) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-projector text-white">
        <p className="font-display text-2xl text-white/70">Loading the feed…</p>
      </div>
    );
  }

  if (!current && offline) {
    // Nothing to play and the server can't be reached: a calm holding screen, never an error.
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-projector text-white">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/60">Enterprise Day · Live</p>
          <p className="mt-4 font-display text-5xl font-bold">Back shortly</p>
          <p className="mt-3 text-white/60">The adverts will be back on screen in a moment.</p>
        </div>
        <OfflineBadge />
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
              onError={() => skipBroken(it)}
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

      {offline && <OfflineBadge />}
    </div>
  );
};

/**
 * Subtle but clear, top middle: the room keeps watching the adverts, and anyone glancing up knows the
 * screen can't reach the server (so new approvals won't appear until it's back).
 */
const OfflineBadge = () => (
  <div
    role="status"
    className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/75 backdrop-blur-sm"
  >
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
    Offline mode
  </div>
);

export default Projector;
