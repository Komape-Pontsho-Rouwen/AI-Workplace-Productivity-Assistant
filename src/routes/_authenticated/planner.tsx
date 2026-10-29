import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/PageHeader";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AiLoading, AiTextOutput } from "@/components/AiTextOutput";
import { planSchedule } from "@/lib/ai.functions";
import { errMsg, useHistoryMutations } from "@/lib/history";
import { addTask, PRIORITY_ORDER, todayISO, useTasks, type Task } from "@/lib/tasks";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Task Planner — AI Workplace" },
      { name: "description", content: "Add tasks and get an AI-prioritized daily or weekly schedule." },
      { property: "og:title", content: "Task Planner — AI Workplace" },
      { property: "og:description", content: "Add tasks and get an AI-prioritized daily or weekly schedule." },
    ],
  }),
  component: Planner,
});

const prioVariant = (p: string) => (p === "high" ? "destructive" : p === "medium" ? "default" : "secondary");

function Planner() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: tasks = [] } = useTasks();
  const run = useServerFn(planSchedule);
  const { create, update } = useHistoryMutations("planner");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("medium");
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
    try {
      await addTask(title.trim(), due || null, priority);
      setTitle("");
      setDue("");
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  async function toggle(t: Task) {
    await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
    refresh();
  }
  async function del(t: Task) {
    await supabase.from("tasks").delete().eq("id", t.id);
    refresh();
  }

  async function go() {
    setLoading(true);
    try {
      const payload = open.map((t) => ({ title: t.title, due_date: t.due_date, priority: t.priority }));
      const out = await run({ data: { mode, today: todayISO(), tasks: payload } });
      const row = await create.mutateAsync({
        title: `${mode === "daily" ? "Daily" : "Weekly"} schedule · ${todayISO()}`,
        input: { mode, tasks: payload },
        output: { text: out.text },
      });
      setActiveId(row.id);
      setText(out.text);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Task Planner" subtitle="Add tasks, then let AI build your schedule." />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card className="p-5">
            <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_160px_130px_auto]">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task…" required />
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={!title.trim()}><Plus className="h-4 w-4" /> Add</Button>
            </form>
            <ul className="mt-4 divide-y">
              {sorted.length === 0 && <li className="py-3 text-sm text-muted-foreground">No tasks yet.</li>}
              {sorted.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 py-3">
                  <Checkbox checked={t.done} onCheckedChange={() => toggle(t)} aria-label="Done" />
                  <span className={`min-w-0 flex-1 ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                  <Badge variant={prioVariant(t.priority)} className="capitalize">{t.priority}</Badge>
                  {t.due_date && <span className="text-xs text-muted-foreground">Due {t.due_date}</span>}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate({
                        to: "/email",
                        search: { purpose: `Follow-up email about the task "${t.title}"${t.due_date ? ` (due ${t.due_date})` : ""}.` },
                      })
                    }
                  >
                    <Mail className="h-4 w-4" /> Draft follow-up email
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => del(t)}>
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
            <Button onClick={go} disabled={loading || open.length === 0}>
              <Sparkles className="h-4 w-4" /> {loading ? "Planning…" : "Generate schedule"}
            </Button>
          </Card>
          {loading ? (
            <AiLoading label="Building your schedule…" />
          ) : (
            text && (
              <AiTextOutput
                title="Your schedule"
                value={text}
                saving={update.isPending}
                onSave={async (v) => {
                  await update.mutateAsync({ id: activeId!, output: { text: v } });
                  setText(v);
                  toast.success("Edits saved");
                }}
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
    </>
  );
}
