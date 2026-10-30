import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/tasks";

export type Draft = { title: string; date: string; time: string; priority: string };

/** Day + month picker (current year assumed) and a required time. */
export function DueFields({ draft, set, id }: { draft: Draft; set: (d: Draft) => void; id: string }) {
  const year = new Date().getFullYear();
  const selected = draft.date ? new Date(draft.date + "T00:00:00") : undefined;
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">When is it due?</legend>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" aria-label="Due day and month" className={cn("flex-1 justify-start font-normal", !selected && "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4" />
              {selected ? format(selected, "d MMMM") : "Day and month"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => d && set({ ...draft, date: todayISO(d) })}
              startMonth={new Date(year, 0)}
              endMonth={new Date(year, 11)}
              formatters={{ formatCaption: (m) => format(m, "MMMM") }}
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>
        <div className="w-32">
          <Label htmlFor={`${id}-time`} className="sr-only">Due time</Label>
          <Input id={`${id}-time`} type="time" required value={draft.time} onChange={(e) => set({ ...draft, time: e.target.value })} />
        </div>
      </div>
    </fieldset>
  );
}

export function PrioritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>
  );
}

export const priorityClass = (p: string) =>
  p === "high"
    ? "border-transparent bg-destructive text-destructive-foreground"
    : p === "medium"
      ? "border-transparent bg-warning text-warning-foreground"
      : "border-transparent bg-secondary text-secondary-foreground";
