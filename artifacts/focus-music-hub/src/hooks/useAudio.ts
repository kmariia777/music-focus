import { useCallback, useEffect, useRef, useState } from "react";

export const STREAMS = [
  {
    id: "frisky" as const,
    label: "Focus",
    description: "Progressive / Uplifting",
    url: "https://stream.frisky.friskyradio.com/frisky_mp3_high",
    color: "#8b5cf6",
  },
  {
    id: "deep" as const,
    label: "Immerse",
    description: "Underground / Melodic",
    url: "https://deep.friskyradio.com/friskychill_mp3_high",
    color: "#5b8dee",
  },
  {
    id: "chill" as const,
    label: "Drift",
    description: "Ambient / Downtempo",
    url: "https://chill.friskyradio.com/friskychill_mp3_high",
    color: "#34d399",
  },
];

export type StreamId = (typeof STREAMS)[number]["id"];
export type StreamStatus = "idle" | "loading" | "playing" | "error";
export type Stream = (typeof STREAMS)[number];

interface UseAudioOptions {
  isTimerRunning: boolean;
  autoStartWithTimer: boolean;
}

export function useAudio({ isTimerRunning, autoStartWithTimer }: UseAudioOptions) {
  const [activeId, setActiveId] = useState<StreamId | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const statusRef = useRef<StreamStatus>("idle");
  const prevTimerRunning = useRef(isTimerRunning);
  const lastIdxRef = useRef(0);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  volumeRef.current = volume;
  isMutedRef.current = isMuted;

  const updateStatus = useCallback((s: StreamStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const rawStop = useCallback(() => {
    if (audioRef.current) {
      const a = audioRef.current;
      audioRef.current = null;
      a.pause();
      a.src = "";
      a.load();
    }
  }, []);

  const stopAudio = useCallback(() => {
    rawStop();
    updateStatus("idle");
    setErrorMsg(null);
  }, [rawStop, updateStatus]);

  const playIdx = useCallback((idx: number) => {
    const stream = STREAMS[idx];
    if (!stream) return;

    // Stop existing without setState calls yet
    rawStop();

    lastIdxRef.current = idx;
    setActiveId(stream.id);
    setErrorMsg(null);
    updateStatus("loading");

    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    audio.addEventListener("playing", () => {
      if (audioRef.current === audio) updateStatus("playing");
    });
    audio.addEventListener("waiting", () => {
      if (audioRef.current === audio) updateStatus("loading");
    });
    audio.addEventListener("error", () => {
      if (audioRef.current === audio) {
        updateStatus("error");
        setErrorMsg("Stream unavailable — try another");
      }
    });

    audio.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
    audio.src = stream.url;
    audio.play().catch((err: Error) => {
      if (err.name !== "AbortError" && audioRef.current === audio) {
        updateStatus("error");
        setErrorMsg("Could not start stream");
      }
    });
  }, [rawStop, updateStatus]);

  // Sync volume/mute to running audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
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
        playIdx(lastIdxRef.current);
      }
    }

    if (!isTimerRunning && wasRunning) {
      if (statusRef.current === "playing" || statusRef.current === "loading") {
        stopAudio();
        setActiveId(null);
      }
    }
  }, [isTimerRunning, autoStartWithTimer, playIdx, stopAudio]);

  // Cleanup on unmount
  useEffect(() => () => { rawStop(); }, [rawStop]);

  const handleStreamClick = useCallback((idx: number) => {
    const stream = STREAMS[idx];
    const isThisOne = activeId === stream.id;
    const isActive = isThisOne && (statusRef.current === "playing" || statusRef.current === "loading");

    if (isActive) {
      stopAudio();
      setActiveId(null);
    } else {
      playIdx(idx);
    }
  }, [activeId, playIdx, stopAudio]);

  const playNext = useCallback(() => {
    playIdx((lastIdxRef.current + 1) % STREAMS.length);
  }, [playIdx]);

  const playPrev = useCallback(() => {
    playIdx((lastIdxRef.current - 1 + STREAMS.length) % STREAMS.length);
  }, [playIdx]);

  const togglePlayPause = useCallback(() => {
    if (statusRef.current === "playing" || statusRef.current === "loading") {
      stopAudio();
      setActiveId(null);
    } else {
      playIdx(lastIdxRef.current);
    }
  }, [playIdx, stopAudio]);

  return {
    streams: STREAMS,
    activeId,
    activeStream: STREAMS.find((s) => s.id === activeId) ?? null,
    status,
    errorMsg,
    volume,
    isMuted,
    setVolume,
    setIsMuted,
    handleStreamClick,
    playNext,
    playPrev,
    togglePlayPause,
    stopAudio,
  };
}
