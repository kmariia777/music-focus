import { useCallback, useEffect, useRef, useState } from "react";

export interface StationTrack {
  title: string;
  /** Path relative to public/audio/, e.g. "focus/Deliberate Thought.mp3" */
  file: string;
}

export interface Station {
  id: "focus" | "immerse" | "drift";
  label: string;
  description: string;
  color: string;
  tracks: StationTrack[];
}

const track = (title: string, file: string): StationTrack => ({ title, file });

/**
 * Royalty-free music stations. All tracks by Kevin MacLeod (incompetech.com),
 * licensed under Creative Commons Attribution 4.0 (CC BY 4.0).
 * Files are self-hosted under public/audio/ — see MUSIC_LICENSES.md.
 */
export const STATIONS: readonly Station[] = [
  {
    id: "focus",
    label: "Focus",
    description: "Progressive / Uplifting",
    color: "#8b5cf6",
    tracks: [
      track("Deliberate Thought", "focus/Deliberate Thought.mp3"),
      track("Blippy Trance", "focus/Blippy Trance.mp3"),
      track("EDM Detection Mode", "focus/EDM Detection Mode.mp3"),
      track("Digital Lemonade", "focus/Digital Lemonade.mp3"),
      track("Future Cha Cha", "focus/Future Cha Cha.mp3"),
      track("Ethernight Club", "focus/Ethernight Club.mp3"),
      track("Falling Sky", "focus/Falling Sky.mp3"),
      track("Simple Hop", "focus/Simple Hop.mp3"),
    ],
  },
  {
    id: "immerse",
    label: "Immerse",
    description: "Underground / Melodic",
    color: "#5b8dee",
    tracks: [
      track("Crypto", "immerse/Crypto.mp3"),
      track("Deep Haze", "immerse/Deep Haze.mp3"),
      track("Echoes of Time", "immerse/Echoes of Time.mp3"),
      track("Mirage", "immerse/Mirage.mp3"),
      track("Sovereign", "immerse/Sovereign.mp3"),
      track("Klockworx", "immerse/Klockworx.mp3"),
    ],
  },
  {
    id: "drift",
    label: "Drift",
    description: "Ambient / Downtempo",
    color: "#34d399",
    tracks: [
      track("Tranquility Base", "drift/Tranquility Base.mp3"),
      track("Chill Wave", "drift/Chill Wave.mp3"),
      track("Fluidscape", "drift/Fluidscape.mp3"),
      track("Lightless Dawn", "drift/Lightless Dawn.mp3"),
      track("Silver Blue Light", "drift/Silver Blue Light.mp3"),
      track("Airship Serenity", "drift/Airship Serenity.mp3"),
      track("Night Owl", "drift/Night Owl.mp3"),
      track("Day Bird", "drift/Day Bird.mp3"),
    ],
  },
];

export type StationId = Station["id"];

export type AudioStatus = "idle" | "loading" | "playing" | "error";

interface UseAudioOptions {
  isTimerRunning: boolean;
  autoStartWithTimer: boolean;
}

const audioBase = () => `${import.meta.env.BASE_URL}audio/`;

/**
 * DJ-style transitions, modeled on long-blend progressive mixes (e.g. James
 * Holden's Balance 005): the incoming track fades in over the outgoing one
 * instead of hard-cutting. Automatic track advances get the full blend;
 * manual station/skip changes get a shorter one.
 */
const AUTO_XFADE_SEC = 12;
const MANUAL_XFADE_SEC = 3;

interface Engine {
  onPlaying(i: number): void;
  onWaiting(i: number): void;
  onTimeUpdate(i: number): void;
  onEnded(i: number): void;
  onError(i: number): void;
  playStation(idx: number, xsec: number): void;
  stopAudio(): void;
}

