import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/PageHeader";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AiLoading, AiTextOutput } from "@/components/AiTextOutput";
import { DueFields, PrioritySelect, priorityClass, type Draft } from "@/components/TaskFields";
import { planSchedule } from "@/lib/ai.functions";
import { errMsg, useHistoryMutations } from "@/lib/history";
import { addTask, deleteTask, PRIORITY_ORDER, todayISO, updateTask, useTasks, type Task } from "@/lib/tasks";
import { buildBlocks, formatSchedule } from "@/lib/schedule";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Task Planner — AI Workplace" },
      { name: "description", content: "Add tasks with deadlines and get a deadline-safe daily or weekly schedule." },
      { property: "og:title", content: "Task Planner — AI Workplace" },
      { property: "og:description", content: "Add tasks with deadlines and get a deadline-safe daily or weekly schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Planner,
});

const EMPTY: Draft = { title: "", date: "", time: "", priority: "medium" };
const dueLabel = (t: Task) =>
  t.due_date
    ? `Due ${new Date(t.due_date + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short" })}${t.due_time ? ` · ${t.due_time.slice(0, 5)}` : ""}`
    : "";
const valid = (d: Draft) => d.title.trim() && d.date && d.time;

function Planner() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: tasks = [] } = useTasks();
  const run = useServerFn(planSchedule);
  const { create, update } = useHistoryMutations("planner");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);
  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string>();
  const [text, setText] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks"] });
  const sorted = [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1),
  );
  const open = tasks.filter((t) => !t.done);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (savingRef.current || !valid(draft)) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await addTask({ title: draft.title.trim(), due_date: draft.date, due_time: draft.time, priority: draft.priority });
      setDraft(EMPTY);
      await refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing || !valid(editing.draft)) return;
    const d = editing.draft;
    try {
      await updateTask(editing.id, { title: d.title.trim(), due_date: d.date, due_time: d.time, priority: d.priority });
      setEditing(null);
      refresh();
      toast.success("Task updated");
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  async function act(fn: () => Promise<void>) {
    try {
      await fn();
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  async function go() {
    setLoading(true);
    try {
      const now = new Date();
      const payload = open.map((t) => ({ title: t.title, priority: t.priority, due_date: t.due_date, due_time: t.due_time }));
      const schedule = formatSchedule(buildBlocks(payload, now), mode, now);
      let full = schedule;
      try {
        const out = await run({ data: { mode, now: now.toLocaleString(), schedule } });
        full = `${schedule}\n\nWHY THIS ORDER\n${out.text}`;
      } catch (e) {
        toast.error(errMsg(e));
      }
      setActiveId(undefined);
      setText(full);
    } finally {
      setLoading(false);
    }
  }

  async function saveSchedule(v: string) {
    try {
      if (activeId) {
        await update.mutateAsync({ id: activeId, output: { text: v } });
      } else {
        const row = await create.mutateAsync({
          title: `${mode === "daily" ? "Daily" : "Weekly"} schedule · ${todayISO()}`,
          input: { mode },
          output: { text: v },
        });
        setActiveId(row.id);
      }
      setText(v);
      toast.success("Schedule saved");
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <>
      <PageHeader title="Task Planner" subtitle="Add tasks with deadlines, then build a schedule that finishes on time." />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card className="p-5">
            <form onSubmit={add} className="grid gap-3 md:grid-cols-[1fr_auto_140px_auto] md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="new-title">Task</Label>
                <Input id="new-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="New task…" required />
              </div>
              <DueFields id="new" draft={draft} set={setDraft} />
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <PrioritySelect value={draft.priority} onChange={(p) => setDraft({ ...draft, priority: p })} />
              </div>
              <Button type="submit" disabled={saving || !valid(draft)}>
                <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add"}
              </Button>
            </form>
            <ul className="mt-4 divide-y">
              {sorted.length === 0 && <li className="py-3 text-sm text-muted-foreground">No tasks yet.</li>}
              {sorted.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 py-3">
                  <Checkbox checked={t.done} onCheckedChange={() => act(() => updateTask(t.id, { done: !t.done }))} aria-label="Done" />
                  <span className={`min-w-0 flex-1 ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                  <Badge className={`capitalize ${priorityClass(t.priority)}`}>{t.priority}</Badge>
                  {t.due_date && <span className="text-xs text-muted-foreground">{dueLabel(t)}</span>}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate({
                        to: "/email",
                        search: { purpose: `Follow-up email about the task "${t.title}"${t.due_date ? ` (${dueLabel(t).toLowerCase()})` : ""}.` },
                      })
                    }
                  >
                    <Mail className="h-4 w-4" /> Draft follow-up email
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit"
                    onClick={() =>
                      setEditing({ id: t.id, draft: { title: t.title, date: t.due_date ?? "", time: t.due_time?.slice(0, 5) ?? "", priority: t.priority } })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => act(() => deleteTask(t.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="flex flex-wrap items-center gap-3 p-5">
            <ToggleGroup type="single" variant="outline" value={mode} onValueChange={(v) => v && setMode(v as "daily" | "weekly")}>
              <ToggleGroupItem value="daily" className="px-4">Daily</ToggleGroupItem>
              <ToggleGroupItem value="weekly" className="px-4">Weekly</ToggleGroupItem>
            </ToggleGroup>
            <span className="text-xs text-muted-foreground">{mode === "daily" ? "Today, hour by hour" : "Grouped by day"}</span>
            <Button onClick={go} disabled={loading || open.length === 0} className="ml-auto">
              <CalendarClock className="h-4 w-4" /> {loading ? "Planning…" : "Generate schedule"}
            </Button>
          </Card>
          {loading ? (
            <AiLoading label="Building your schedule…" />
          ) : (
            text && (
              <AiTextOutput
                title="Your schedule"
                value={text}
                saving={create.isPending || update.isPending}
                saveLabel="Save schedule"
                alwaysSavable={!activeId}
                onSave={saveSchedule}
              />
            )
          )}
        </div>
        <HistoryPanel
          tool="planner"
          activeId={activeId}
          onSelect={(r) => {
            setActiveId(r.id);
            setText((r.output as { text?: string }).text ?? "");
          }}
        />
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Task</Label>
                <Input id="edit-title" value={editing.draft.title} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, title: e.target.value } })} />
              </div>
              <DueFields id="edit" draft={editing.draft} set={(d) => setEditing({ ...editing, draft: d })} />
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <PrioritySelect value={editing.draft.priority} onChange={(p) => setEditing({ ...editing, draft: { ...editing.draft, priority: p } })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!editing || !valid(editing.draft)}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
