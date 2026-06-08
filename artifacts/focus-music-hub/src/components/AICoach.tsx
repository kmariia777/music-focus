import { useCallback, useEffect, useRef, useState } from "react";
import { X, Sparkles, Play, Coffee, ListPlus, ChevronRight, Send, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AICoachProps {
  isTimerRunning: boolean;
  sessionsCompleted: number;
  hasTasks: boolean;
  onStartTimer: () => void;
  onStartBreak: () => void;
  onFocusTaskInput: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface QuickAction {
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  message: string;
  onClick?: () => void;
}

function getWelcome(isRunning: boolean, sessions: number, hasTasks: boolean): string {
  if (isRunning) return "Timer's running — I'm here if you need a nudge or a tip.";
  if (sessions >= 4) return `${sessions} sessions today — solid work! How can I help you finish strong?`;
  if (sessions > 0) return `${sessions} session${sessions > 1 ? "s" : ""} done. Ready to keep going?`;
  if (!hasTasks) return "Start by adding a task, then kick off your first Pomodoro. What are you working on today?";
  return "Ready to focus? I can help you plan, prioritize, or just get started.";
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const lastPromptTime = useRef<number>(0);
  const lastActivityTime = useRef<number>(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  const checkNudge = useCallback(() => {
    if (isTimerRunning || open) return;
    const now = Date.now();
    if (now - lastPromptTime.current < 5 * 60 * 1000) return;
    if ((now - lastActivityTime.current) / 60000 >= 3) {
      setHasNudge(true);
      lastPromptTime.current = now;
    }
  }, [isTimerRunning, open]);

  useEffect(() => {
    const t = setTimeout(checkNudge, 20000);
    const r = setInterval(checkNudge, 90000);
    return () => { clearTimeout(t); clearInterval(r); };
  }, [checkNudge]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: getWelcome(isTimerRunning, sessionsCompleted, hasTasks) }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages.length, isTimerRunning, sessionsCompleted, hasTasks]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const handleOpen = () => {
    setOpen(true);
    setHasNudge(false);
    lastPromptTime.current = Date.now();
  };

  const sendMessage = useCallback(async (text: string, extraAction?: () => void) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    if (extraAction) extraAction();

    const userMsg: Message = { role: "user", content: trimmed };
    const updatedHistory = [...messages, userMsg];
    setMessages([...updatedHistory, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const resp = await fetch(`${BASE}/api/coach/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          messages: updatedHistory,
          context: { isTimerRunning, sessionsCompleted, hasTasks },
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("API error");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let data: { content?: string; done?: boolean; error?: string };
          try {
            data = JSON.parse(line.slice(6)) as typeof data;
          } catch {
            continue; // malformed JSON chunk, skip
          }
          if (data.error) throw new Error(data.error);
          if (data.content) {
            full += data.content;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: "assistant", content: full };
              return next;
            });
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: "Sorry, I couldn't connect right now. Check your API key in settings." };
          return next;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messages, streaming, isTimerRunning, sessionsCompleted, hasTasks]);

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  const QUICK_ACTIONS: QuickAction[] = [
    {
      label: "Start Focus",
      description: "Begin a Pomodoro session",
      icon: Play,
      color: "#335C81",
      message: "I'm starting a focus session now.",
      onClick: onStartTimer,
    },
    {
      label: "Take a Break",
      description: "Short 5-minute break",
      icon: Coffee,
      color: "#77ACA2",
      message: "Taking a short break.",
      onClick: onStartBreak,
    },
    {
      label: "Add a Task",
      description: "Plan what to work on",
      icon: ListPlus,
      color: "#9DBEBB",
      message: "Help me think of what to add to my task list.",
      onClick: onFocusTaskInput,
    },
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={handleClose}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.93 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="relative z-50 w-[320px] rounded-2xl bg-card border border-card-border shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "min(560px, 80vh)" }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0"
                style={{ background: "linear-gradient(135deg, #335C8108, #77ACA208)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #335C81, #4a7c9e)" }}>
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
                  onClick={handleClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5 min-h-0">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                      style={msg.role === "user" ? { background: "#335C81" } : {}}
                    >
                      {msg.content || (streaming && i === messages.length - 1 ? (
                        <Loader2 size={12} className="animate-spin text-muted-foreground" />
                      ) : "")}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Quick actions */}
              {messages.length <= 1 && (
                <div className="px-3 pb-2 flex flex-col gap-1 shrink-0">
                  {QUICK_ACTIONS.map((action) => {
                    const { icon: Icon } = action;
                    return (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.message, action.onClick)}
                        disabled={streaming}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 transition-all group text-left disabled:opacity-50"
                      >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${action.color}18`, color: action.color }}>
                          <Icon size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{action.label}</p>
                          <p className="text-[10px] text-muted-foreground">{action.description}</p>
                        </div>
                        <ChevronRight size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Input */}
              <div className="px-3 pb-3 pt-1 border-t border-border shrink-0">
                <div className="flex gap-2 items-center bg-muted rounded-xl px-3 py-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                    placeholder="Ask Coach anything..."
                    disabled={streaming}
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={streaming || !input.trim()}
                    className="w-6 h-6 flex items-center justify-center rounded-lg transition-all disabled:opacity-40"
                    style={{ background: "#335C81", color: "#fff" }}
                  >
                    {streaming ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5">Powered by GPT-4o mini</p>
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
        {hasNudge && !open && (
          <motion.span
            className="absolute inset-0 rounded-2xl"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ background: "#77ACA2" }}
          />
        )}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background: "linear-gradient(135deg, #335C81, #4a7c9e)",
            boxShadow: "0 4px 16px rgba(51,92,129,0.35)",
          }}
        >
          <Sparkles size={20} className="text-white" />
        </div>
        <span
          className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full transition-all"
          style={{
            background: open ? "#335C81" : "hsl(var(--muted))",
            color: open ? "#fff" : "hsl(var(--muted-foreground))",
          }}
        >
          Coach
        </span>
      </motion.button>
    </div>
  );
}
