import { useMemo } from "react";
import { Flame } from "lucide-react";

export interface DailyRecord {
  date: string;
  sessions: number;
  minutes: number;
}

interface StreakHeatmapProps {
  history: DailyRecord[];
}

function getDaysArray(weeks = 14): string[] {
  const days: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const total = weeks * 7;
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toDateString());
  }
  return days;
}

function getIntensity(sessions: number): string {
  if (sessions === 0) return "bg-muted";
  if (sessions === 1) return "bg-[#9DBEBB]/40";
  if (sessions === 2) return "bg-[#77ACA2]/60";
  if (sessions === 3) return "bg-[#77ACA2]";
  return "bg-[#335C81]";
}

function getCurrentStreak(history: DailyRecord[]): number {
  const map = new Map(history.map((d) => [d.date, d.sessions]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toDateString();
    if ((map.get(key) ?? 0) >= 1) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function getLongestStreak(history: DailyRecord[]): number {
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let longest = 0;
  let current = 0;
  let prevDate: Date | null = null;
  for (const rec of sorted) {
    if (rec.sessions < 1) { current = 0; prevDate = null; continue; }
    const d = new Date(rec.date);
    if (prevDate) {
      const diff = (d.getTime() - prevDate.getTime()) / 86400000;
      if (diff === 1) current++;
      else current = 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    prevDate = d;
  }
  return longest;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function StreakHeatmap({ history }: StreakHeatmapProps) {
  const days = useMemo(() => getDaysArray(14), []);
  const map = useMemo(() => new Map(history.map((d) => [d.date, d])), [history]);
  const currentStreak = useMemo(() => getCurrentStreak(history), [history]);
  const longestStreak = useMemo(() => getLongestStreak(history), [history]);
  const totalSessions = useMemo(() => history.reduce((s, d) => s + d.sessions, 0), [history]);

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const m = new Date(week[0]).getMonth();
      if (m !== lastMonth) {
        labels.push({ label: MONTH_NAMES[m], col });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="p-6 rounded-2xl bg-card border border-card-border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground text-sm tracking-wide uppercase">Focus Streak</h2>
        <div className="flex items-center gap-1.5 text-[#f39c12]">
          <Flame size={15} />
          <span className="text-sm font-bold text-foreground">{currentStreak}</span>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>
      </div>

      <div className="flex gap-4 mb-5">
        <Stat label="Current Streak" value={`${currentStreak}d`} />
        <Stat label="Longest Streak" value={`${longestStreak}d`} />
        <Stat label="Total Sessions" value={String(totalSessions)} />
      </div>

      <div className="overflow-x-auto">
        <div style={{ position: "relative", paddingTop: 18 }}>
          <div className="flex gap-[3px]" style={{ position: "absolute", top: 0, left: 0 }}>
            {monthLabels.map(({ label, col }) => (
              <div
                key={`${label}-${col}`}
                className="text-[10px] text-muted-foreground"
                style={{ position: "absolute", left: col * (10 + 3) }}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => {
                  const rec = map.get(day);
                  const sessions = rec?.sessions ?? 0;
                  const today = new Date().toDateString();
                  return (
                    <div
                      key={day}
                      data-testid={`cell-heatmap-${day}`}
                      title={`${day}: ${sessions} session${sessions !== 1 ? "s" : ""}`}
                      className={`w-[10px] h-[10px] rounded-[2px] transition-colors cursor-default ${getIntensity(sessions)} ${day === today ? "ring-1 ring-[#77ACA2]" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-muted-foreground">Less</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <div key={lvl} className={`w-[10px] h-[10px] rounded-[2px] ${getIntensity(lvl)}`} />
        ))}
        <span className="text-[10px] text-muted-foreground">More</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-lg font-bold text-foreground leading-none">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
