import { useCallback, useEffect, useRef, useState } from "react";
import { X, Sparkles, Play, Coffee, ListPlus, Zap, Moon, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface AICoachProps {
  isTimerRunning: boolean;
  sessionsCompleted: number;
  hasTasks: boolean;
  onStartTimer: () => void;
  onStartBreak: () => void;
  onFocusTaskInput: () => void;
}

interface CoachMessage {
  id: string;
  text: string;
  type: "tip" | "nudge" | "celebrate";
}

function getContextMessages(isRunning: boolean, sessions: number, hasTasks: boolean): CoachMessage[] {
  const hour = new Date().getHours();
  const msgs: CoachMessage[] = [];

  if (isRunning) {
    msgs.push({ id: "running", text: "Timer is running — stay in the zone. Close distracting tabs and keep going.", type: "tip" });
    msgs.push({ id: "breath", text: "Tip: if your mind wanders, take a slow breath and write down the distraction — then return.", type: "tip" });
  } else if (sessions === 0) {
    msgs.push({ id: "start", text: "Ready to focus? Start a 25-minute session and build your first session of the day.", type: "nudge" });
    if (!hasTasks) msgs.push({ id: "tasks", text: "Add at least one task before you start so you know exactly what to work on.", type: "tip" });
  } else if (sessions >= 4) {
    msgs.push({ id: "great", text: `${sessions} sessions done — that's excellent work today! Consider a longer break or wrapping up.`, type: "celebrate" });
  } else {
    msgs.push({ id: "progress", text: `${sessions} session${sessions > 1 ? "s" : ""} completed. Keep the momentum going!`, type: "celebrate" });
  }

  if (hour < 10) msgs.push({ id: "morning", text: "Morning sessions are powerful — your prefrontal cortex is sharpest before noon.", type: "tip" });
  if (hour >= 14 && hour < 16) msgs.push({ id: "slump", text: "Afternoon slump is real. A 5-minute walk before your next session can reset focus.", type: "tip" });
  if (hour >= 21) msgs.push({ id: "night", text: "Late session? Set a hard stop time so sleep isn't the casualty.", type: "tip" });

  return msgs;
}

interface QuickAction {
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  onClick: () => void;
}

export function AICoach({
  isTimerRunning,
  sessionsCompleted,
  hasTasks,
  onStartTimer,
  onStartBreak,
  onFocusTaskInput,
}: AICoachProps) {
  const [open, setOpen] = useState(false);
  const [hasNudge, setHasNudge] = useState(false);
  const lastPromptTime = useRef<number>(0);
  const lastActivityTime = useRef<number>(Date.now());

  const updateActivity = useCallback(() => { lastActivityTime.current = Date.now(); }, []);

  useEffect(() => {
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
    };
  }, [updateActivity]);

  // Auto-nudge: ping the button after inactivity
  const checkNudge = useCallback(() => {
    if (isTimerRunning || open) return;
    const now = Date.now();
    if (now - lastPromptTime.current < 5 * 60 * 1000) return;
    const idleMin = (now - lastActivityTime.current) / 60000;
    if (idleMin >= 3) {
      setHasNudge(true);
      lastPromptTime.current = now;
    }
  }, [isTimerRunning, open]);

  useEffect(() => {
    const t = setTimeout(checkNudge, 20000);
    const r = setInterval(checkNudge, 90000);
    return () => { clearTimeout(t); clearInterval(r); };
  }, [checkNudge]);

  const handleOpen = () => {
    setOpen(true);
    setHasNudge(false);
    lastPromptTime.current = Date.now();
  };

  const messages = getContextMessages(isTimerRunning, sessionsCompleted, hasTasks);

  const actions: QuickAction[] = [
    ...(!isTimerRunning ? [{
      label: "Start Focus",
      description: "Begin a Pomodoro session",
      icon: Play,
      color: "#335C81",
      onClick: () => { onStartTimer(); setOpen(false); },
    }] : []),
    {
      label: "Take a Break",
      description: "Start a 5-minute break",
      icon: Coffee,
      color: "#77ACA2",
      onClick: () => { onStartBreak(); setOpen(false); },
    },
    {
      label: "Add a Task",
      description: "Plan what to work on",
      icon: ListPlus,
      color: "#9DBEBB",
      onClick: () => { onFocusTaskInput(); setOpen(false); },
    },
  ];

  const typeConfig = {
    tip: { color: "#335C81", bg: "#335C8112", Icon: Zap },
    nudge: { color: "#f39c12", bg: "#f39c1212", Icon: Sparkles },
    celebrate: { color: "#27ae60", bg: "#27ae6012", Icon: Moon },
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="relative z-50 w-[300px] rounded-2xl bg-card border border-card-border shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border"
                style={{ background: "linear-gradient(135deg, #335C8108 0%, #77ACA208 100%)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #335C81, #4a7c9e)" }}
                  >
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none">Coach</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {isTimerRunning ? "Session in progress" : `${sessionsCompleted} session${sessionsCompleted !== 1 ? "s" : ""} today`}
                    </p>
                  </div>
                </div>
                <button
                  data-testid="button-coach-dismiss"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="px-4 py-3 flex flex-col gap-2.5 max-h-52 overflow-y-auto">
                {messages.map((msg) => {
                  const { color, bg, Icon } = typeConfig[msg.type];
                  return (
                    <div key={msg.id} className="flex gap-2.5 items-start">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: bg }}
                      >
                        <Icon size={11} style={{ color }} />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="border-t border-border px-4 py-3 flex flex-col gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Quick Actions</p>
                {actions.map((action) => {
                  const { icon: Icon } = action;
                  return (
                    <button
                      key={action.label}
                      data-testid={`button-coach-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                      onClick={action.onClick}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 transition-all group text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${action.color}18`, color: action.color }}
                      >
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{action.label}</p>
                        <p className="text-[10px] text-muted-foreground">{action.description}</p>
                      </div>
                      <ChevronRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        data-testid="button-ai-coach"
        onClick={handleOpen}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex flex-col items-center gap-1 focus:outline-none"
      >
        {/* Nudge ring */}
        {hasNudge && !open && (
          <motion.span
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ background: "#77ACA2", borderRadius: 999 }}
          />
        )}

        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background: open
              ? "linear-gradient(135deg, #4a7c9e, #335C81)"
              : "linear-gradient(135deg, #335C81, #4a7c9e)",
            boxShadow: "0 4px 16px rgba(51,92,129,0.35)",
          }}
        >
          <Sparkles size={20} className="text-white" />
        </div>

        <span
          className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{
            background: open ? "#335C81" : "hsl(var(--muted))",
            color: open ? "#fff" : "hsl(var(--muted-foreground))",
            transition: "all 0.2s",
          }}
        >
          Coach
        </span>
      </motion.button>
    </div>
  );
}
