import { useCallback, useEffect, useState } from "react";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { MusicPlayer } from "@/components/MusicPlayer";
import { TaskManager } from "@/components/TaskManager";
import type { Task } from "@/components/TaskManager";
import { AICoach } from "@/components/AICoach";
import { SettingsPanel } from "@/components/SettingsPanel";
import type { AppSettings } from "@/components/SettingsPanel";
import type { DailyRecord } from "@/components/StreakHeatmap";
import { CalendarTaskModal } from "@/components/CalendarTaskModal";
import type { CalendarEvent } from "@/components/CalendarTaskModal";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTimer } from "@/hooks/useTimer";
import type { TimerStats } from "@/hooks/useTimer";
import { useAudio } from "@/hooks/useAudio";
import { CalendarDays, SlidersHorizontal, Timer } from "lucide-react";

const DEFAULT_SETTINGS: AppSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartMusic: true,
  soundNotifications: true,
  darkMode: true,
};

const DEFAULT_STATS: TimerStats = {
  sessionsCompleted: 0,
  totalFocusMinutes: 0,
  lastResetDate: new Date().toDateString(),
};

function checkMidnightReset(stats: TimerStats): TimerStats {
  const today = new Date().toDateString();
  if (stats.lastResetDate !== today) {
    return { sessionsCompleted: 0, totalFocusMinutes: 0, lastResetDate: today };
  }
  return stats;
}

