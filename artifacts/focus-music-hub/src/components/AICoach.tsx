import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface AICoachProps {
  isTimerRunning: boolean;
  sessionsCompleted: number;
  hasTasks: boolean;
  onStartTimer: () => void;
  onStartBreak: () => void;
  onFocusTaskInput: () => void;
}

interface Prompt {
  message: string;
  action: string;
  onAction: () => void;
}

export function AICoach({
  isTimerRunning,
  sessionsCompleted,
  hasTasks,
  onStartTimer,
  onStartBreak,
  onFocusTaskInput,
}: AICoachProps) {
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const lastPromptTime = useRef<number>(0);
  const lastActivityTime = useRef<number>(Date.now());

  const updateActivity = useCallback(() => {
    lastActivityTime.current = Date.now();
  }, []);

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

  const dismiss = useCallback(() => {
    setVisible(false);
    lastPromptTime.current = Date.now();
  }, []);

  const checkAndPrompt = useCallback(() => {
    if (isTimerRunning) return;
    const now = Date.now();
    const minBetweenPrompts = 5 * 60 * 1000;
    if (now - lastPromptTime.current < minBetweenPrompts) return;

    const hour = new Date().getHours();
    const idleMs = now - lastActivityTime.current;
    const idleMin = idleMs / 60000;

    let next: Prompt | null = null;

    if (sessionsCompleted >= 2) {
      next = {
        message: "You've been working hard! Time for a break?",
        action: "Start Break",
        onAction: () => { onStartBreak(); dismiss(); },
      };
    } else if (idleMin >= 20 && hour >= 9 && hour < 18) {
      next = {
        message: "Time for a focus session?",
        action: "Start Timer",
        onAction: () => { onStartTimer(); dismiss(); },
      };
    } else if (!hasTasks && hour >= 8 && hour < 12) {
      next = {
        message: "Would you like to add a new task?",
        action: "Add Task",
        onAction: () => { onFocusTaskInput(); dismiss(); },
      };
    }

    if (next) {
      setPrompt(next);
      setVisible(true);
      lastPromptTime.current = now;
    }
  }, [isTimerRunning, sessionsCompleted, hasTasks, onStartTimer, onStartBreak, onFocusTaskInput, dismiss]);

  useEffect(() => {
    const initial = setTimeout(checkAndPrompt, 30000);
    const recurring = setInterval(checkAndPrompt, 2 * 60 * 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(recurring);
    };
  }, [checkAndPrompt]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {visible && prompt && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-[#77ACA2]/40 shadow-xl max-w-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-foreground leading-snug">{prompt.message}</p>
              <button
                data-testid="button-coach-dismiss"
                onClick={dismiss}
                className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
              >
                <X size={14} />
              </button>
            </div>
            <button
              data-testid="button-coach-action"
              onClick={prompt.onAction}
              className="text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
              style={{ background: "hsl(var(--secondary))", color: "#fff" }}
            >
              {prompt.action}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        data-testid="button-ai-coach"
        onClick={() => setVisible((v) => !v)}
        className="w-14 h-14 rounded-full text-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        style={{
          background: "hsl(var(--primary))",
          boxShadow: "0 0 0 0 hsl(var(--secondary) / 0.4)",
          animation: "coach-pulse 2.5s ease-in-out infinite",
        }}
      >
        🤖
      </button>

      <style>{`
        @keyframes coach-pulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(168 23% 57% / 0.5); }
          50% { box-shadow: 0 0 0 12px hsl(168 23% 57% / 0); }
        }
      `}</style>
    </div>
  );
}
