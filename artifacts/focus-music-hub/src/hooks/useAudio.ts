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
    ],
  },
  {
    id: "immerse",
    label: "Immerse",
    description: "Underground / Melodic",
    color: "#5b8dee",
    tracks: [
      track("In a Heartbeat", "immerse/In a Heartbeat.mp3"),
      track("Laser Groove", "immerse/Laser Groove.mp3"),
      track("Shiny Tech", "immerse/Shiny Tech.mp3"),
      track("Shenzhen Nightlife", "immerse/Shenzhen Nightlife.mp3"),
      track("Special Spotlight", "immerse/Special Spotlight.mp3"),
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

export function useAudio({ isTimerRunning, autoStartWithTimer }: UseAudioOptions) {
  const [activeId, setActiveId] = useState<StationId | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const statusRef = useRef<AudioStatus>("idle");
  const stationIdxRef = useRef(0);
  const queueRef = useRef<number[]>([]);
  const queuePosRef = useRef(0);
  const failedRef = useRef<Set<number>>(new Set());
  const prevTimerRunning = useRef(isTimerRunning);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  volumeRef.current = volume;
  isMutedRef.current = isMuted;

  // Web Audio API gain control — needed only because iOS Safari ignores
  // `audio.volume` on <audio> elements entirely. Everywhere else, plain
  // audio.volume is simpler and more reliable, so we scope this to iOS.
  const isIOS = useRef(
    typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)),
  );

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

  const updateStatus = useCallback((s: AudioStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  /** Destroy the current <audio> element without touching queue/state. */
  const teardownAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        /* noop */
      }
      sourceNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch {
        /* noop */
      }
      gainNodeRef.current = null;
    }
    if (audioRef.current) {
      const a = audioRef.current;
      audioRef.current = null;
      a.pause();
      a.src = "";
      a.load();
    }
  }, []);

  const stopAudio = useCallback(() => {
    teardownAudio();
    queueRef.current = [];
    queuePosRef.current = 0;
    failedRef.current = new Set();
    updateStatus("idle");
    setNowPlaying(null);
    setErrorMsg(null);
  }, [teardownAudio, updateStatus]);

  /** Fisher-Yates shuffle of track indices; avoids repeating `avoidTrack` first. */
  const buildQueue = useCallback((stationIdx: number, avoidTrack: number | null) => {
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
  }, []);

  const applyVolume = useCallback(
    (audio: HTMLAudioElement) => {
      try {
        const ctx = getAudioContext();
        if (ctx) {
          const source = ctx.createMediaElementSource(audio);
          const gain = ctx.createGain();
          gain.gain.value = isMutedRef.current ? 0 : volumeRef.current / 100;
          source.connect(gain).connect(ctx.destination);
          sourceNodeRef.current = source;
          gainNodeRef.current = gain;
        } else {
          audio.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
        }
      } catch {
        // Web Audio graph unavailable (e.g. unsupported browser) — fall back to element volume
        audio.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
      }
    },
    [getAudioContext],
  );

  /** Play the track at the current queue position, skipping failed ones. */
  const startElement = useCallback(
    (stationIdx: number) => {
      const station = STATIONS[stationIdx];
      if (!station) return;

      // Skip tracks that failed to load in this pass
      while (
        queuePosRef.current < queueRef.current.length &&
        failedRef.current.has(queueRef.current[queuePosRef.current] as number)
      ) {
        queuePosRef.current++;
      }
      if (queuePosRef.current >= queueRef.current.length) {
        if (failedRef.current.size >= station.tracks.length) {
          teardownAudio();
          updateStatus("error");
          setNowPlaying(null);
          setErrorMsg("Could not play station");
          return;
        }
        buildQueue(stationIdx, null);
      }

      const tIdx = queueRef.current[queuePosRef.current] as number;
      const tr = station.tracks[tIdx];
      if (!tr) return;

      teardownAudio();
      setActiveId(station.id);
      setErrorMsg(null);
      setNowPlaying(tr.title);
      updateStatus("loading");

      const audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;

      audio.addEventListener("playing", () => {
        if (audioRef.current === audio) updateStatus("playing");
      });
      audio.addEventListener("waiting", () => {
        if (audioRef.current === audio) updateStatus("loading");
      });
      audio.addEventListener("ended", () => {
        if (audioRef.current !== audio) return;
        const lastTrack = queueRef.current[queuePosRef.current] as number;
        failedRef.current = new Set(); // transient errors may have cleared
        queuePosRef.current++;
        if (queuePosRef.current >= queueRef.current.length) {
          buildQueue(stationIdxRef.current, lastTrack);
        }
        startElement(stationIdxRef.current);
      });
      audio.addEventListener("error", () => {
        if (audioRef.current !== audio) return;
        const failedIdx = queueRef.current[queuePosRef.current] as number;
        failedRef.current.add(failedIdx);
        if (failedRef.current.size >= station.tracks.length) {
          teardownAudio();
          updateStatus("error");
          setNowPlaying(null);
          setErrorMsg("Could not play station");
          return;
        }
        queuePosRef.current++;
        startElement(stationIdxRef.current);
      });

      applyVolume(audio);
      audio.src = `${audioBase()}${encodeURI(tr.file)}`;
      audio.play().catch((err: Error) => {
        if (err.name !== "AbortError" && audioRef.current === audio) {
          updateStatus("error");
          setErrorMsg("Could not start station");
        }
      });
    },
    [applyVolume, buildQueue, teardownAudio, updateStatus],
  );

  const playStation = useCallback(
    (idx: number) => {
      const station = STATIONS[idx];
      if (!station) return;
      stationIdxRef.current = idx;
      buildQueue(idx, null);
      startElement(idx);
    },
    [buildQueue, startElement],
  );

  // Sync volume/mute to running audio — via GainNode when available (required
  // for iOS Safari, which silently ignores audio.volume), else the element itself.
  useEffect(() => {
    const level = isMuted ? 0 : volume / 100;
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = level;
    } else if (audioRef.current) {
      audioRef.current.volume = level;
    }
  }, [volume, isMuted]);

  // Timer auto-start / stop — no status in deps, uses ref
  useEffect(() => {
    const wasRunning = prevTimerRunning.current;
    prevTimerRunning.current = isTimerRunning;
    if (!autoStartWithTimer) return;
    if (isTimerRunning && !wasRunning) {
      // Only auto-play if nothing is already playing
      if (statusRef.current === "idle" || statusRef.current === "error") {
        playStation(stationIdxRef.current);
      }
    }
    if (!isTimerRunning && wasRunning) {
      if (statusRef.current === "playing" || statusRef.current === "loading") {
        stopAudio();
        setActiveId(null);
      }
    }
  }, [isTimerRunning, autoStartWithTimer, playStation, stopAudio]);

  // Cleanup on unmount
  useEffect(() => () => teardownAudio(), [teardownAudio]);

  const handleStationClick = useCallback(
    (idx: number) => {
      const station = STATIONS[idx];
      if (!station) return;
      const isThisOne = activeId === station.id;
      const isActive =
        isThisOne && (statusRef.current === "playing" || statusRef.current === "loading");
      if (isActive) {
        stopAudio();
        setActiveId(null);
      } else {
        playStation(idx);
      }
    },
    [activeId, playStation, stopAudio],
  );

  const playNextStation = useCallback(() => {
    playStation((stationIdxRef.current + 1) % STATIONS.length);
  }, [playStation]);

  const playPrevStation = useCallback(() => {
    playStation((stationIdxRef.current - 1 + STATIONS.length) % STATIONS.length);
  }, [playStation]);

  const togglePlayPause = useCallback(() => {
    if (statusRef.current === "playing" || statusRef.current === "loading") {
      stopAudio();
      setActiveId(null);
    } else {
      playStation(stationIdxRef.current);
    }
  }, [playStation, stopAudio]);

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
    stopAudio,
  };
}