function formatDueLabel(dueDate?: string): string {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const due = new Date(d); due.setHours(0, 0, 0, 0);
  if (due.getTime() === today.getTime()) return "Today";
  if (due.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Home() {
  const [settings, setSettings] = useLocalStorage<AppSettings>("focusMusicHubSettings", DEFAULT_SETTINGS);
  const [rawStats, setStats] = useLocalStorage<TimerStats>("focusMusicHubStats", DEFAULT_STATS);
  const [tasks, setTasks] = useLocalStorage<Task[]>("focusMusicHubTasks", []);
  const [history, setHistory] = useLocalStorage<DailyRecord[]>("focusMusicHubHistory", []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Force dark class always
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const stats = checkMidnightReset(rawStats);

  const recordSession = useCallback((s: TimerStats) => {
    const today = new Date().toDateString();
    setHistory((prev) => {
      const exists = prev.find((d) => d.date === today);
      if (exists) return prev.map((d) => d.date === today ? { ...d, sessions: s.sessionsCompleted, minutes: s.totalFocusMinutes } : d);
      return [...prev, { date: today, sessions: s.sessionsCompleted, minutes: s.totalFocusMinutes }];
    });
  }, [setHistory]);

  const timer = useTimer({
    settings: {
      workDuration: settings.workDuration,
      shortBreakDuration: settings.shortBreakDuration,
      longBreakDuration: settings.longBreakDuration,
      sessionsBeforeLongBreak: settings.sessionsBeforeLongBreak,
    },
    stats,
    onStatsUpdate: (s) => { setStats(s); recordSession(s); },
    soundEnabled: settings.soundNotifications,
  });

  // Single audio instance — no more double-play possible
  const audio = useAudio({
    isTimerRunning: timer.isRunning,
    autoStartWithTimer: settings.autoStartMusic,
  });

  const handleSettingsChange = useCallback((s: AppSettings) => {
    setSettings(s);
    // Keep dark class always on
    document.documentElement.classList.add("dark");
  }, [setSettings]);

  const fetchCalendarEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const resp = await fetch(`${BASE}/api/calendar/events`);
      if (!resp.ok) { setCalendarConnected(false); return; }
      const data = await resp.json() as CalendarEvent[];
      setCalendarEvents(data);
      setCalendarConnected(true);
    } catch { setCalendarConnected(false); }
    finally { setLoadingEvents(false); }
  }, []);

  useEffect(() => { fetchCalendarEvents(); }, [fetchCalendarEvents]);

  const handleAddScheduledTask = useCallback((text: string, dueDate?: string) => {
    const now = new Date().toISOString();
    const label = dueDate ? ` [${formatDueLabel(dueDate)}]` : "";
    setTasks((prev) => [{
      id: Date.now(),
      text: `${text}${label}`,
      status: "not-done",
      createdAt: now,
      dateString: new Date(now).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
    }, ...prev]);
  }, [setTasks]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #5b8dee, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b" style={{ background: "rgba(15,13,30,0.85)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "linear-gradient(135deg, #6d28d9, #8b5cf6)" }}>
              <Timer size={13} className="text-white" />
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">Focus Music Hub</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              data-testid="button-open-calendar"
              onClick={() => { setCalendarOpen(true); fetchCalendarEvents(); }}
              className="relative flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/8 transition-all"
            >
              <CalendarDays size={14} />
              <span className="hidden sm:inline">Calendar</span>
              {calendarConnected && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
            <button
              data-testid="button-header-settings"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/8 transition-all"
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Configure</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative max-w-5xl mx-auto px-4 py-6 pb-24">

        {/* DESKTOP — side-by-side */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_300px] gap-5">

          {/* Left — Timer + Tasks */}
          <div className="flex flex-col gap-5">
            {/* Timer card */}
            <div className="rounded-2xl p-6" style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}>
              <PomodoroTimer
                mode={timer.mode}
                isRunning={timer.isRunning}
                displayTime={timer.displayTime}
                progress={timer.progress}
                sessionCount={timer.sessionCount}
                sessionsBeforeLongBreak={timer.sessionsBeforeLongBreak}
                stats={stats}
                onStart={timer.start}
                onPause={timer.pause}
                onReset={timer.reset}
                onSkip={timer.skip}
                onOpenSettings={() => setSettingsOpen(true)}
                activeStream={audio.activeStream}
                audioStatus={audio.status}
                onTogglePlay={audio.togglePlayPause}
                onNextStream={audio.playNext}
                onPrevStream={audio.playPrev}
              />
            </div>

            {/* Tasks */}
            <TaskManager tasks={tasks} onTasksChange={setTasks} />
          </div>

          {/* Right — Stream selector */}
          <div className="flex flex-col gap-4">
            <MusicPlayer
              streams={audio.streams}
              activeId={audio.activeId}
              status={audio.status}
              errorMsg={audio.errorMsg}
              volume={audio.volume}
              isMuted={audio.isMuted}
              onStreamClick={audio.handleStreamClick}
              onVolumeChange={audio.setVolume}
              onMuteToggle={() => audio.setIsMuted((m) => !m)}
            />
          </div>
        </div>

        {/* MOBILE — scrollable single column */}
        <div className="lg:hidden flex flex-col gap-5">
          {/* Timer card */}
          <div className="rounded-2xl p-5" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}>
            <PomodoroTimer
              mode={timer.mode}
              isRunning={timer.isRunning}
              displayTime={timer.displayTime}
              progress={timer.progress}
              sessionCount={timer.sessionCount}
              sessionsBeforeLongBreak={timer.sessionsBeforeLongBreak}
              stats={stats}
              onStart={timer.start}
              onPause={timer.pause}
              onReset={timer.reset}
              onSkip={timer.skip}
              onOpenSettings={() => setSettingsOpen(true)}
              activeStream={audio.activeStream}
              audioStatus={audio.status}
              onTogglePlay={audio.togglePlayPause}
              onNextStream={audio.playNext}
              onPrevStream={audio.playPrev}
            />
          </div>

          {/* Tasks */}
          <TaskManager tasks={tasks} onTasksChange={setTasks} />

          {/* Full stream selector */}
          <MusicPlayer
            streams={audio.streams}
            activeId={audio.activeId}
            status={audio.status}
            errorMsg={audio.errorMsg}
            volume={audio.volume}
            isMuted={audio.isMuted}
            onStreamClick={audio.handleStreamClick}
            onVolumeChange={audio.setVolume}
            onMuteToggle={() => audio.setIsMuted((m) => !m)}
          />
        </div>
      </main>

      <AICoach
        isTimerRunning={timer.isRunning}
        sessionsCompleted={stats.sessionsCompleted}
        hasTasks={tasks.length > 0}
        onStartTimer={timer.start}
        onStartBreak={() => { timer.setMode("short-break"); timer.start(); }}
        onFocusTaskInput={() => document.querySelector<HTMLInputElement>('[data-testid="input-task"]')?.focus()}
      />

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        currentMode={timer.mode}
        onModeChange={timer.setMode}
        onSettingsChange={handleSettingsChange}
        onClose={() => setSettingsOpen(false)}
        onResetStats={() => setStats({ sessionsCompleted: 0, totalFocusMinutes: 0, lastResetDate: new Date().toDateString() })}
        onClearTasks={() => setTasks([])}
      />

      <CalendarTaskModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onAddTask={handleAddScheduledTask}
        isConnected={calendarConnected}
        events={calendarEvents}
        isLoadingEvents={loadingEvents}
        onConnect={() => window.open("https://replit.com", "_blank")}
      />
    </div>
  );
}
