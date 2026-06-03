import { useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { TimerMode } from "@/hooks/useTimer";
import type { TimerStats } from "@/hooks/useTimer";

interface PomodoroTimerProps {
  mode: TimerMode;
  isRunning: boolean;
  displayTime: string;
  progress: number;
  sessionCount: number;
  sessionsBeforeLongBreak: number;
  stats: TimerStats;
  volume: number;
  onVolumeChange: (v: number) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onOpenSettings: () => void;
}

const modeLabel: Record<TimerMode, string> = {
  work: "WORK MODE",
  "short-break": "SHORT BREAK",
  "long-break": "LONG BREAK",
};

const modeColor: Record<TimerMode, string> = {
  work: "text-[#9DBEBB]",
  "short-break": "text-[#77ACA2]",
  "long-break": "text-[#77ACA2]",
};

const modeRingColor: Record<TimerMode, string> = {
  work: "#335C81",
  "short-break": "#77ACA2",
  "long-break": "#9DBEBB",
};

export function PomodoroTimer({
  mode,
  isRunning,
  displayTime,
  progress,
  sessionCount,
  sessionsBeforeLongBreak,
  stats,
  volume,
  onVolumeChange,
  onStart,
  onPause,
  onReset,
  onSkip,
  onOpenSettings,
}: PomodoroTimerProps) {
  const handleToggle = useCallback(() => {
    if (isRunning) onPause();
    else onStart();
  }, [isRunning, onStart, onPause]);

  const dailyGoal = 4;
  const goalProgress = Math.min(stats.sessionsCompleted / dailyGoal, 1);

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-6 p-6 rounded-2xl bg-card border border-card-border shadow-lg">
      <div className="flex items-center justify-between w-full">
        <span className={`text-xs font-semibold tracking-widest uppercase ${modeColor[mode]}`}>
          {modeLabel[mode]}
        </span>
        <button
          data-testid="button-open-settings"
          onClick={onOpenSettings}
          className="text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          Settings
        </button>
      </div>

      <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
        <svg width="260" height="260" className="absolute inset-0 -rotate-90">
          <circle
            cx="130"
            cy="130"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          <circle
            cx="130"
            cy="130"
            r={radius}
            fill="none"
            stroke={modeRingColor[mode]}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDash}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="flex flex-col items-center z-10">
          <span
            data-testid="text-timer-display"
            className="font-mono font-bold text-foreground leading-none"
            style={{ fontSize: "clamp(48px, 10vw, 72px)" }}
          >
            {displayTime}
          </span>
          <span className="text-muted-foreground text-sm mt-2">
            Session {Math.min(sessionCount % sessionsBeforeLongBreak + 1, sessionsBeforeLongBreak)}/{sessionsBeforeLongBreak}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          data-testid="button-timer-reset"
          onClick={onReset}
          className="p-2.5 rounded-full bg-muted hover:bg-accent/30 text-muted-foreground hover:text-foreground transition-all"
        >
          <RotateCcw size={18} />
        </button>
        <button
          data-testid="button-timer-toggle"
          onClick={handleToggle}
          className="px-10 py-3 rounded-full font-semibold text-sm tracking-wide transition-all shadow-md"
          style={{
            background: isRunning ? "hsl(var(--secondary))" : "hsl(var(--primary))",
            color: "#fff",
          }}
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          data-testid="button-timer-skip"
          onClick={onSkip}
          className="p-2.5 rounded-full bg-muted hover:bg-accent/30 text-muted-foreground hover:text-foreground transition-all"
        >
          <SkipForward size={18} />
        </button>
      </div>

      <div className="flex items-center gap-3 w-full max-w-xs">
        <Volume2 size={16} className="text-muted-foreground shrink-0" />
        <Slider
          data-testid="slider-volume"
          value={[volume]}
          onValueChange={([v]) => onVolumeChange(v)}
          min={0}
          max={100}
          step={1}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-7 text-right">{volume}%</span>
      </div>

      <div className="w-full border-t border-border pt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Today's Progress</span>
          <span>{stats.sessionsCompleted}/{dailyGoal} sessions</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${goalProgress * 100}%`,
              background: "hsl(var(--secondary))",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{stats.totalFocusMinutes} min focused</span>
          <span>{stats.sessionsCompleted >= dailyGoal ? "Goal reached!" : `${dailyGoal - stats.sessionsCompleted} to go`}</span>
        </div>
      </div>
    </div>
  );
}
