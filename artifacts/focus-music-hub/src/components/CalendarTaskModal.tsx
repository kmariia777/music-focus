import { useCallback, useState } from "react";
import { X, Calendar, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  htmlLink?: string;
}

type ScheduleChoice = "today" | "tomorrow" | "other";

interface CalendarTaskModalProps {
  open: boolean;
  onClose: () => void;
  onAddTask: (text: string, dueDate?: string) => void;
  isConnected: boolean;
  events: CalendarEvent[];
  isLoadingEvents: boolean;
  onConnect: () => void;
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export function CalendarTaskModal({
  open,
  onClose,
  onAddTask,
  isConnected,
  events,
  isLoadingEvents,
  onConnect,
}: CalendarTaskModalProps) {
  const [customDate, setCustomDate] = useState(todayStr());
  const [customTime, setCustomTime] = useState("09:00");
  const [includeTime, setIncludeTime] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [scheduleChoice, setScheduleChoice] = useState<ScheduleChoice>("today");

  const handleAdd = useCallback(() => {
    if (!taskText.trim()) return;
    let dueDate: string | undefined;
    if (scheduleChoice === "today") dueDate = todayStr();
    else if (scheduleChoice === "tomorrow") dueDate = tomorrowStr();
    else dueDate = includeTime ? `${customDate}T${customTime}` : customDate;
    onAddTask(taskText.trim(), dueDate);
    setTaskText("");
    onClose();
  }, [taskText, scheduleChoice, customDate, customTime, includeTime, onAddTask, onClose]);

  const addFromEvent = useCallback((event: CalendarEvent) => {
    onAddTask(event.title, event.start.split("T")[0]);
    onClose();
  }, [onAddTask, onClose]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const upcomingEvents = events.filter((e) => new Date(e.start) >= today).slice(0, 8);

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
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-card border border-card-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#77ACA2]" />
                <h2 className="font-semibold text-foreground">Schedule Task</h2>
              </div>
              <button
                data-testid="button-close-calendar"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-5">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Task</Label>
                <input
                  data-testid="input-calendar-task"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="What do you need to do?"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">When</Label>
                <div className="flex gap-2">
                  {(["today", "tomorrow", "other"] as ScheduleChoice[]).map((c) => (
                    <button
                      key={c}
                      data-testid={`button-schedule-${c}`}
                      onClick={() => setScheduleChoice(c)}
                      className={`flex-1 py-2 text-sm rounded-lg border capitalize transition-all ${
                        scheduleChoice === c
                          ? "border-[#77ACA2] bg-[#77ACA2]/10 text-foreground font-medium"
                          : "border-border bg-muted text-muted-foreground hover:border-[#9DBEBB]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {scheduleChoice === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-3"
                >
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Date</Label>
                    <input
                      type="date"
                      data-testid="input-custom-date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={todayStr()}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-foreground">Include time</Label>
                    <Switch
                      data-testid="toggle-include-time"
                      checked={includeTime}
                      onCheckedChange={setIncludeTime}
                    />
                  </div>
                  {includeTime && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-muted-foreground shrink-0" />
                      <input
                        type="time"
                        data-testid="input-custom-time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  )}
                </motion.div>
              )}

              <button
                data-testid="button-confirm-add-task"
                onClick={handleAdd}
                disabled={!taskText.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: "hsl(var(--primary))", color: "#fff" }}
              >
                Add Task
              </button>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Upcoming Calendar Events
                  </h3>
                  {!isConnected && (
                    <button
                      data-testid="button-connect-calendar"
                      onClick={onConnect}
                      className="text-xs text-[#77ACA2] hover:underline"
                    >
                      Connect Google Calendar
                    </button>
                  )}
                </div>

                {!isConnected && (
                  <div className="text-center py-6">
                    <Calendar size={28} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">Connect Google Calendar to see your upcoming events here.</p>
                    <button
                      data-testid="button-connect-calendar-main"
                      onClick={onConnect}
                      className="px-4 py-2 text-sm rounded-lg border border-[#77ACA2] text-[#77ACA2] hover:bg-[#77ACA2]/10 transition-all"
                    >
                      Connect Google Calendar
                    </button>
                  </div>
                )}

                {isConnected && isLoadingEvents && (
                  <div className="text-center py-6 text-sm text-muted-foreground">Loading events...</div>
                )}

                {isConnected && !isLoadingEvents && upcomingEvents.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">No upcoming events found.</div>
                )}

                {isConnected && !isLoadingEvents && upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    data-testid={`card-event-${event.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border mb-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatEventDate(event.start)} · {formatEventTime(event.start)}
                      </p>
                    </div>
                    <button
                      data-testid={`button-event-add-task-${event.id}`}
                      onClick={() => addFromEvent(event)}
                      className="shrink-0 text-xs text-[#77ACA2] hover:underline"
                    >
                      Add as task
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
