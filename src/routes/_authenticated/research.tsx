import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AiLoading, AiTextOutput } from "@/components/AiTextOutput";
import { researchTopic } from "@/lib/ai.functions";
import { errMsg, useHistoryMutations } from "@/lib/history";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({
    meta: [
      { title: "Research Assistant — AI Workplace" },
      { name: "description", content: "Summarize a topic or article with insights and recommendations." },
      { property: "og:title", content: "Research Assistant — AI Workplace" },
      { property: "og:description", content: "Summarize a topic or article with insights and recommendations." },
    ],
  }),
  component: Research,
});

function Research() {
  const run = useServerFn(researchTopic);
  const { create, update } = useHistoryMutations("research");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string>();
  const [text, setText] = useState("");

  async function go() {
    setLoading(true);
    try {
      const out = await run({ data: { input } });
      const row = await create.mutateAsync({ title: input.slice(0, 60), input: { input }, output: { text: out.text } });
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
      <PageHeader title="Research Assistant" subtitle="Enter a topic or paste an article." />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} className="min-h-[180px]" placeholder="e.g. Benefits of a 4-day work week — or paste an article…" />
            <Button onClick={go} disabled={loading || !input.trim()}>
              <Sparkles className="h-4 w-4" /> {loading ? "Researching…" : "Analyze"}
            </Button>
          </Card>
          {loading ? (
            <AiLoading label="Researching…" />
          ) : (
            text && (
              <AiTextOutput
                title="Summary, insights & recommendations"
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
          tool="research"
          activeId={activeId}
          onSelect={(r) => {
            setActiveId(r.id);
            setInput((r.input as { input?: string }).input ?? "");
            setText((r.output as { text?: string }).text ?? "");
          }}
        />
      </div>
    </>
  );
}
