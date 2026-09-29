import { useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward, SkipBack, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { TimerMode, TimerStats } from "@/hooks/useTimer";
import type { Station, AudioStatus } from "@/hooks/useAudio";

interface PomodoroTimerProps {
  mode: TimerMode;
  isRunning: boolean;
  displayTime: string;
  progress: number;
  sessionCount: number;
  sessionsBeforeLongBreak: number;
  stats: TimerStats;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onOpenSettings: () => void;
  // Audio mini-player
  activeStation: Station | null;
  audioStatus: AudioStatus;
  nowPlaying: string | null;
  onTogglePlay: () => void;
  onNextStation: () => void;
  onPrevStation: () => void;
}

const SIZE = 260;
const R = 112;
const C = 2 * Math.PI * R;

const MODE_LABEL: Record<TimerMode, string> = {
  work: "Focus",
  "short-break": "Short Break",
  "long-break": "Long Break",
};

const SESSION_SEQUENCE = [
  { label: "Focus", key: "work" as TimerMode, duration: (s: { workDuration: number }) => s.workDuration },
  { label: "Short Break", key: "short-break" as TimerMode },
  { label: "Focus", key: "work" as TimerMode },
  { label: "Long Break", key: "long-break" as TimerMode },
];

const RING_GRADIENT = "url(#timerGradient)";

export function PomodoroTimer({
  mode, isRunning, displayTime, progress, sessionCount, sessionsBeforeLongBreak,
  stats, onStart, onPause, onReset, onSkip, onOpenSettings,
  activeStation, audioStatus, nowPlaying, onTogglePlay, onNextStation, onPrevStation,
}: PomodoroTimerProps) {
  const handleToggle = useCallback(() => {
    if (isRunning) onPause(); else onStart();
  }, [isRunning, onStart, onPause]);

  const DAILY_GOAL = 4;
  const goalPct = Math.min(stats.sessionsCompleted / DAILY_GOAL, 1);
  const modeLabel = MODE_LABEL[mode];
  const isBreak = mode !== "work";

  const stepInCycle = sessionCount % sessionsBeforeLongBreak;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Mode + session indicator */}
      <div className="flex items-center gap-3 mb-2">
        <span
          className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{
            background: isBreak ? "rgba(52,211,153,.15)" : "rgba(139,92,246,.18)",
            color: isBreak ? "#34d399" : "#a78bfa",
          }}
        >
          {modeLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          Pomodoro {Math.min(stepInCycle + 1, sessionsBeforeLongBreak)} of {sessionsBeforeLongBreak}
        </span>
        <button
          data-testid="button-open-settings"
          onClick={onOpenSettings}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Settings
        </button>
      </div>

      {/* Timer ring */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* Glow behind ring when running */}
        {isRunning && (
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-30"
            style={{ background: isBreak ? "#34d399" : "#8b5cf6" }}
          />
        )}

        <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isBreak ? "#34d399" : "#6d28d9"} />
              <stop offset="100%" stopColor={isBreak ? "#059669" : "#a78bfa"} />
            </linearGradient>
            <filter id="ringGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Track */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={8}
          />
          {/* Progress arc */}
          <motion.circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke={RING_GRADIENT}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            filter="url(#ringGlow)"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            data-testid="text-timer-display"
            className="font-mono font-bold tracking-tight text-foreground leading-none"
            style={{ fontSize: 54 }}
          >
            {displayTime}
          </span>
          {isRunning && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] mt-2 font-medium tracking-widest uppercase"
              style={{ color: isBreak ? "#34d399" : "#a78bfa" }}
            >
              {modeLabel}
            </motion.span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-6">
        <button
          data-testid="button-timer-reset"
          onClick={onReset}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <RotateCcw size={17} className="text-muted-foreground" />
        </button>

        <motion.button
          data-testid="button-timer-toggle"
          onClick={handleToggle}
          whileTap={{ scale: 0.93 }}
          className="w-18 h-18 rounded-full flex items-center justify-center shadow-xl"
          style={{
            width: 72, height: 72,
            background: isBreak
              ? "linear-gradient(135deg, #059669, #34d399)"
              : "linear-gradient(135deg, #6d28d9, #8b5cf6)",
            boxShadow: isRunning
              ? `0 0 32px ${isBreak ? "rgba(52,211,153,.45)" : "rgba(139,92,246,.45)"}`
              : "0 8px 24px rgba(0,0,0,.4)",
          }}
        >
          {isRunning
            ? <Pause size={26} className="text-white" />
            : <Play size={26} className="text-white translate-x-0.5" />
          }
        </motion.button>

        <button
          data-testid="button-timer-skip"
          onClick={onSkip}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <SkipForward size={17} className="text-muted-foreground" />
        </button>
      </div>

      {/* Session progress bar */}
      <div className="w-full mt-5 px-1">
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">Daily goal</span>
          <span className="text-[11px]" style={{ color: goalPct >= 1 ? "#34d399" : "hsl(var(--muted-foreground))" }}>
            {stats.sessionsCompleted}/{DAILY_GOAL}{goalPct >= 1 ? " · Done!" : ""}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #6d28d9, #a78bfa)" }}
            animate={{ width: `${goalPct * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{stats.totalFocusMinutes} min focused</span>
          {goalPct < 1 && (
            <span className="text-[10px] text-muted-foreground">{DAILY_GOAL - stats.sessionsCompleted} left</span>
          )}
        </div>
      </div>

      {/* Session sequence pills */}
      <div className="flex items-center gap-1.5 mt-4 flex-wrap justify-center">
        {SESSION_SEQUENCE.map((step, i) => {
          const isWork = step.key === "work";
          const isCurrent = step.key === mode && (isWork ? !isBreak : true);
          return (
            <div
              key={i}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
              style={{
                background: isCurrent
                  ? isWork ? "rgba(139,92,246,.22)" : "rgba(52,211,153,.15)"
                  : "rgba(255,255,255,0.05)",
                color: isCurrent
                  ? isWork ? "#a78bfa" : "#34d399"
                  : "hsl(var(--muted-foreground))",
                border: isCurrent
                  ? `1px solid ${isWork ? "rgba(139,92,246,.3)" : "rgba(52,211,153,.25)"}`
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{
                background: isCurrent ? (isWork ? "#a78bfa" : "#34d399") : "rgba(255,255,255,0.2)",
              }} />
              {step.label}
            </div>
          );
        })}
      </div>

      {/* Mini Music Player */}
      <div className="w-full mt-4 rounded-2xl p-3 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
        {/* Station icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
          style={{ background: activeStation ? `${activeStation.color}28` : "rgba(255,255,255,0.07)" }}
        >
          {(audioStatus === "playing") && activeStation && (
            <div className="flex items-end gap-[2px] h-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-[3px] rounded-full"
                  style={{
                    height: "100%",
                    background: activeStation.color,
                    animation: `eq-bar ${0.45 + i * 0.1}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
            </div>
          )}
          {audioStatus === "loading" && (
            <Loader2 size={16} className="animate-spin" style={{ color: activeStation?.color ?? "#8b5cf6" }} />
          )}
          {(audioStatus === "idle" || audioStatus === "error") && (
            <div className="w-4 h-4 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-none truncate">
            {activeStation?.label ?? "No station selected"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {audioStatus === "playing" && nowPlaying
              ? `♪ ${nowPlaying}`
              : (activeStation?.description ?? "Tap a station to play")}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onPrevStation}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          >
            <SkipBack size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: activeStation
                ? `linear-gradient(135deg, ${activeStation.color}cc, ${activeStation.color})`
                : "rgba(139,92,246,0.7)",
            }}
          >
            {audioStatus === "loading"
              ? <Loader2 size={14} className="text-white animate-spin" />
              : audioStatus === "playing"
              ? <Pause size={14} className="text-white" />
              : <Play size={14} className="text-white translate-x-[1px]" />
            }
          </button>
          <button
            onClick={onNextStation}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          >
            <SkipForward size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
