import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Task = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  done: boolean;
  created_at: string;
};

export const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function todayISO(d = new Date()) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Open tasks that are overdue or due within the next `days` days. */
export function dueSoon(tasks: Task[], today: string, days = 2) {
  const limit = new Date(today + "T00:00:00");
  limit.setDate(limit.getDate() + days);
  const limitISO = todayISO(limit);
  return tasks.filter((t) => !t.done && t.due_date && t.due_date <= limitISO);
}

export async function addTask(title: string, due_date: string | null, priority: string) {
  const { error } = await supabase.from("tasks").insert({ title, due_date, priority });
  if (error) throw error;
}
