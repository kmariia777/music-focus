import { useCallback, useEffect, useState } from "react";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { MusicPlayer } from "@/components/MusicPlayer";
import { TaskManager } from "@/components/TaskManager";
import type { Task } from "@/components/TaskManager";
import { AICoach } from "@/components/AICoach";
import { SettingsPanel } from "@/components/SettingsPanel";
import type { AppSettings } from "@/components/SettingsPanel";
import { StreakHeatmap } from "@/components/StreakHeatmap";
import type { DailyRecord } from "@/components/StreakHeatmap";
import { CalendarTaskModal } from "@/components/CalendarTaskModal";
import type { CalendarEvent } from "@/components/CalendarTaskModal";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTimer } from "@/hooks/useTimer";
import type { TimerStats } from "@/hooks/useTimer";
import { CalendarDays, Settings2, Timer, CheckSquare, Flame, Music2 } from "lucide-react";

const DEFAULT_SETTINGS: AppSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartMusic: false,
  soundNotifications: true,
  darkMode: false,
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

type ActiveTab = "timer" | "tasks" | "streak" | "music";

export default function Home() {
  const [settings, setSettings] = useLocalStorage<AppSettings>("focusMusicHubSettings", DEFAULT_SETTINGS);
  const [rawStats, setStats] = useLocalStorage<TimerStats>("focusMusicHubStats", DEFAULT_STATS);
  const [tasks, setTasks] = useLocalStorage<Task[]>("focusMusicHubTasks", []);
  const [history, setHistory] = useLocalStorage<DailyRecord[]>("focusMusicHubHistory", []);
  const [volume, setVolume] = useState(70);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [mobileTab, setMobileTab] = useState<ActiveTab>("timer");

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

  const handleSettingsChange = useCallback((s: AppSettings) => {
    setSettings(s);
    document.documentElement.classList.toggle("dark", s.darkMode);
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

  const modeButtons = [
    { mode: "work" as const, label: "Focus", duration: settings.workDuration },
    { mode: "short-break" as const, label: "Short Break", duration: settings.shortBreakDuration },
    { mode: "long-break" as const, label: "Long Break", duration: settings.longBreakDuration },
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#335C81" }}>
              <Timer size={14} className="text-white" />
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">Focus Music Hub</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              data-testid="button-open-calendar"
              onClick={() => { setCalendarOpen(true); fetchCalendarEvents(); }}
              className="flex items-center gap-1.5 h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all"
            >
              <CalendarDays size={13} />
              <span className="hidden sm:inline">Calendar</span>
              {calendarConnected && <span className="w-1.5 h-1.5 rounded-full bg-[#27ae60]" />}
            </button>
            <button
              data-testid="button-header-settings"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all"
            >
              <Settings2 size={13} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="sticky top-14 z-20 border-b border-border bg-background/80 backdrop-blur-md lg:hidden">
        <div className="flex">
          {([
            { id: "timer" as const, icon: Timer, label: "Timer" },
            { id: "music" as const, icon: Music2, label: "Music" },
            { id: "tasks" as const, icon: CheckSquare, label: "Tasks" },
            { id: "streak" as const, icon: Flame, label: "Streak" },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all ${
                mobileTab === id ? "text-foreground border-b-2 border-[#335C81]" : "text-muted-foreground"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

          {/* Left column */}
          <div className="flex flex-col gap-5">

            {/* Timer — always shown on desktop, tab-gated on mobile */}
            <div className={mobileTab !== "timer" ? "hidden lg:block" : ""}>
              <PomodoroTimer
                mode={timer.mode}
                isRunning={timer.isRunning}
                displayTime={timer.displayTime}
                progress={timer.progress}
                sessionCount={timer.sessionCount}
                sessionsBeforeLongBreak={timer.sessionsBeforeLongBreak}
                stats={stats}
                volume={volume}
                onVolumeChange={setVolume}
                onStart={timer.start}
                onPause={timer.pause}
                onReset={timer.reset}
                onSkip={timer.skip}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </div>

            {/* Streak — desktop always, mobile tab-gated */}
            <div className={mobileTab !== "streak" ? "hidden lg:block" : ""}>
              <StreakHeatmap history={history} />
            </div>

            {/* Tasks — desktop always, mobile tab-gated */}
            <div className={mobileTab !== "tasks" ? "hidden lg:block" : ""}>
              <TaskManager tasks={tasks} onTasksChange={setTasks} />
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">

            {/* Music — desktop always, mobile tab-gated */}
            <div className={mobileTab !== "music" ? "hidden lg:flex lg:flex-col lg:gap-5" : "flex flex-col gap-5"}>
              <MusicPlayer
                volume={volume}
                onVolumeChange={setVolume}
                autoStartWithTimer={settings.autoStartMusic}
                isTimerRunning={timer.isRunning}
              />
            </div>

            {/* Session Mode picker — desktop only */}
            <div className="hidden lg:block rounded-2xl bg-card border border-card-border shadow-lg p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Session Mode</h3>
              <div className="flex flex-col gap-1.5">
                {modeButtons.map((item) => (
                  <button
                    key={item.mode}
                    data-testid={`button-mode-${item.mode}`}
                    onClick={() => timer.setMode(item.mode)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                      timer.mode === item.mode
                        ? "border-[#335C81]/40 bg-[#335C81]/08 text-foreground font-medium"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs opacity-60 tabular-nums">{item.duration} min</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
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
