import { useCallback, useEffect, useState } from "react";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { MusicPlayer } from "@/components/MusicPlayer";
import { TaskManager } from "@/components/TaskManager";
import type { Task } from "@/components/TaskManager";
import { SettingsPanel } from "@/components/SettingsPanel";
import type { AppSettings } from "@/components/SettingsPanel";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTimer } from "@/hooks/useTimer";
import type { TimerStats } from "@/hooks/useTimer";
import { useAudio } from "@/hooks/useAudio";
import { SlidersHorizontal, Brain } from "lucide-react";

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

export default function Home() {
  const [settings, setSettings] = useLocalStorage<AppSettings>("focusMusicHubSettings", DEFAULT_SETTINGS);
  const [rawStats, setStats] = useLocalStorage<TimerStats>("focusMusicHubStats", DEFAULT_STATS);
  const [tasks, setTasks] = useLocalStorage<Task[]>("focusMusicHubTasks", []);
  const [history, setHistory] = useLocalStorage<Record<string, number>>("focusMusicHubHistory", {});
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  const stats = checkMidnightReset(rawStats);

  const timer = useTimer({
    settings: {
      workDuration: settings.workDuration,
      shortBreakDuration: settings.shortBreakDuration,
      longBreakDuration: settings.longBreakDuration,
      sessionsBeforeLongBreak: settings.sessionsBeforeLongBreak,
    },
    stats,
    onStatsUpdate: (s) => {
      setStats(s);
      setHistory((prev) => ({ ...prev, [new Date().toDateString()]: s.sessionsCompleted }));
    },
    soundEnabled: settings.soundNotifications,
  });

  const audio = useAudio({
    isTimerRunning: timer.isRunning,
    autoStartWithTimer: settings.autoStartMusic,
  });

  const handleSettingsChange = useCallback((s: AppSettings) => {
    setSettings(s);
    document.documentElement.classList.toggle("dark", s.darkMode);
  }, [setSettings]);

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
              <Brain size={14} className="text-white" />
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">Hyper-Focus Music</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md text-white/90"
              style={{ background: "linear-gradient(135deg, #6d28d9, #8b5cf6)" }}>
              Hyper FM
            </span>
          </div>

          <button
            data-testid="button-header-settings"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/8 transition-all"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Configure</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative max-w-5xl mx-auto px-4 py-6 pb-24">

        {/* DESKTOP — side-by-side */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_300px] gap-5">

          {/* Left — Timer + Tasks */}
          <div className="flex flex-col gap-5">
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
                activeStation={audio.activeStation}
                audioStatus={audio.status}
                nowPlaying={audio.nowPlaying}
                onTogglePlay={audio.togglePlayPause}
                onNextStation={audio.playNextStation}
                onPrevStation={audio.playPrevStation}
              />
            </div>
            <TaskManager tasks={tasks} onTasksChange={setTasks} />
          </div>

          {/* Right — Station selector */}
          <div className="flex flex-col gap-4">
            <MusicPlayer
              stations={audio.stations}
              activeId={audio.activeId}
              status={audio.status}
              nowPlaying={audio.nowPlaying}
              errorMsg={audio.errorMsg}
              volume={audio.volume}
              isMuted={audio.isMuted}
              onStationClick={audio.handleStationClick}
              onVolumeChange={audio.setVolume}
              onMuteToggle={() => audio.setIsMuted((m) => !m)}
            />
          </div>
        </div>

        {/* MOBILE — scrollable single column */}
        <div className="lg:hidden flex flex-col gap-5">
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
              activeStation={audio.activeStation}
              audioStatus={audio.status}
                nowPlaying={audio.nowPlaying}
              onTogglePlay={audio.togglePlayPause}
              onNextStation={audio.playNextStation}
              onPrevStation={audio.playPrevStation}
            />
          </div>
          <MusicPlayer
            stations={audio.stations}
            activeId={audio.activeId}
            status={audio.status}
              nowPlaying={audio.nowPlaying}
            errorMsg={audio.errorMsg}
            volume={audio.volume}
            isMuted={audio.isMuted}
            onStationClick={audio.handleStationClick}
            onVolumeChange={audio.setVolume}
            onMuteToggle={() => audio.setIsMuted((m) => !m)}
          />
          <TaskManager tasks={tasks} onTasksChange={setTasks} />
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        currentMode={timer.mode}
        history={history}
        onModeChange={timer.setMode}
        onSettingsChange={handleSettingsChange}
        onClose={() => setSettingsOpen(false)}
        onResetStats={() => setStats({ sessionsCompleted: 0, totalFocusMinutes: 0, lastResetDate: new Date().toDateString() })}
        onClearTasks={() => setTasks([])}
      />
    </div>
  );
}
