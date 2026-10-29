import { History, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHistory, useHistoryMutations, type HistoryRow, type Tool } from "@/lib/history";

export function HistoryPanel({
  tool,
  activeId,
  onSelect,
}: {
  tool: Tool;
  activeId?: string | undefined;
  onSelect: (row: HistoryRow) => void;
}) {
  const { data, isLoading } = useHistory(tool);
  const { remove } = useHistoryMutations(tool);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4" /> History
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
      ) : (
        <ul className="max-h-[420px] space-y-1 overflow-y-auto">
          {data.map((r) => (
            <li key={r.id} className="group flex items-center gap-1">
              <button
                onClick={() => onSelect(r)}
                className={cn(
                  "flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  activeId === r.id && "bg-secondary text-secondary-foreground",
                )}
              >
                <span className="block truncate">{r.title || "Untitled"}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-60 hover:opacity-100"
                aria-label="Delete"
                onClick={() => remove.mutate(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
