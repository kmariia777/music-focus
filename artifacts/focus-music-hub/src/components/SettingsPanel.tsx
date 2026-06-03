import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

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
  onSettingsChange: (s: AppSettings) => void;
  onClose: () => void;
  onResetStats: () => void;
  onClearTasks: () => void;
}

export function SettingsPanel({
  open,
  settings,
  onSettingsChange,
  onClose,
  onResetStats,
  onClearTasks,
}: SettingsPanelProps) {
  const update = (patch: Partial<AppSettings>) => onSettingsChange({ ...settings, ...patch });

  const setPreset = (work: number, short: number) => {
    update({ workDuration: work, shortBreakDuration: short });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-80 bg-card border-l border-card-border shadow-2xl z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-foreground">Settings</h2>
              <button
                data-testid="button-close-settings"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-7">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Timer Durations</h3>

                <div className="mb-4">
                  <div className="flex gap-2 mb-4">
                    {[{ label: "25/5", work: 25, short: 5 }, { label: "50/10", work: 50, short: 10 }].map((p) => (
                      <button
                        key={p.label}
                        data-testid={`button-preset-${p.label}`}
                        onClick={() => setPreset(p.work, p.short)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          settings.workDuration === p.work && settings.shortBreakDuration === p.short
                            ? "border-[#77ACA2] bg-[#77ACA2]/10 text-foreground"
                            : "border-border bg-muted text-muted-foreground hover:border-[#9DBEBB]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      data-testid="button-preset-custom"
                      className="px-3 py-1.5 text-xs rounded-lg border border-border bg-muted text-muted-foreground hover:border-[#9DBEBB] transition-all"
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <SliderSetting
                    label={`Work: ${settings.workDuration} min`}
                    value={settings.workDuration}
                    min={1} max={120}
                    onChange={(v) => update({ workDuration: v })}
                    testId="slider-work-duration"
                  />
                  <SliderSetting
                    label={`Short Break: ${settings.shortBreakDuration} min`}
                    value={settings.shortBreakDuration}
                    min={1} max={30}
                    onChange={(v) => update({ shortBreakDuration: v })}
                    testId="slider-short-break"
                  />
                  <SliderSetting
                    label={`Long Break: ${settings.longBreakDuration} min`}
                    value={settings.longBreakDuration}
                    min={1} max={60}
                    onChange={(v) => update({ longBreakDuration: v })}
                    testId="slider-long-break"
                  />
                  <SliderSetting
                    label={`Sessions before long break: ${settings.sessionsBeforeLongBreak}`}
                    value={settings.sessionsBeforeLongBreak}
                    min={2} max={10}
                    onChange={(v) => update({ sessionsBeforeLongBreak: v })}
                    testId="slider-sessions"
                  />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Audio</h3>
                <div className="flex flex-col gap-4">
                  <ToggleSetting
                    label="Auto-start music with timer"
                    checked={settings.autoStartMusic}
                    onChange={(v) => update({ autoStartMusic: v })}
                    testId="toggle-auto-music"
                  />
                  <ToggleSetting
                    label="Sound notifications"
                    checked={settings.soundNotifications}
                    onChange={(v) => update({ soundNotifications: v })}
                    testId="toggle-sound"
                  />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Appearance</h3>
                <ToggleSetting
                  label="Dark mode"
                  checked={settings.darkMode}
                  onChange={(v) => update({ darkMode: v })}
                  testId="toggle-dark-mode"
                />
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Data</h3>
                <div className="flex flex-col gap-3">
                  <button
                    data-testid="button-reset-stats"
                    onClick={onResetStats}
                    className="w-full py-2 text-sm rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground hover:border-[#9DBEBB] transition-all"
                  >
                    Reset Today's Stats
                  </button>
                  <button
                    data-testid="button-clear-tasks"
                    onClick={onClearTasks}
                    className="w-full py-2 text-sm rounded-lg border border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-all"
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

function SliderSetting({ label, value, min, max, onChange, testId }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  testId: string;
}) {
  return (
    <div>
      <Label className="text-xs text-foreground mb-2 block">{label}</Label>
      <Slider
        data-testid={testId}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
      />
    </div>
  );
}

function ToggleSetting({ label, checked, onChange, testId }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm text-foreground">{label}</Label>
      <Switch
        data-testid={testId}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}
