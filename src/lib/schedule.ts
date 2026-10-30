/** Deterministic, deadline-safe scheduling. All times are local. */
export type SchedTask = { title: string; priority: string; due_date: string | null; due_time: string | null };
export type Block = { title: string; priority: string; start: Date; end: Date; deadline: Date | null; atRisk: boolean };

export const BUFFER_MIN = 30;
const DURATION: Record<string, number> = { high: 60, medium: 45, low: 30 };
const DAY_START = 8;
const DAY_END = 20;
const MIN = 60000;

export function deadlineOf(t: SchedTask): Date | null {
  if (!t.due_date) return null;
  return new Date(`${t.due_date}T${(t.due_time ?? "23:59").slice(0, 5)}:00`);
}

function roundUp15(d: Date) {
  const r = new Date(d);
  r.setSeconds(0, 0);
  r.setMinutes(Math.ceil(r.getMinutes() / 15) * 15);
  return r;
}

function at(d: Date, h: number) {
  const r = new Date(d);
  r.setHours(h, 0, 0, 0);
  return r;
}

/** Earliest deadline first, then priority. Every block ends ≥30 min before its deadline when possible. */
export function buildBlocks(tasks: SchedTask[], now: Date): Block[] {
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...tasks].sort((a, b) => {
    const da = deadlineOf(a)?.getTime() ?? Infinity;
    const db = deadlineOf(b)?.getTime() ?? Infinity;
    return da - db || (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
  });
  let cursor = roundUp15(now);
  const blocks: Block[] = [];
  for (const t of sorted) {
    const deadline = deadlineOf(t);
    const latestEnd = deadline ? new Date(deadline.getTime() - BUFFER_MIN * MIN) : null;
    const dur = (DURATION[t.priority] ?? 45) * MIN;
    // Keep inside working hours unless that would break the deadline.
    let start = cursor;
    if (start.getHours() >= DAY_END) start = at(new Date(start.getTime() + 864e5), DAY_START);
    else if (start.getHours() < DAY_START) start = at(start, DAY_START);
    if (latestEnd && start.getTime() + 15 * MIN > latestEnd.getTime()) start = cursor; // urgent: use the night if needed
    let end = new Date(start.getTime() + dur);
    let atRisk = false;
    if (latestEnd && end > latestEnd) {
      end = latestEnd;
      if (end.getTime() - start.getTime() < 15 * MIN) {
        atRisk = true;
        end = new Date(start.getTime() + 15 * MIN);
      }
    }
    blocks.push({ title: t.title, priority: t.priority, start, end, deadline, atRisk });
    cursor = end;
  }
  return blocks;
}

const time = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const day = (d: Date) => d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function line(b: Block) {
  const due = b.deadline ? ` (due ${day(b.deadline)} ${time(b.deadline)})` : "";
  const risk = b.atRisk ? " — not enough time left before the deadline, start now" : "";
  return `${time(b.start)}–${time(b.end)}  ${b.title} [${b.priority}]${due}${risk}`;
}

export function formatSchedule(blocks: Block[], mode: "daily" | "weekly", now: Date) {
  if (mode === "daily") {
    const today = blocks.filter((b) => sameDay(b.start, now));
    const later = blocks.filter((b) => !sameDay(b.start, now));
    const out = [`TODAY · ${day(now)} (planned from ${time(now)})`, ...(today.length ? today.map(line) : ["No tasks need to be done today."])];
    if (later.length) out.push("", "COMING UP", ...later.map((b) => `${day(b.start)}  ${line(b)}`));
    return out.join("\n");
  }
  const out: string[] = [];
  let current = "";
  for (const b of blocks) {
    const d = day(b.start);
    if (d !== current) {
      if (out.length) out.push("");
      out.push(d.toUpperCase());
      current = d;
    }
    out.push(line(b));
  }
  return out.join("\n");
}
