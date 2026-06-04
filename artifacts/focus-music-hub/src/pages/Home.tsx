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
import { CalendarDays } from "lucide-react";

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

function todayDateStr() {
  return new Date().toDateString();
}

function formatDueLabel(dueDate?: string): string {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
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
  const [volume, setVolume] = useState(70);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const stats = checkMidnightReset(rawStats);

  const recordSessionToHistory = useCallback((completedStats: TimerStats) => {
    const today = todayDateStr();
    setHistory((prev) => {
      const existing = prev.find((d) => d.date === today);
      if (existing) {
        return prev.map((d) =>
          d.date === today
            ? { ...d, sessions: completedStats.sessionsCompleted, minutes: completedStats.totalFocusMinutes }
            : d
        );
      }
      return [...prev, { date: today, sessions: completedStats.sessionsCompleted, minutes: completedStats.totalFocusMinutes }];
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
    onStatsUpdate: (newStats) => {
      setStats(newStats);
      recordSessionToHistory(newStats);
    },
    soundEnabled: settings.soundNotifications,
  });

  const handleSettingsChange = useCallback((s: AppSettings) => {
    setSettings(s);
    if (s.darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [setSettings]);

  const handleResetStats = useCallback(() => {
    setStats({ sessionsCompleted: 0, totalFocusMinutes: 0, lastResetDate: new Date().toDateString() });
  }, [setStats]);

  const handleClearTasks = useCallback(() => { setTasks([]); }, [setTasks]);
  const handleStartBreak = useCallback(() => { timer.setMode("short-break"); timer.start(); }, [timer]);
  const handleFocusTaskInput = useCallback(() => {
    document.querySelector<HTMLInputElement>('[data-testid="input-task"]')?.focus();
  }, []);

  const fetchCalendarEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const resp = await fetch(`${BASE}/api/calendar/events`);
      if (resp.status === 401 || resp.status === 503) {
        setCalendarConnected(false);
        return;
      }
      if (!resp.ok) return;
      const data = await resp.json() as CalendarEvent[];
      setCalendarEvents(data);
      setCalendarConnected(true);
    } catch {
      setCalendarConnected(false);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const handleCalendarOpen = useCallback(() => {
    setCalendarOpen(true);
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const handleAddScheduledTask = useCallback((text: string, dueDate?: string) => {
    const now = new Date().toISOString();
    const label = dueDate ? ` [${formatDueLabel(dueDate)}]` : "";
    const newTask: Task = {
      id: Date.now(),
      text: `${text}${label}`,
      status: "not-done",
      createdAt: now,
      dateString: new Date(now).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
      }),
    };
    setTasks((prev) => [newTask, ...prev]);
  }, [setTasks]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Focus Music Hub</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Stay focused. Stay productive.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="button-open-calendar"
              onClick={handleCalendarOpen}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-[#9DBEBB] bg-muted"
            >
              <CalendarDays size={13} />
              Calendar
              {calendarConnected && <span className="w-1.5 h-1.5 rounded-full bg-[#27ae60]" />}
            </button>
            <button
              data-testid="button-header-settings"
              onClick={() => setSettingsOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-[#9DBEBB] bg-muted"
            >
              Settings
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="flex flex-col gap-6">
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
            <StreakHeatmap history={history} />
            <TaskManager tasks={tasks} onTasksChange={setTasks} />
          </div>

          <div className="flex flex-col gap-6">
            <MusicPlayer
              volume={volume}
              onVolumeChange={setVolume}
              autoStartWithTimer={settings.autoStartMusic}
              isTimerRunning={timer.isRunning}
            />

            <div className="p-5 rounded-2xl bg-card border border-card-border shadow-lg">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Session Modes</h3>
              <div className="flex flex-col gap-2">
                {([
                  { mode: "work" as const, label: "Work", duration: settings.workDuration },
                  { mode: "short-break" as const, label: "Short Break", duration: settings.shortBreakDuration },
                  { mode: "long-break" as const, label: "Long Break", duration: settings.longBreakDuration },
                ] as const).map((item) => (
                  <button
                    key={item.mode}
                    data-testid={`button-mode-${item.mode}`}
                    onClick={() => timer.setMode(item.mode)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                      timer.mode === item.mode
                        ? "border-[#77ACA2] bg-[#77ACA2]/10 text-foreground font-medium"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-[#9DBEBB] hover:text-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs opacity-70">{item.duration} min</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AICoach
        isTimerRunning={timer.isRunning}
        sessionsCompleted={stats.sessionsCompleted}
        hasTasks={tasks.length > 0}
        onStartTimer={timer.start}
        onStartBreak={handleStartBreak}
        onFocusTaskInput={handleFocusTaskInput}
      />

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onClose={() => setSettingsOpen(false)}
        onResetStats={handleResetStats}
        onClearTasks={handleClearTasks}
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
