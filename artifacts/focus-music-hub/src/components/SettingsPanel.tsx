import { X, Timer, Coffee, Moon, Send, Check } from "lucide-react";
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
            className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-card border-l border-card-border shadow-2xl z-50 overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
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

            <div className="flex-1 px-5 sm:px-6 py-6 flex flex-col gap-8 text-base sm:text-sm">

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
                    description="Music begins when you start a session"
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

              {/* Music credits */}
              <section>
                <SectionTitle>Music Credits</SectionTitle>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All station music by{" "}
                  <a
                    href="https://incompetech.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Kevin MacLeod (incompetech.com)
                  </a>
                  , licensed under{" "}
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Creative Commons Attribution 4.0
                  </a>
                  . Tracks are re-encoded to 128kbps for streaming; shorter tracks
                  are seamlessly looped into extended mixes for focus-length sessions.
                </p>
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground select-none">
                    Full track list
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1 list-disc list-inside">
                    <li>Deliberate Thought — Focus</li>
                    <li>Blippy Trance — Focus</li>
                    <li>EDM Detection Mode — Focus</li>
                    <li>Digital Lemonade — Focus</li>
                    <li>Future Cha Cha — Focus</li>
                    <li>Crypto — Immerse</li>
                    <li>Deep Haze — Immerse</li>
                    <li>Echoes of Time — Immerse</li>
                    <li>Mirage — Immerse</li>
                    <li>Sovereign — Immerse</li>
                    <li>Tranquility Base — Drift</li>
                    <li>Chill Wave — Drift</li>
                    <li>Fluidscape — Drift</li>
                    <li>Lightless Dawn — Drift</li>
                    <li>Silver Blue Light — Drift</li>
                  </ul>
                </details>
              </section>

              {/* Appearance */}
              <section>
                <SectionTitle>Appearance</SectionTitle>                <ToggleSetting
                  label="Dark mode"
                  description="Easier on the eyes at night"
                  checked={settings.darkMode}
                  onChange={(v) => update({ darkMode: v })}
                  testId="toggle-dark-mode"
                />
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

              {/* Feedback */}
              <section>
                <SectionTitle>Feedback</SectionTitle>
                <FeedbackForm />
              </section>

              {/* Legal */}
              <section>
                <SectionTitle>Legal</SectionTitle>
                <div className="flex items-center gap-4 text-xs">
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </a>
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

const FEEDBACK_EMAIL = "info@coregridit.com";

function FeedbackForm() {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const subject = encodeURIComponent("Hyper-Focus Music Feedback");
    const body = encodeURIComponent(trimmed);
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
    setText("");
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Found a bug or have an idea? Send it straight to the developer.
      </p>
      <textarea
        data-testid="input-feedback"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell us what's on your mind..."
        rows={3}
        className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm sm:text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
      />
      <button
        data-testid="button-send-feedback"
        onClick={send}
        disabled={!text.trim()}
        className="w-full py-2.5 text-sm rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: sent ? "#34d399" : "linear-gradient(135deg, #6d28d9, #8b5cf6)", color: "#fff" }}
      >
        {sent ? <><Check size={14} /> Opening your mail app…</> : <><Send size={13} /> Send Feedback</>}
      </button>
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
