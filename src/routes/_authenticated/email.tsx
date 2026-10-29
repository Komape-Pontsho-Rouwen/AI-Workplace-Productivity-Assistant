import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/PageHeader";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AiLoading, AiTextOutput } from "@/components/AiTextOutput";
import { generateEmail } from "@/lib/ai.functions";
import { errMsg, useHistoryMutations } from "@/lib/history";

const TONES = ["Formal", "Friendly", "Persuasive"] as const;
type Tone = (typeof TONES)[number];

export const Route = createFileRoute("/_authenticated/email")({
  validateSearch: z.object({ purpose: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Email Generator — AI Workplace" },
      { name: "description", content: "Generate formal, friendly or persuasive emails." },
      { property: "og:title", content: "Email Generator — AI Workplace" },
      { property: "og:description", content: "Generate formal, friendly or persuasive emails." },
    ],
  }),
  component: EmailPage,
});

function EmailPage() {
  const search = Route.useSearch();
  const run = useServerFn(generateEmail);
  const { create, update } = useHistoryMutations("email");
  const [tone, setTone] = useState<Tone>("Formal");
  const [recipient, setRecipient] = useState("");
  const [purpose, setPurpose] = useState(search.purpose ?? "");
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string>();
  const [text, setText] = useState("");

  async function go() {
    setLoading(true);
    try {
      const out = await run({ data: { tone, recipient, purpose } });
      const row = await create.mutateAsync({
        title: `${tone}: ${purpose.slice(0, 50)}`,
        input: { tone, recipient, purpose },
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
      <PageHeader title="Email Generator" subtitle="Describe what you need and pick a tone." />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="space-y-2">
              <Label>Tone</Label>
              <ToggleGroup type="single" variant="outline" value={tone} onValueChange={(v) => v && setTone(v as Tone)} className="justify-start">
                {TONES.map((t) => (
                  <ToggleGroupItem key={t} value={t} className="px-4">{t}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rcp">Recipient (optional)</Label>
              <Input id="rcp" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. Sarah, Head of Marketing" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pur">Purpose & key points</Label>
              <Textarea id="pur" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="min-h-[140px]" placeholder="What should the email say?" />
            </div>
            <Button onClick={go} disabled={loading || !purpose.trim()}>
              <Sparkles className="h-4 w-4" /> {loading ? "Writing…" : "Generate email"}
            </Button>
          </Card>
          {loading ? (
            <AiLoading label="Writing your email…" />
          ) : (
            text && (
              <AiTextOutput
                title="Your email"
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
          tool="email"
          activeId={activeId}
          onSelect={(r) => {
            const i = r.input as { tone?: Tone; recipient?: string; purpose?: string };
            setActiveId(r.id);
            setTone(i.tone ?? "Formal");
            setRecipient(i.recipient ?? "");
            setPurpose(i.purpose ?? "");
            setText((r.output as { text?: string }).text ?? "");
          }}
        />
      </div>
    </>
  );
}
