import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, Pause, Radio, Wind, Waves, AlertCircle, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";

interface Stream {
  id: string;
  label: string;
  description: string;
  url: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
}

const STREAMS: Stream[] = [
  {
    id: "focus",
    label: "Frisky",
    description: "Progressive / Uplifting",
    url: "https://stream.frisky.friskyradio.com/frisky_mp3_high",
    Icon: Radio,
    accent: "#335C81",
  },
  {
    id: "deep",
    label: "Deep",
    description: "Underground / Melodic",
    url: "https://deep.friskyradio.com/friskychill_mp3_high",
    Icon: Layers,
    accent: "#4a7c9e",
  },
  {
    id: "chill",
    label: "Chillout",
    description: "Ambient / Downtempo",
    url: "https://chill.friskyradio.com/friskychill_mp3_high",
    Icon: Wind,
    accent: "#77ACA2",
  },
];

function Layers({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

type StreamStatus = "idle" | "loading" | "playing" | "error";

interface MusicPlayerProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  autoStartWithTimer: boolean;
  isTimerRunning: boolean;
}

export function MusicPlayer({ volume, onVolumeChange, autoStartWithTimer, isTimerRunning }: MusicPlayerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs so the timer effect never stale-closes over status/activeId
  const statusRef = useRef<StreamStatus>("idle");
  const prevRunningRef = useRef(isTimerRunning);
  const lastStreamRef = useRef<Stream>(STREAMS[0]);
  // When the user manually picks a stream, suppress timer auto-restart
  const userInitiatedRef = useRef(false);

  const updateStatus = (s: StreamStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audioRef.current = null;
      audio.pause();
      audio.src = "";
      audio.load();
    }
    updateStatus("idle");
    setError(null);
  }, []);

  const playStream = useCallback((stream: Stream) => {
    // Stop whatever is currently playing first
    if (audioRef.current) {
      const old = audioRef.current;
      audioRef.current = null;
      old.pause();
      old.src = "";
      old.load();
    }
    setError(null);
    setActiveId(stream.id);
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
        setError("Stream unavailable — try another channel");
      }
    });

    audio.volume = isMuted ? 0 : volume / 100;
    audio.src = stream.url;
    audio.play().catch((err: Error) => {
      if (err.name !== "AbortError" && audioRef.current === audio) {
        updateStatus("error");
        setError("Could not start stream — click to retry");
      }
    });
  }, [volume, isMuted]);

  // Sync volume/mute to existing audio without recreating it
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Timer auto-start/stop — does NOT depend on status so it won't re-trigger mid-stream-switch
  useEffect(() => {
    const wasRunning = prevRunningRef.current;
    prevRunningRef.current = isTimerRunning;

    if (!autoStartWithTimer) return;

    if (isTimerRunning && !wasRunning) {
      // Timer just started — only auto-play if nothing is already playing
      if (statusRef.current === "idle" && !userInitiatedRef.current) {
        playStream(lastStreamRef.current);
      }
    }

    if (!isTimerRunning && wasRunning) {
      // Timer just stopped — only stop if we were the ones who started it
      if (!userInitiatedRef.current && (statusRef.current === "playing" || statusRef.current === "loading")) {
        stopAudio();
        setActiveId(null);
      }
      userInitiatedRef.current = false;
    }
  }, [isTimerRunning, autoStartWithTimer, playStream, stopAudio]);

  // Cleanup on unmount
  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  const handleClick = useCallback((stream: Stream) => {
    const isActive = activeId === stream.id && (status === "playing" || status === "loading");
    if (isActive) {
      userInitiatedRef.current = false;
      stopAudio();
      setActiveId(null);
    } else {
      userInitiatedRef.current = true;
      lastStreamRef.current = stream;
      playStream(stream);
    }
  }, [activeId, status, stopAudio, playStream]);

  const activeStream = STREAMS.find((s) => s.id === activeId);

  return (
    <div className="rounded-2xl bg-card border border-card-border shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-xs tracking-widest uppercase">Streams</h2>
        <button
          data-testid="button-music-mute"
          onClick={() => setIsMuted((m) => !m)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      <div className="px-3 pb-3 flex flex-col gap-1.5">
        {STREAMS.map((stream) => {
          const isActive = activeId === stream.id;
          const isPlaying = isActive && status === "playing";
          const isLoading = isActive && status === "loading";
          const isError = isActive && status === "error";
          const { Icon } = stream;

          return (
            <motion.button
              key={stream.id}
              data-testid={`button-stream-${stream.id}`}
              onClick={() => handleClick(stream)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`group w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left relative overflow-hidden ${
                isPlaying || isLoading
                  ? "border-transparent"
                  : isError
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border bg-muted/30 hover:bg-muted/60 hover:border-border"
              }`}
              style={
                isPlaying || isLoading
                  ? { background: `linear-gradient(135deg, ${stream.accent}22 0%, ${stream.accent}08 100%)`, borderColor: `${stream.accent}60` }
                  : {}
              }
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: isPlaying || isLoading ? `${stream.accent}30` : "hsl(var(--muted))",
                  color: isPlaying || isLoading ? stream.accent : "hsl(var(--muted-foreground))",
                }}
              >
                <Icon size={16} />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold leading-none mb-0.5 text-foreground">{stream.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{stream.description}</p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {isLoading && <Loader2 size={14} className="animate-spin" style={{ color: stream.accent }} />}
                {isError && <AlertCircle size={14} className="text-destructive" />}
                {isPlaying && (
                  <div className="flex items-end gap-[2px] h-4 mr-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[3px] rounded-full"
                        style={{
                          height: "100%",
                          background: stream.accent,
                          animation: `eq-bar ${0.5 + i * 0.12}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isPlaying || isLoading ? stream.accent : "hsl(var(--muted))",
                    color: isPlaying || isLoading ? "#fff" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {isPlaying ? <Pause size={11} /> : <Play size={11} className="translate-x-[1px]" />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-3 text-xs text-destructive flex items-center gap-1.5"
          >
            <AlertCircle size={11} /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Single volume control */}
      <div className="px-5 pb-5 pt-1">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
          <button
            onClick={() => setIsMuted((m) => !m)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <Slider
            data-testid="slider-music-volume"
            value={[isMuted ? 0 : volume]}
            onValueChange={([v]) => {
              onVolumeChange(v);
              if (v > 0) setIsMuted(false);
            }}
            min={0} max={100} step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">
            {isMuted ? "0" : volume}%
          </span>
        </div>
      </div>

      <AnimatePresence>
        {activeStream && (status === "playing" || status === "loading") && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="px-5 pb-4"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Waves size={11} style={{ color: activeStream.accent }} />
              <span>
                {status === "loading" ? "Connecting to stream..." : `Now streaming · ${activeStream.label}`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes eq-bar {
          from { transform: scaleY(0.15); transform-origin: bottom; }
          to   { transform: scaleY(1);    transform-origin: bottom; }
        }
      `}</style>
    </div>
  );
}
