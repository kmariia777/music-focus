import { useCallback, useEffect, useRef, useState } from "react";

export type TimerMode = "work" | "short-break" | "long-break";

export interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

export interface TimerStats {
  sessionsCompleted: number;
  totalFocusMinutes: number;
  lastResetDate: string;
}

interface UseTimerOptions {
  settings: TimerSettings;
  stats: TimerStats;
  onStatsUpdate: (stats: TimerStats) => void;
  soundEnabled: boolean;
  onSessionComplete?: () => void;
}

function todayStr() {
  return new Date().toDateString();
}

export function useTimer({ settings, stats, onStatsUpdate, soundEnabled, onSessionComplete }: UseTimerOptions) {
  const [mode, setMode] = useState<TimerMode>("work");
  const [sessionCount, setSessionCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(settings.workDuration * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const getDuration = useCallback((m: TimerMode) => {
    const s = settingsRef.current;
    if (m === "work") return s.workDuration * 60;
    if (m === "short-break") return s.shortBreakDuration * 60;
    return s.longBreakDuration * 60;
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleSessionEnd = useCallback(() => {
    clearTimer();
    setIsRunning(false);

    if (soundEnabled) {
      import("../lib/sounds").then(({ playChime }) => playChime(0.5));
    }

    if (mode === "work") {
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);

      const today = todayStr();
      const resetDate = stats.lastResetDate !== today ? today : stats.lastResetDate;
      const newSessions = stats.lastResetDate !== today ? 1 : stats.sessionsCompleted + 1;
      const newMinutes = stats.lastResetDate !== today
        ? settingsRef.current.workDuration
        : stats.totalFocusMinutes + settingsRef.current.workDuration;

      onStatsUpdate({
        sessionsCompleted: newSessions,
        totalFocusMinutes: newMinutes,
        lastResetDate: resetDate,
      });

      onSessionComplete?.();

      const nextMode: TimerMode = newSessionCount % settingsRef.current.sessionsBeforeLongBreak === 0
        ? "long-break"
        : "short-break";

      setMode(nextMode);
      setSecondsLeft(getDuration(nextMode));
    } else {
      setMode("work");
      setSecondsLeft(getDuration("work"));
    }
  }, [clearTimer, mode, sessionCount, stats, onStatsUpdate, soundEnabled, onSessionComplete, getDuration]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isRunning, handleSessionEnd, clearTimer]);

  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(getDuration(mode));
    }
  }, [settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setSecondsLeft(getDuration(mode));
  }, [clearTimer, getDuration, mode]);

  const skip = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    let nextMode: TimerMode;
    if (mode === "work") {
      const nextSession = sessionCount + 1;
      setSessionCount(nextSession);
      nextMode = nextSession % settings.sessionsBeforeLongBreak === 0 ? "long-break" : "short-break";
    } else {
      nextMode = "work";
    }
    setMode(nextMode);
    setSecondsLeft(getDuration(nextMode));
  }, [clearTimer, mode, sessionCount, settings.sessionsBeforeLongBreak, getDuration]);

  const setModeManual = useCallback((m: TimerMode) => {
    clearTimer();
    setIsRunning(false);
    setMode(m);
    setSecondsLeft(getDuration(m));
  }, [clearTimer, getDuration]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const displayTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progress = 1 - secondsLeft / getDuration(mode);

  return {
    mode,
    isRunning,
    secondsLeft,
    displayTime,
    progress,
    sessionCount,
    sessionsBeforeLongBreak: settings.sessionsBeforeLongBreak,
    start,
    pause,
    reset,
    skip,
    setMode: setModeManual,
  };
}
