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
import { CalendarDays, SlidersHorizontal, Timer, CheckSquare, Music2 } from "lucide-react";

const DEFAULT_SETTINGS: AppSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartMusic: true,
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

type ActiveTab = "music" | "timer" | "tasks";

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
  const [mobileTab, setMobileTab] = useState<ActiveTab>("music");

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

  const MOBILE_TABS = [
    { id: "music" as const, icon: Music2, label: "Streams" },
    { id: "timer" as const, icon: Timer, label: "Timer" },
    { id: "tasks" as const, icon: CheckSquare, label: "Tasks" },
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Subtle background accent */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #335C81, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #77ACA2, transparent 70%)" }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "linear-gradient(135deg, #335C81, #4a7c9e)" }}
            >
              <Timer size={13} className="text-white" />
            </div>
            <div>
              <span className="font-semibold text-foreground text-sm tracking-tight">Focus Music Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              data-testid="button-open-calendar"
              onClick={() => { setCalendarOpen(true); fetchCalendarEvents(); }}
              className="relative flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all"
            >
              <CalendarDays size={14} />
              <span className="hidden sm:inline">Calendar</span>
              {calendarConnected && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#27ae60]" />
              )}
            </button>
            <button
              data-testid="button-header-settings"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all"
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Configure</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="sticky top-14 z-20 border-b border-border bg-background/90 backdrop-blur-md lg:hidden">
        <div className="flex max-w-4xl mx-auto">
          {MOBILE_TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold tracking-wide uppercase transition-all ${
                mobileTab === id
                  ? "text-[#335C81]"
                  : "text-muted-foreground"
              }`}
            >
              <Icon size={16} strokeWidth={mobileTab === id ? 2.5 : 1.8} />
              {label}
              {mobileTab === id && (
                <span className="absolute bottom-0 w-12 h-[2px] rounded-full bg-[#335C81]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-4 py-5 pb-20 lg:pb-6">

        {/* DESKTOP layout: 3-column grid */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_300px] gap-4">

          {/* Left — Timer + Tasks */}
          <div className="flex flex-col gap-4">
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
            <TaskManager tasks={tasks} onTasksChange={setTasks} />
          </div>

          {/* Right — Music */}
          <div className="flex flex-col gap-4">
            <MusicPlayer
              volume={volume}
              onVolumeChange={setVolume}
              autoStartWithTimer={settings.autoStartMusic}
              isTimerRunning={timer.isRunning}
            />
          </div>
        </div>

        {/* MOBILE layout: tab-gated */}
        <div className="lg:hidden">
          {mobileTab === "music" && (
            <MusicPlayer
              volume={volume}
              onVolumeChange={setVolume}
              autoStartWithTimer={settings.autoStartMusic}
              isTimerRunning={timer.isRunning}
            />
          )}
          {mobileTab === "timer" && (
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
          )}
          {mobileTab === "tasks" && (
            <TaskManager tasks={tasks} onTasksChange={setTasks} />
          )}
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
