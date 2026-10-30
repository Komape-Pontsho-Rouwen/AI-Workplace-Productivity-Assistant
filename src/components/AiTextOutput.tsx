import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "./CopyButton";
import { Disclaimer } from "./Disclaimer";

export function AiLoading({ label = "Generating…" }: { label?: string }) {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Loader2 className="h-4 w-4 animate-spin" /> {label}
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </Card>
  );
}

/** Editable AI text output with copy + save. */
export function AiTextOutput({
  title,
  value,
  onSave,
  saving,
  saveLabel = "Save edits",
  alwaysSavable,
}: {
  title: string;
  value: string;
  onSave: (v: string) => void;
  saving?: boolean;
  saveLabel?: string;
  alwaysSavable?: boolean;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const dirty = alwaysSavable || text !== value;
  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          <CopyButton text={text} />
          <Button size="sm" disabled={!dirty || saving} onClick={() => onSave(text)}>
            <Save className="h-4 w-4" /> {saveLabel}
          </Button>
        </div>
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[320px] font-sans leading-relaxed" />
      <Disclaimer />
    </Card>
  );
}
