import { useCallback, useRef, useState } from "react";
import { Plus, Trash2, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type TaskStatus = "not-done" | "in-progress" | "done";

export interface Task {
  id: number;
  text: string;
  status: TaskStatus;
  createdAt: string;
  dateString: string;
}

interface TaskManagerProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
}

const statusCycle: Record<TaskStatus, TaskStatus> = {
  "not-done": "in-progress",
  "in-progress": "done",
  "done": "not-done",
};

const statusColor: Record<TaskStatus, string> = {
  "not-done": "#e74c3c",
  "in-progress": "#f39c12",
  "done": "#27ae60",
};

const statusLabel: Record<TaskStatus, string> = {
  "not-done": "Not done",
  "in-progress": "In progress",
  "done": "Done",
};

function sortTasks(tasks: Task[]): Task[] {
  const order: Record<TaskStatus, number> = { "not-done": 0, "in-progress": 1, "done": 2 };
  return [...tasks].sort((a, b) => order[a.status] - order[b.status]);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
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

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

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
  const inputRef = useRef<HTMLInputElement>(null);

  const addTask = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const newTask: Task = {
      id: Date.now(),
      text: trimmed,
      status: "not-done",
      createdAt: now,
      dateString: formatDate(now),
    };
    onTasksChange(sortTasks([...tasks, newTask]));
    setInput("");
  }, [tasks, onTasksChange]);

  const handleAdd = useCallback(() => addTask(input), [addTask, input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addTask(input);
  }, [addTask, input]);

  const handleDelete = useCallback((id: number) => {
    onTasksChange(tasks.filter((t) => t.id !== id));
  }, [tasks, onTasksChange]);

  const handleStatusToggle = useCallback((id: number) => {
    onTasksChange(sortTasks(tasks.map((t) =>
      t.id === id ? { ...t, status: statusCycle[t.status] } : t
    )));
  }, [tasks, onTasksChange]);

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice input not supported in this browser.");
      return;
    }
    setVoiceError(null);
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    setInput("🎤 Listening...");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      setTimeout(() => addTask(transcript), 1000);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInput("");
      setVoiceError("Voice input failed. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [addTask]);

  return (
    <div className="p-6 rounded-2xl bg-card border border-card-border shadow-lg flex flex-col gap-4">
      <h2 className="font-semibold text-foreground text-sm tracking-wide uppercase">Tasks</h2>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          data-testid="input-task"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task..."
          disabled={isListening}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
        />
        <button
          data-testid="button-voice-input"
          onClick={startVoice}
          disabled={isListening}
          className={`p-2.5 rounded-lg border transition-all ${
            isListening
              ? "bg-red-500 border-red-500 text-white animate-pulse"
              : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-[#77ACA2]"
          }`}
        >
          <Mic size={16} />
        </button>
        <button
          data-testid="button-add-task"
          onClick={handleAdd}
          className="p-2.5 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground hover:border-[#77ACA2] transition-all"
        >
          <Plus size={16} />
        </button>
      </div>

      {voiceError && (
        <p className="text-xs text-destructive">{voiceError}</p>
      )}

      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {tasks.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground text-center py-6"
            >
              No tasks yet. Add one above.
            </motion.p>
          )}
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              data-testid={`card-task-${task.id}`}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/50 border border-border group"
            >
              <button
                data-testid={`button-task-status-${task.id}`}
                onClick={() => handleStatusToggle(task.id)}
                title={statusLabel[task.status]}
                className="mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-all hover:scale-110"
                style={{
                  borderColor: statusColor[task.status],
                  backgroundColor: task.status === "done" ? statusColor[task.status] : "transparent",
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm text-foreground leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                >
                  {task.text}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{task.dateString}</p>
              </div>
              <button
                data-testid={`button-task-delete-${task.id}`}
                onClick={() => handleDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