export function useAudio({ isTimerRunning, autoStartWithTimer }: UseAudioOptions) {
  const [activeId, setActiveId] = useState<StationId | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Two decks: while deck A plays out, deck B fades in — the DJ crossfade.
  const decks = useRef<(HTMLAudioElement | null)[]>([null, null]);
  const gains = useRef<(GainNode | null)[]>([null, null]);
  const activeDeck = useRef<0 | 1>(0);
  const xfadeTimer = useRef<number | null>(null);
  const xfade = useRef<null | { t0: number; durMs: number; from: 0 | 1; to: 0 | 1 }>(null);

  const stationIdxRef = useRef(0);
  const queueRef = useRef<number[]>([]);
  const queuePosRef = useRef(0);
  const failedRef = useRef<Set<number>>(new Set());
  const statusRef = useRef<AudioStatus>("idle");
  const levelRef = useRef(0.7);
  const prevTimerRunning = useRef(isTimerRunning);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // iOS Safari ignores `audio.volume` on <audio> elements entirely, so volume
  // (and the crossfade) is driven through a Web Audio GainNode per deck there.
  // Everywhere else, plain element volume is simpler and more reliable.
  const isIOS = useRef(
    typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)),
  );

  const updateStatus = useCallback((s: AudioStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const getAudioContext = useCallback(() => {
    if (!isIOS.current) return null;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  /** Per-deck output level: GainNode on iOS, element volume elsewhere. */
  const setDeckLevel = useCallback(
    (i: 0 | 1, v: number) => {
      const deck = decks.current[i];
      if (!deck) return;
      if (isIOS.current) {
        try {
          const ctx = getAudioContext();
          if (ctx) {
            if (!gains.current[i]) {
              const src = ctx.createMediaElementSource(deck);
              const gain = ctx.createGain();
              src.connect(gain).connect(ctx.destination);
              gains.current[i] = gain;
            }
            const g = gains.current[i];
            if (g) {
              g.gain.value = v;
              return;
            }
          }
        } catch {
          /* fall through to element volume */
        }
      }
      deck.volume = v;
    },
    [getAudioContext],
  );

  const engineRef = useRef<Engine>(null as unknown as Engine);

  const getDeck = useCallback((i: 0 | 1): HTMLAudioElement => {
    let d = decks.current[i];
    if (!d) {
      d = new Audio();
      d.preload = "auto";
      d.addEventListener("playing", () => engineRef.current.onPlaying(i));
      d.addEventListener("waiting", () => engineRef.current.onWaiting(i));
      d.addEventListener("timeupdate", () => engineRef.current.onTimeUpdate(i));
      d.addEventListener("ended", () => engineRef.current.onEnded(i));
      d.addEventListener("error", () => engineRef.current.onError(i));
      decks.current[i] = d;
    }
    return d;
  }, []);

  // ---------------------------------------------------------------------------
  // Engine — plain functions recreated each render, always reached through
  // engineRef so deck event listeners (attached once) see the latest logic.
  // ---------------------------------------------------------------------------

  const trackUrl = (tr: StationTrack) => `${audioBase()}${encodeURI(tr.file)}`;

  const safeRelease = (d: HTMLAudioElement) => {
    try {
      d.removeAttribute("src");
      d.load();
    } catch {
      /* noop */
    }
  };

  const cancelXfade = () => {
    if (xfadeTimer.current !== null) {
      clearInterval(xfadeTimer.current);
      xfadeTimer.current = null;
    }
    xfade.current = null;
  };

  /** Snap an in-progress blend to its end state. */
  const finishXfade = () => {
    const x = xfade.current;
    cancelXfade();
    if (!x) return;
    const outEl = decks.current[x.from];
    if (outEl) {
      outEl.pause();
      safeRelease(outEl);
    }
    setDeckLevel(x.to, levelRef.current);
    activeDeck.current = x.to;
  };

  /** Fisher-Yates shuffle of track indices; avoids repeating `avoidTrack` first. */
  const buildQueue = (stationIdx: number, avoidTrack: number | null) => {
    const station = STATIONS[stationIdx];
    if (!station) return;
    const n = station.tracks.length;
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = order[i];
      const b = order[j];
      if (a !== undefined && b !== undefined) {
        order[i] = b;
        order[j] = a;
      }
    }
    if (avoidTrack !== null && n > 1 && order[0] === avoidTrack) {
      const a = order[0];
      const b = order[1];
      if (a !== undefined && b !== undefined) {
        order[0] = b;
        order[1] = a;
      }
    }
    queueRef.current = order;
    queuePosRef.current = 0;
    failedRef.current = new Set();
  };

  const stopAudio = () => {
    finishXfade();
    const a = decks.current[0];
    const b = decks.current[1];
    if (a) {
      a.pause();
      safeRelease(a);
    }
    if (b) {
      b.pause();
      safeRelease(b);
    }
    queueRef.current = [];
    queuePosRef.current = 0;
    failedRef.current = new Set();
    updateStatus("idle");
    setNowPlaying(null);
    setErrorMsg(null);
  };

  const onTrackFailed = () => {
    const st = STATIONS[stationIdxRef.current];
    if (!st) return;
    const failedIdx = queueRef.current[queuePosRef.current];
    if (failedIdx !== undefined) failedRef.current.add(failedIdx);
    if (failedRef.current.size >= st.tracks.length) {
      stopAudio();
      updateStatus("error");
      setNowPlaying(null);
      setErrorMsg("Could not play station");
      return;
    }
    advanceTrack(true);
  };

  /** Blend (or hard-start) into `tr`. */
  const startTrack = (tr: StationTrack, xsec: number) => {
    const from = activeDeck.current;
    const fromEl = decks.current[from];
    const fromHasAudio = !!fromEl && !!fromEl.currentSrc && !fromEl.ended;
    const to: 0 | 1 = fromHasAudio ? ((1 - from) as 0 | 1) : from;
    const toEl = getDeck(to);

    setNowPlaying(tr.title);
    setErrorMsg(null);

    if (!fromHasAudio || xsec <= 0) {
      finishXfade();
      if (fromHasAudio && to !== from && fromEl) {
        fromEl.pause();
        safeRelease(fromEl);
      }
      activeDeck.current = to;
      updateStatus("loading");
      toEl.src = trackUrl(tr);
      setDeckLevel(to, levelRef.current);
      toEl.play().catch((err: Error) => {
        if (err.name !== "AbortError") onTrackFailed();
      });
      return;
    }

    // DJ blend: incoming deck fades in over the outgoing one (equal-power).
    finishXfade();
    updateStatus("loading");
    toEl.src = trackUrl(tr);
    try {
      toEl.currentTime = 0;
    } catch {
      /* noop */
    }
    setDeckLevel(to, 0);
    const playPromise = toEl.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Incoming deck failed to start — restore the outgoing deck and skip.
        onTrackFailed();
      });
    }
    const t0 = performance.now();
    const durMs = xsec * 1000;
    xfade.current = { t0, durMs, from, to };
    // Wall-clock driven (not rAF) so the blend completes in background tabs.
    xfadeTimer.current = window.setInterval(() => {
      const x = xfade.current;
      if (!x) return;
      const t = Math.min(1, (performance.now() - x.t0) / x.durMs);
      const g = levelRef.current;
      setDeckLevel(x.from, g * Math.cos((t * Math.PI) / 2));
      setDeckLevel(x.to, g * Math.sin((t * Math.PI) / 2));
      if (t >= 1) finishXfade();
    }, 100);
  };

  const advanceTrack = (auto: boolean) => {
    const st = STATIONS[stationIdxRef.current];
    if (!st) return;
    let np = queuePosRef.current + 1;
    if (np >= queueRef.current.length) {
      // Endless play: reshuffle, avoiding an immediate repeat.
      const lastTrack = queueRef.current[queuePosRef.current];
      buildQueue(stationIdxRef.current, lastTrack ?? null);
      np = 0;
    }
    while (np < queueRef.current.length && failedRef.current.has(queueRef.current[np] as number)) {
      np++;
    }
    if (np >= queueRef.current.length) {
      stopAudio();
      updateStatus("error");
      setNowPlaying(null);
      setErrorMsg("Could not play station");
      return;
    }
    queuePosRef.current = np;
    const tIdx = queueRef.current[np] as number;
    const tr = st.tracks[tIdx];
    if (!tr) return;
    startTrack(tr, auto ? AUTO_XFADE_SEC : MANUAL_XFADE_SEC);
  };

  /** iOS only: play+pause the standby deck inside the user gesture so its
   * later programmatic play() (mid-blend) isn't blocked. */
  const unlockStandbyDeck = (url: string, standby: 0 | 1) => {
    if (!isIOS.current) return;
    try {
      const d = getDeck(standby);
      d.src = url;
      const p = d.play();
      if (p) {
        p.then(() => {
          d.pause();
          safeRelease(d);
        }).catch(() => {
          safeRelease(d);
        });
      } else {
        safeRelease(d);
      }
    } catch {
      /* noop */
    }
  };

  const playStation = (idx: number, xsec: number) => {
    const st = STATIONS[idx];
    if (!st) return;
    const wasActive =
      statusRef.current === "playing" || statusRef.current === "loading";
    stationIdxRef.current = idx;
    buildQueue(idx, null);
    setActiveId(st.id);
    const first = st.tracks[queueRef.current[0] as number];
    if (!first) return;
    unlockStandbyDeck(trackUrl(first), 1);
    if (wasActive && xsec > 0) {
      // Blend out of the current station into the new one.
      startTrack(first, xsec);
    } else {
      // Hard start on deck 0.
      finishXfade();
      const a = getDeck(0);
      const b = decks.current[1];
      if (b) {
        b.pause();
        safeRelease(b);
      }
      activeDeck.current = 0;
      setNowPlaying(first.title);
      setErrorMsg(null);
      updateStatus("loading");
      a.src = trackUrl(first);
      setDeckLevel(0, levelRef.current);
      a.play().catch((err: Error) => {
        if (err.name !== "AbortError") onTrackFailed();
      });
    }
  };

  const onPlaying = (i: number) => {
    const x = xfade.current;
    if (i !== activeDeck.current && !(x && x.to === i)) return;
    if (statusRef.current === "loading") updateStatus("playing");
  };

  const onWaiting = (i: number) => {
    const x = xfade.current;
    if (i !== activeDeck.current && !(x && x.to === i)) return;
    if (statusRef.current === "playing") updateStatus("loading");
  };

  const onTimeUpdate = (i: number) => {
    if (i !== activeDeck.current || xfade.current) return;
    if (statusRef.current !== "playing") return;
    const d = decks.current[i];
    if (!d || !d.duration || !isFinite(d.duration)) return;
    if (d.duration - d.currentTime <= AUTO_XFADE_SEC) {
      advanceTrack(true);
    }
  };

  const onEnded = (i: number) => {
    if (i !== activeDeck.current) return;
    if (xfade.current) {
      // Outgoing deck ended mid-blend — complete the transition.
      finishXfade();
      return;
    }
    // Fallback in case timeupdate was throttled.
    advanceTrack(true);
  };

  const onError = (i: number) => {
    const x = xfade.current;
    const isIncoming = !!x && x.to === i;
    if (i !== activeDeck.current && !isIncoming) return;
    if (isIncoming && x) {
      // Incoming track failed mid-blend: restore the outgoing deck, skip ahead.
      const fromEl = decks.current[x.from];
      cancelXfade();
      if (fromEl) setDeckLevel(x.from, levelRef.current);
      activeDeck.current = x.from;
      const toEl = decks.current[x.to];
      if (toEl) safeRelease(toEl);
    }
    onTrackFailed();
  };

  engineRef.current = {
    onPlaying,
    onWaiting,
    onTimeUpdate,
    onEnded,
    onError,
    playStation,
    stopAudio,
  };

  // ---------------------------------------------------------------------------
  // Public API (stable) + effects
  // ---------------------------------------------------------------------------

  const playStationApi = useCallback(
    (idx: number, xsec = 0) => engineRef.current.playStation(idx, xsec),
    [],
  );
  const stopAudioApi = useCallback(() => engineRef.current.stopAudio(), []);

  // Sync volume/mute — the blend tick reads levelRef live, so only the
  // settled deck needs an immediate update.
  useEffect(() => {
    const level = isMuted ? 0 : volume / 100;
    levelRef.current = level;
    if (!xfade.current) {
      setDeckLevel(activeDeck.current, level);
    }
  }, [volume, isMuted, setDeckLevel]);

  // Timer auto-start / stop
  useEffect(() => {
    const wasRunning = prevTimerRunning.current;
    prevTimerRunning.current = isTimerRunning;
    if (!autoStartWithTimer) return;
    if (isTimerRunning && !wasRunning) {
      if (statusRef.current === "idle" || statusRef.current === "error") {
        playStationApi(stationIdxRef.current, 0);
      }
    }
    if (!isTimerRunning && wasRunning) {
      if (statusRef.current === "playing" || statusRef.current === "loading") {
        stopAudioApi();
        setActiveId(null);
      }
    }
  }, [isTimerRunning, autoStartWithTimer, playStationApi, stopAudioApi]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (xfadeTimer.current !== null) clearInterval(xfadeTimer.current);
      xfade.current = null;
      decks.current.forEach((d) => {
        if (d) {
          d.pause();
          try {
            d.removeAttribute("src");
            d.load();
          } catch {
            /* noop */
          }
        }
      });
    },
    [],
  );

  const handleStationClick = useCallback(
    (idx: number) => {
      const station = STATIONS[idx];
      if (!station) return;
      const isThisOne = activeId === station.id;
      const isActive =
        isThisOne && (statusRef.current === "playing" || statusRef.current === "loading");
      if (isActive) {
        stopAudioApi();
        setActiveId(null);
      } else {
        playStationApi(idx, MANUAL_XFADE_SEC);
      }
    },
    [activeId, playStationApi, stopAudioApi],
  );

  const playNextStation = useCallback(() => {
    playStationApi((stationIdxRef.current + 1) % STATIONS.length, MANUAL_XFADE_SEC);
  }, [playStationApi]);

  const playPrevStation = useCallback(() => {
    playStationApi(
      (stationIdxRef.current - 1 + STATIONS.length) % STATIONS.length,
      MANUAL_XFADE_SEC,
    );
  }, [playStationApi]);

  const togglePlayPause = useCallback(() => {
    if (statusRef.current === "playing" || statusRef.current === "loading") {
      stopAudioApi();
      setActiveId(null);
    } else {
      playStationApi(stationIdxRef.current, 0);
    }
  }, [playStationApi, stopAudioApi]);

  return {
    stations: STATIONS,
    activeId,
    activeStation: STATIONS.find((s) => s.id === activeId) ?? null,
    status,
    nowPlaying,
    errorMsg,
    volume,
    isMuted,
    setVolume,
    setIsMuted,
    handleStationClick,
    playNextStation,
    playPrevStation,
    togglePlayPause,
    stopAudio: stopAudioApi,
  };
}
