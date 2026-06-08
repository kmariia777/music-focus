import { useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import type { TimerMode, TimerStats } from "@/hooks/useTimer";

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
}

const MODE_CONFIG: Record<TimerMode, { label: string; ring: string; glow: string; bg: string }> = {
  work: {
    label: "Focus",
    ring: "#335C81",
    glow: "rgba(51,92,129,0.25)",
    bg: "rgba(51,92,129,0.06)",
  },
  "short-break": {
    label: "Short Break",
    ring: "#77ACA2",
    glow: "rgba(119,172,162,0.25)",
    bg: "rgba(119,172,162,0.06)",
  },
  "long-break": {
    label: "Long Break",
    ring: "#9DBEBB",
    glow: "rgba(157,190,187,0.25)",
    bg: "rgba(157,190,187,0.06)",
  },
};

const DAILY_GOAL = 4;
const SIZE = 240;
const R = 104;
const C = 2 * Math.PI * R;

export function PomodoroTimer({
  mode,
  isRunning,
  displayTime,
  progress,
  sessionCount,
  sessionsBeforeLongBreak,
  stats,
  onStart,
  onPause,
  onReset,
  onSkip,
  onOpenSettings,
}: PomodoroTimerProps) {
  const cfg = MODE_CONFIG[mode];
  const handleToggle = useCallback(() => {
    if (isRunning) onPause(); else onStart();
  }, [isRunning, onStart, onPause]);

  const goalPct = Math.min(stats.sessionsCompleted / DAILY_GOAL, 1);
  const sessionDisplay = Math.min(sessionCount % sessionsBeforeLongBreak + 1, sessionsBeforeLongBreak);

  return (
    <div className="rounded-2xl bg-card border border-card-border shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.ring }}
          >
            {cfg.label}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {sessionDisplay}/{sessionsBeforeLongBreak}
          </span>
        </div>
        <button
          data-testid="button-open-settings"
          onClick={onOpenSettings}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Customize
        </button>
      </div>

      {/* Ring + Time */}
      <div className="flex justify-center py-6">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          {/* Glow */}
          {isRunning && (
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-60 transition-all"
              style={{ background: cfg.glow }}
            />
          )}
          <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
            <motion.circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={cfg.ring}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              data-testid="text-timer-display"
              className="font-mono font-bold tracking-tight text-foreground leading-none"
              style={{ fontSize: 52 }}
            >
              {displayTime}
            </span>
            {isRunning && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] mt-2 font-medium tracking-widest uppercase"
                style={{ color: cfg.ring }}
              >
                Running
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 pb-6">
        <button
          data-testid="button-timer-reset"
          onClick={onReset}
          className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
        >
          <RotateCcw size={16} />
        </button>

        <motion.button
          data-testid="button-timer-toggle"
          onClick={handleToggle}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all"
          style={{ background: cfg.ring, boxShadow: isRunning ? `0 0 24px ${cfg.glow}` : "none" }}
        >
          {isRunning
            ? <Pause size={22} className="text-white" />
            : <Play size={22} className="text-white translate-x-0.5" />
          }
        </motion.button>

        <button
          data-testid="button-timer-skip"
          onClick={onSkip}
          className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
        >
          <SkipForward size={16} />
        </button>
      </div>

      {/* Stats */}
      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted-foreground">Daily Goal</span>
          <span className="text-[11px] font-semibold" style={{ color: goalPct >= 1 ? "#27ae60" : "hsl(var(--muted-foreground))" }}>
            {stats.sessionsCompleted}/{DAILY_GOAL}
            {goalPct >= 1 ? " · Complete!" : ""}
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: cfg.ring }}
            animate={{ width: `${goalPct * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-muted-foreground">{stats.totalFocusMinutes} min focused</span>
          <span className="text-[11px] text-muted-foreground">
            {goalPct < 1 ? `${DAILY_GOAL - stats.sessionsCompleted} sessions left` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
