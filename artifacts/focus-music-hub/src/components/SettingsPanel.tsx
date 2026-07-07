import { X, Timer, Coffee, Moon, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { TimerMode } from "@/hooks/useTimer";
import { useState } from "react";

export interface AppSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartMusic: boolean;
  soundNotifications: boolean;
  darkMode: boolean;
  openaiApiKey: string;
}

interface SettingsPanelProps {
  open: boolean;
  settings: AppSettings;
  currentMode: TimerMode;
  history: Record<string, number>;
  onModeChange: (m: TimerMode) => void;
  onSettingsChange: (s: AppSettings) => void;
  onClose: () => void;
  onResetStats: () => void;
  onClearTasks: () => void;
}

const SESSION_MODES: { mode: TimerMode; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { mode: "work", label: "Focus", Icon: Timer },
  { mode: "short-break", label: "Short Break", Icon: Coffee },
  { mode: "long-break", label: "Long Break", Icon: Moon },
];

const MODE_COLORS: Record<TimerMode, string> = {
  work: "#8b5cf6",
  "short-break": "#34d399",
  "long-break": "#5b8dee",
};

export function SettingsPanel({
  open,
  settings,
  history,
  currentMode,
  onModeChange,
  onSettingsChange,
  onClose,
  onResetStats,
  onClearTasks,
}: SettingsPanelProps) {
  const update = (patch: Partial<AppSettings>) => onSettingsChange({ ...settings, ...patch });
  const [showKey, setShowKey] = useState(false);

  const PRESETS = [
    { label: "25 / 5", work: 25, short: 5, long: 15 },
    { label: "50 / 10", work: 50, short: 10, long: 20 },
    { label: "90 / 20", work: 90, short: 20, long: 30 },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 h-full w-[340px] bg-card border-l border-card-border shadow-2xl z-50 overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground text-base">Configuration</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Timer, audio &amp; session settings</p>
              </div>
              <button
                data-testid="button-close-settings"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 px-6 py-6 flex flex-col gap-8">

              {/* This Week */}
              <section>
                <SectionTitle>This Week</SectionTitle>
                <WeekChart history={history} />
              </section>

              {/* Session Mode */}
              <section>
                <SectionTitle>Session Mode</SectionTitle>
                <div className="flex flex-col gap-2">
                  {SESSION_MODES.map(({ mode, label, Icon }) => {
                    const active = currentMode === mode;
                    const color = MODE_COLORS[mode];
                    return (
                      <button
                        key={mode}
                        data-testid={`button-mode-${mode}`}
                        onClick={() => onModeChange(mode)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                        style={
                          active
                            ? { borderColor: `${color}50`, background: `${color}10`, color: "hsl(var(--foreground))" }
                            : {}
                        }
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: active ? `${color}20` : "hsl(var(--muted))",
                            color: active ? color : "hsl(var(--muted-foreground))",
                          }}
                        >
                          <Icon size={15} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {mode === "work" ? `${settings.workDuration} min` : mode === "short-break" ? `${settings.shortBreakDuration} min` : `${settings.longBreakDuration} min`}
                          </p>
                        </div>
                        {active && (
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Timer Durations */}
              <section>
                <SectionTitle>Timer Durations</SectionTitle>

                <div className="flex gap-2 mb-5">
                  {PRESETS.map((p) => {
                    const active = settings.workDuration === p.work && settings.shortBreakDuration === p.short;
                    return (
                      <button
                        key={p.label}
                        data-testid={`button-preset-${p.label}`}
                        onClick={() => update({ workDuration: p.work, shortBreakDuration: p.short, longBreakDuration: p.long })}
                        className={`flex-1 py-2 text-xs rounded-xl border font-medium transition-all ${
                          active
                            ? "border-primary/50 bg-primary/10 text-foreground"
                            : "border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-5">
                  <SliderSetting
                    label="Focus"
                    value={settings.workDuration}
                    unit="min"
                    min={1} max={120}
                    onChange={(v) => update({ workDuration: v })}
                    testId="slider-work-duration"
                    color="#8b5cf6"
                  />
                  <SliderSetting
                    label="Short Break"
                    value={settings.shortBreakDuration}
                    unit="min"
                    min={1} max={30}
                    onChange={(v) => update({ shortBreakDuration: v })}
                    testId="slider-short-break"
                    color="#34d399"
                  />
                  <SliderSetting
                    label="Long Break"
                    value={settings.longBreakDuration}
                    unit="min"
                    min={1} max={60}
                    onChange={(v) => update({ longBreakDuration: v })}
                    testId="slider-long-break"
                    color="#5b8dee"
                  />
                  <SliderSetting
                    label="Sessions before long break"
                    value={settings.sessionsBeforeLongBreak}
                    unit=""
                    min={2} max={10}
                    onChange={(v) => update({ sessionsBeforeLongBreak: v })}
                    testId="slider-sessions"
                    color="#8b5cf6"
                  />
                </div>
              </section>

              {/* Audio */}
              <section>
                <SectionTitle>Audio</SectionTitle>
                <div className="flex flex-col gap-3">
                  <ToggleSetting
                    label="Auto-start music with timer"
                    description="Stream begins when you start a session"
                    checked={settings.autoStartMusic}
                    onChange={(v) => update({ autoStartMusic: v })}
                    testId="toggle-auto-music"
                  />
                  <ToggleSetting
                    label="Sound notifications"
                    description="Bell when session completes"
                    checked={settings.soundNotifications}
                    onChange={(v) => update({ soundNotifications: v })}
                    testId="toggle-sound"
                  />
                </div>
              </section>

              {/* Appearance */}
              <section>
                <SectionTitle>Appearance</SectionTitle>
                <ToggleSetting
                  label="Dark mode"
                  description="Easier on the eyes at night"
                  checked={settings.darkMode}
                  onChange={(v) => update({ darkMode: v })}
                  testId="toggle-dark-mode"
                />
              </section>

              {/* AI Coach */}
              <section>
                <SectionTitle>AI Coach</SectionTitle>
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Uses GPT-4o mini via your OpenAI key. Stored locally only.
                  </p>
                  <div className="relative flex items-center">
                    <input
                      data-testid="input-openai-key"
                      type={showKey ? "text" : "password"}
                      value={settings.openaiApiKey}
                      onChange={(e) => update({ openaiApiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 pr-8 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {settings.openaiApiKey && (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Key saved — Coach is ready
                    </p>
                  )}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Get a key at platform.openai.com →
                  </a>
                </div>
              </section>

              {/* Data */}
              <section>
                <SectionTitle>Data</SectionTitle>
                <div className="flex flex-col gap-2">
                  <button
                    data-testid="button-reset-stats"
                    onClick={onResetStats}
                    className="w-full py-2.5 text-sm rounded-xl border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-border transition-all"
                  >
                    Reset Today's Stats
                  </button>
                  <button
                    data-testid="button-clear-tasks"
                    onClick={onClearTasks}
                    className="w-full py-2.5 text-sm rounded-xl border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-all"
                  >
                    Clear All Tasks
                  </button>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{children}</h3>
  );
}

function SliderSetting({ label, value, unit, min, max, onChange, testId, color }: {
  label: string; value: number; unit: string; min: number; max: number;
  onChange: (v: number) => void; testId: string; color: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <Label className="text-xs text-foreground">{label}</Label>
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>
          {value}{unit}
        </span>
      </div>
      <Slider
        data-testid={testId}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min} max={max} step={1}
      />
    </div>
  );
}

function ToggleSetting({ label, description, checked, onChange, testId }: {
  label: string; description?: string; checked: boolean;
  onChange: (v: boolean) => void; testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch data-testid={testId} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function WeekChart({ history }: { history: Record<string, number> }) {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const todayKey = today.toDateString();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { key: d.toDateString(), label: DAYS[d.getDay()], isToday: d.toDateString() === todayKey };
  });

  const counts = days.map((d) => history[d.key] ?? 0);
  const maxCount = Math.max(...counts, 1);
  const totalWeek = counts.reduce((a, b) => a + b, 0);
  const BAR_H = 60;

  return (
    <div>
      <div className="flex items-end gap-1.5 w-full" style={{ height: BAR_H + 32 }}>
        {days.map((day, i) => {
          const count = counts[i];
          const filled = count > 0;
          const barH = Math.max(count / maxCount * BAR_H, filled ? 4 : 2);
          return (
            <div key={day.key} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: BAR_H + 32 }}>
              {count > 0 && (
                <span className="text-[9px] font-semibold tabular-nums" style={{ color: day.isToday ? "#8b5cf6" : "hsl(var(--muted-foreground))" }}>
                  {count}
                </span>
              )}
              <div
                className="w-full rounded-md transition-all duration-500"
                style={{
                  height: barH,
                  background: day.isToday
                    ? "linear-gradient(to top, #6d28d9, #a78bfa)"
                    : filled
                    ? "hsl(var(--primary) / 0.35)"
                    : "hsl(var(--muted))",
                  minHeight: 2,
                }}
              />
              <span
                className="text-[9px] font-medium"
                style={{ color: day.isToday ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-[10px] text-muted-foreground">
          {totalWeek} session{totalWeek !== 1 ? "s" : ""} this week
        </span>
        <span className="text-[10px] text-muted-foreground">
          best day: {Math.max(...counts)} session{Math.max(...counts) !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
