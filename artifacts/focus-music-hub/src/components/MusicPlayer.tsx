import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Stream {
  id: string;
  label: string;
  icon: string;
  url: string;
}

const STREAMS: Stream[] = [
  { id: "focus", label: "Focus", icon: "🧠", url: "https://streams.ilovemusic.de/iloveradio17.mp3" },
  { id: "chillout", label: "Chillout", icon: "🌊", url: "https://streams.ilovemusic.de/iloveradio2.mp3" },
  { id: "deep", label: "Deep", icon: "🌌", url: "https://streams.ilovemusic.de/iloveradio8.mp3" },
];

interface MusicPlayerProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  autoStartWithTimer: boolean;
  isTimerRunning: boolean;
}

export function MusicPlayer({ volume, onVolumeChange, autoStartWithTimer, isTimerRunning }: MusicPlayerProps) {
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevTimerRunning = useRef(isTimerRunning);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playStream = useCallback((stream: Stream) => {
    stopAudio();
    const audio = new Audio(stream.url);
    audio.volume = isMuted ? 0 : volume / 100;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setActiveStream(stream.id);
    setIsPlaying(true);
    audio.onerror = () => { setIsPlaying(false); };
  }, [stopAudio, volume, isMuted]);

  const handleStreamClick = useCallback((stream: Stream) => {
    if (activeStream === stream.id && isPlaying) {
      stopAudio();
      setActiveStream(null);
    } else {
      playStream(stream);
    }
  }, [activeStream, isPlaying, stopAudio, playStream]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (autoStartWithTimer) {
      if (isTimerRunning && !prevTimerRunning.current) {
        const defaultStream = STREAMS[0];
        if (!isPlaying) playStream(defaultStream);
      } else if (!isTimerRunning && prevTimerRunning.current) {
        if (isPlaying) stopAudio();
      }
    }
    prevTimerRunning.current = isTimerRunning;
  }, [isTimerRunning, autoStartWithTimer, isPlaying, playStream, stopAudio]);

  useEffect(() => {
    return () => { stopAudio(); };
  }, [stopAudio]);

  return (
    <div className="p-6 rounded-2xl bg-card border border-card-border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground text-sm tracking-wide uppercase">Music</h2>
        <button
          data-testid="button-music-mute"
          onClick={() => setIsMuted((m) => !m)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {STREAMS.map((stream) => {
          const active = activeStream === stream.id && isPlaying;
          return (
            <button
              key={stream.id}
              data-testid={`button-stream-${stream.id}`}
              onClick={() => handleStreamClick(stream)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                active
                  ? "border-[#77ACA2] bg-[#77ACA2]/10"
                  : "border-border bg-muted/40 hover:border-[#9DBEBB] hover:bg-accent/10"
              }`}
            >
              <span className="text-xl">{stream.icon}</span>
              <span className="font-medium text-sm text-foreground flex-1">{stream.label}</span>
              {active && (
                <div className="flex items-end gap-[2px] h-5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-[#77ACA2]"
                      style={{
                        height: "100%",
                        animation: `eq-bar ${0.6 + i * 0.1}s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.07}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              {!active && activeStream === stream.id && (
                <span className="text-xs text-muted-foreground">Paused</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Volume2 size={14} className="text-muted-foreground shrink-0" />
        <Slider
          data-testid="slider-music-volume"
          value={[volume]}
          onValueChange={([v]) => onVolumeChange(v)}
          min={0}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-7 text-right">{volume}%</span>
      </div>

      <style>{`
        @keyframes eq-bar {
          from { transform: scaleY(0.2); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
