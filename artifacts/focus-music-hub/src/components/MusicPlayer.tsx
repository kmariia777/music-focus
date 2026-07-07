import { Radio, Wind, Loader2, AlertCircle, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import type { Stream, StreamId, StreamStatus } from "@/hooks/useAudio";

function LayersIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

const STREAM_ICONS: Record<StreamId, React.ComponentType<{ size?: number; className?: string }>> = {
  frisky: Radio,
  deep: LayersIcon as React.ComponentType<{ size?: number; className?: string }>,
  chill: Wind,
};

interface MusicPlayerProps {
  streams: readonly Stream[];
  activeId: StreamId | null;
  status: StreamStatus;
  errorMsg: string | null;
  volume: number;
  isMuted: boolean;
  onStreamClick: (idx: number) => void;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
}

export function MusicPlayer({
  streams, activeId, status, errorMsg, volume, isMuted,
  onStreamClick, onVolumeChange, onMuteToggle,
}: MusicPlayerProps) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.09)",
    }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Streams</h2>
        <button
          onClick={onMuteToggle}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 text-muted-foreground hover:text-foreground"
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>

      {/* Stream list */}
      <div className="px-3 pb-3 flex flex-col gap-2">
        {streams.map((stream, idx) => {
          const isActive = activeId === stream.id;
          const isPlaying = isActive && status === "playing";
          const isLoading = isActive && status === "loading";
          const Icon = STREAM_ICONS[stream.id] ?? Radio;

          return (
            <motion.button
              key={stream.id}
              data-testid={`button-stream-${stream.id}`}
              onClick={() => onStreamClick(idx)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
              style={isPlaying || isLoading
                ? {
                    background: `linear-gradient(135deg, ${stream.color}18, ${stream.color}08)`,
                    border: `1px solid ${stream.color}40`,
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }
              }
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: isPlaying || isLoading ? `${stream.color}28` : "rgba(255,255,255,0.08)",
                  color: isPlaying || isLoading ? stream.color : "hsl(var(--muted-foreground))",
                }}
              >
                <Icon size={16} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none">{stream.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stream.description}</p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {isLoading && <Loader2 size={13} className="animate-spin" style={{ color: stream.color }} />}
                {isPlaying && (
                  <div className="flex items-end gap-[2px] h-3.5 mr-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-[3px] rounded-full"
                        style={{
                          height: "100%",
                          background: stream.color,
                          animation: `eq-bar ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.07}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isPlaying || isLoading ? stream.color : "rgba(255,255,255,0.1)",
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

      {/* Error */}
      <AnimatePresence>
        {errorMsg && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-3 text-xs text-red-400 flex items-center gap-1.5"
          >
            <AlertCircle size={11} /> {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Volume */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
          <button onClick={onMuteToggle} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <Slider
            data-testid="slider-music-volume"
            value={[isMuted ? 0 : volume]}
            onValueChange={([v]) => { onVolumeChange(v); if (v > 0 && isMuted) onMuteToggle(); }}
            min={0} max={100} step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">
            {isMuted ? "0" : volume}%
          </span>
        </div>
      </div>
    </div>
  );
}
