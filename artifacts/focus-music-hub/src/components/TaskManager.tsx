import { useCallback, useRef, useState } from "react";
import { Plus, Trash2, Mic, Flag, Check, Pencil, X, Share2, ClipboardCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type TaskStatus = "not-done" | "in-progress" | "done";
export type TaskPriority = "none" | "medium" | "high";
type FilterTab = "active" | "all" | "done";

export interface Task {
  id: number;
  text: string;
  status: TaskStatus;
  priority?: TaskPriority;
  createdAt: string;
  dateString: string;
}

interface TaskManagerProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  none: "hsl(var(--muted-foreground))",
  medium: "#f39c12",
  high: "#e74c3c",
};

const PRIORITY_CYCLE: Record<TaskPriority, TaskPriority> = {
  none: "medium",
  medium: "high",
  high: "none",
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, none: 2 };
const STATUS_ORDER: Record<TaskStatus, number> = { "in-progress": 0, "not-done": 1, done: 2 };

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const sa = STATUS_ORDER[a.status];
    const sb = STATUS_ORDER[b.status];
    if (sa !== sb) return sa - sb;
    const pa = PRIORITY_ORDER[a.priority ?? "none"];
    const pb = PRIORITY_ORDER[b.priority ?? "none"];
    return pa - pb;
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionConstructor { new(): SpeechRecognitionInstance; }
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export function TaskManager({ tasks, onTasksChange }: TaskManagerProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("active");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const shareTasks = useCallback(async () => {
    const activeTasks = tasks.filter((t) => t.status !== "done");
    const doneTasks = tasks.filter((t) => t.status === "done");
    const PRIORITY_LABEL: Record<TaskPriority, string> = { high: " !!!", medium: " !!", none: "" };
    const fmt = (t: Task) => `${t.status === "in-progress" ? "▶ " : "• "}${t.text}${PRIORITY_LABEL[t.priority ?? "none"]}`;

    const lines = [
      `Focus Music Hub — Task List`,
      `${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
      "",
      ...(activeTasks.length > 0 ? ["TO DO", ...activeTasks.map(fmt), ""] : []),
      ...(doneTasks.length > 0 ? ["DONE", ...doneTasks.map(fmt)] : []),
    ];
    const text = lines.join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: "My task list", text });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tasks]);

  const addTask = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const newTask: Task = {
      id: Date.now(),
      text: trimmed,
      status: "not-done",
      priority: "none",
      createdAt: now,
      dateString: now,
    };
    onTasksChange(sortTasks([...tasks, newTask]));
    setInput("");
  }, [tasks, onTasksChange]);

  const handleDelete = useCallback((id: number) => {
    onTasksChange(tasks.filter((t) => t.id !== id));
  }, [tasks, onTasksChange]);

  const handleToggleDone = useCallback((id: number) => {
    onTasksChange(sortTasks(tasks.map((t) => {
      if (t.id !== id) return t;
      if (t.status === "done") return { ...t, status: "not-done" as TaskStatus };
      return { ...t, status: "done" as TaskStatus };
    })));
  }, [tasks, onTasksChange]);

  const handleToggleInProgress = useCallback((id: number) => {
    onTasksChange(sortTasks(tasks.map((t) => {
      if (t.id !== id) return t;
      if (t.status === "done") return t;
      const next: TaskStatus = t.status === "in-progress" ? "not-done" : "in-progress";
      return { ...t, status: next };
    })));
  }, [tasks, onTasksChange]);

  const handlePriorityCycle = useCallback((id: number) => {
    onTasksChange(sortTasks(tasks.map((t) => {
      if (t.id !== id) return t;
      const curr = t.priority ?? "none";
      return { ...t, priority: PRIORITY_CYCLE[curr] };
    })));
  }, [tasks, onTasksChange]);

  const startEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setEditText(task.text);
    setTimeout(() => editRef.current?.focus(), 50);
  }, []);

  const commitEdit = useCallback((id: number) => {
    const trimmed = editText.trim();
    if (trimmed) {
      onTasksChange(tasks.map((t) => t.id === id ? { ...t, text: trimmed } : t));
    }
    setEditingId(null);
    setEditText("");
  }, [editText, tasks, onTasksChange]);

  const startVoice = useCallback(async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice input isn't supported in this browser. Try Chrome, or type your task.");
      return;
    }
    if (!window.isSecureContext) {
      setVoiceError("Voice input needs a secure (https) connection.");
      return;
    }
    setVoiceError(null);

    // Mobile browsers (esp. Chrome on Android) won't reliably surface the
    // mic permission prompt from SpeechRecognition alone — request it
    // explicitly first so the user gets a clear prompt/error.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        setVoiceError("Microphone access denied. Allow mic permission for this site in your browser settings.");
        return;
      }
    }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    setInput("Listening...");
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const t = event.results[0][0].transcript;
      setInput(t);
      setIsListening(false);
      setTimeout(() => addTask(t), 800);
    };
    recognition.onerror = (event: Event & { error?: string }) => {
      setIsListening(false);
      setInput("");
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setVoiceError("Microphone access denied. Allow mic permission for this site in your browser settings.");
      } else if (event?.error === "no-speech") {
        setVoiceError("Didn't catch that — try again.");
      } else {
        setVoiceError("Voice input failed. Try again.");
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [addTask]);

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const progressPct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const filtered = tasks.filter((t) => {
    if (filter === "active") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  });

  const FILTERS: { id: FilterTab; label: string }[] = [
    { id: "active", label: `Active${tasks.filter(t => t.status !== "done").length > 0 ? ` · ${tasks.filter(t => t.status !== "done").length}` : ""}` },
    { id: "all", label: "All" },
    { id: "done", label: `Done${doneCount > 0 ? ` · ${doneCount}` : ""}` },
  ];

  return (
    <div className="rounded-2xl bg-card border border-card-border shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground text-xs tracking-widest uppercase">Tasks</h2>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {doneCount}/{total} done
              </span>
            )}
            {tasks.length > 0 && (
              <button
                onClick={shareTasks}
                title={copied ? "Copied!" : "Share tasks"}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                style={{
                  background: copied ? "#34d39920" : "hsl(var(--muted))",
                  color: copied ? "#34d399" : "hsl(var(--muted-foreground))",
                }}
              >
                {copied
                  ? <><ClipboardCheck size={11} /> Copied</>
                  : <><Share2 size={11} /> Share</>
                }
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="h-1 rounded-full bg-muted overflow-hidden mb-4">
            <motion.div
              className="h-full rounded-full"
              style={{ background: progressPct === 100 ? "#34d399" : "#8b5cf6" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-0 border-b border-border mb-0 -mx-5 px-5">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`text-[11px] font-semibold pb-2.5 pt-0.5 mr-4 border-b-2 transition-all ${
                filter === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            data-testid="input-task"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addTask(input); }}
            placeholder="Add a task..."
            disabled={isListening}
            className="flex-1 px-3 py-2 text-sm rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all"
          />
          <button
            data-testid="button-voice-input"
            onClick={startVoice}
            disabled={isListening}
            title="Voice input"
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
              isListening
                ? "bg-red-500 border-red-500 text-white animate-pulse"
                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
            }`}
          >
            <Mic size={15} />
          </button>
          <button
            data-testid="button-add-task"
            onClick={() => addTask(input)}
            title="Add task"
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
            style={{ background: "linear-gradient(135deg, #6d28d9, #8b5cf6)", color: "#fff" }}
          >
            <Plus size={15} />
          </button>
        </div>
        {voiceError && <p className="text-xs text-destructive mt-1.5">{voiceError}</p>}
      </div>

      {/* Task List */}
      <div className="px-5 pb-5 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
        <AnimatePresence initial={false}>
          {filtered.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 gap-2 text-center"
            >
              {filter === "done" && doneCount === 0 ? (
                <>
                  <Check size={22} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No completed tasks yet</p>
                </>
              ) : (
                <>
                  <Plus size={22} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No tasks — add one above</p>
                  <p className="text-xs text-muted-foreground/60">Try voice input with the mic button</p>
                </>
              )}
            </motion.div>
          )}

          {filtered.map((task) => {
            const priority = task.priority ?? "none";
            const isDone = task.status === "done";
            const isInProgress = task.status === "in-progress";
            const isEditing = editingId === task.id;

            return (
              <motion.div
                key={task.id}
                data-testid={`card-task-${task.id}`}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
                transition={{ duration: 0.18 }}
                className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
                  isDone
                    ? "bg-muted/20 border-border/60"
                    : isInProgress
                    ? "bg-primary/[0.04] border-primary/20"
                    : "bg-muted/40 border-border hover:bg-muted/60"
                }`}
              >
                {/* Checkbox */}
                <button
                  data-testid={`button-task-status-${task.id}`}
                  onClick={() => handleToggleDone(task.id)}
                  title={isDone ? "Mark undone" : "Mark done"}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all hover:scale-105 ${
                    isDone ? "border-[#34d399] bg-[#34d399]" : isInProgress ? "border-primary" : "border-muted-foreground/40 hover:border-primary"
                  }`}
                >
                  {isDone && <Check size={10} className="text-white" strokeWidth={3} />}
                  {isInProgress && !isDone && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>

                {/* Text or edit input */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      ref={editRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(task.id);
                        if (e.key === "Escape") { setEditingId(null); setEditText(""); }
                      }}
                      onBlur={() => commitEdit(task.id)}
                      className="w-full text-sm bg-transparent border-b border-primary/50 focus:outline-none text-foreground pb-0.5"
                    />
                  ) : (
                    <p
                      className={`text-sm leading-snug cursor-text ${
                        isDone ? "line-through text-muted-foreground/60" : "text-foreground"
                      }`}
                      onDoubleClick={() => !isDone && startEdit(task)}
                      title={isDone ? "" : "Double-click to edit"}
                    >
                      {task.text}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/60">{relativeTime(task.createdAt)}</span>
                    {!isDone && (
                      <button
                        onClick={() => handleToggleInProgress(task.id)}
                        className={`text-[10px] font-medium transition-colors ${
                          isInProgress ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
                        }`}
                      >
                        {isInProgress ? "In progress" : "· Start"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  {/* Priority flag */}
                  {!isDone && (
                    <button
                      data-testid={`button-task-priority-${task.id}`}
                      onClick={() => handlePriorityCycle(task.id)}
                      title={`Priority: ${priority}`}
                      className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:bg-muted"
                    >
                      <Flag
                        size={12}
                        style={{ color: PRIORITY_COLOR[priority] }}
                        fill={priority !== "none" ? PRIORITY_COLOR[priority] : "none"}
                      />
                    </button>
                  )}

                  {/* Edit */}
                  {!isDone && !isEditing && (
                    <button
                      data-testid={`button-task-edit-${task.id}`}
                      onClick={() => startEdit(task)}
                      title="Edit"
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Pencil size={11} />
                    </button>
                  )}

                  {/* Cancel edit */}
                  {isEditing && (
                    <button
                      onClick={() => { setEditingId(null); setEditText(""); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      <X size={11} />
                    </button>
                  )}

                  {/* Delete — always visible on mobile, hover on desktop */}
                  <button
                    data-testid={`button-task-delete-${task.id}`}
                    onClick={() => handleDelete(task.id)}
                    title="Delete"
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
