import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ListPlus, Plus, Save, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AiLoading } from "@/components/AiTextOutput";
import { CopyButton } from "@/components/CopyButton";
import { Disclaimer } from "@/components/Disclaimer";
import { summarizeMeeting } from "@/lib/ai.functions";
import { errMsg, useHistoryMutations } from "@/lib/history";
import { addTask } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — AI Workplace" },
      { name: "description", content: "Turn meeting notes into summary, action items, decisions and deadlines." },
      { property: "og:title", content: "Meeting Notes Summarizer — AI Workplace" },
      { property: "og:description", content: "Turn meeting notes into summary, action items, decisions and deadlines." },
    ],
  }),
  component: Meetings,
});

type Result = { summary: string; action_items: string[]; decisions: string[]; deadlines: string[] };

function format(r: Result) {
  const list = (a: string[]) => (a.length ? a.map((x) => `- ${x}`).join("\n") : "- None");
  return `SUMMARY\n${r.summary}\n\nACTION ITEMS\n${list(r.action_items)}\n\nDECISIONS\n${list(r.decisions)}\n\nDEADLINES\n${list(r.deadlines)}`;
}

function ListEditor({
  title,
  items,
  onChange,
  onSend,
}: {
  title: string;
  items: string[];
  onChange: (v: string[]) => void;
  onSend?: (item: string) => void;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {items.length === 0 && <p className="mb-2 text-sm text-muted-foreground">None</p>}
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row">
            <Input value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <div className="flex gap-2">
              {onSend && (
                <Button size="sm" variant="secondary" onClick={() => onSend(it)} disabled={!it.trim()}>
                  <ListPlus className="h-4 w-4" /> Send to Planner
                </Button>
              )}
              <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="ghost" className="mt-1" onClick={() => onChange([...items, ""])}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    </div>
  );
}

function Meetings() {
  const run = useServerFn(summarizeMeeting);
  const { create, update } = useHistoryMutations("meeting");
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string>();
  const [saved, setSaved] = useState<Result | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  async function go() {
    setLoading(true);
    try {
      const out = await run({ data: { notes } });
      const row = await create.mutateAsync({ title: notes.slice(0, 60), input: { notes }, output: out });
      setActiveId(row.id);
      setRes(out);
      setSaved(out);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  async function send(item: string) {
    try {
      await addTask({ title: item, due_date: null, due_time: null, priority: "medium" });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Added to Task Planner");
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const dirty = res && JSON.stringify(res) !== JSON.stringify(saved);

  return (
    <>
      <PageHeader title="Meeting Notes Summarizer" subtitle="Paste your notes and get a structured summary." />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste meeting notes here…"
              className="min-h-[180px]"
            />
            <Button onClick={go} disabled={loading || !notes.trim()}>
              <FileText className="h-4 w-4" /> {loading ? "Summarizing…" : "Summarize"}
            </Button>
          </Card>
          {loading ? (
            <AiLoading label="Summarizing your meeting…" />
          ) : (
            res && (
              <Card className="space-y-5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">Results</h3>
                  <div className="flex gap-2">
                    <CopyButton text={format(res)} />
                    <Button
                      size="sm"
                      disabled={!dirty || update.isPending || !activeId}
                      onClick={async () => {
                        await update.mutateAsync({ id: activeId!, output: res });
                        setSaved(res);
                        toast.success("Edits saved");
                      }}
                    >
                      <Save className="h-4 w-4" /> Save edits
                    </Button>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h4>
                  <Textarea value={res.summary} onChange={(e) => setRes({ ...res, summary: e.target.value })} className="min-h-[120px]" />
                </div>
                <ListEditor title="Action Items" items={res.action_items} onChange={(v) => setRes({ ...res, action_items: v })} onSend={send} />
                <ListEditor title="Decisions" items={res.decisions} onChange={(v) => setRes({ ...res, decisions: v })} />
                <ListEditor title="Deadlines" items={res.deadlines} onChange={(v) => setRes({ ...res, deadlines: v })} />
                <Disclaimer />
              </Card>
            )
          )}
        </div>
        <HistoryPanel
          tool="meeting"
          activeId={activeId}
          onSelect={(r) => {
            const o = r.output as Result;
            const i = r.input as { notes?: string };
            setActiveId(r.id);
            setNotes(i.notes ?? "");
            setRes(o);
            setSaved(o);
          }}
        />
      </div>
    </>
  );
}
