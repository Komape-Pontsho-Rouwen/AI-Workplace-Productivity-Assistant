import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type Tool = "meeting" | "planner" | "email" | "research";

export type HistoryRow = {
  id: string;
  tool: string;
  title: string;
  input: Json;
  output: Json;
  created_at: string;
};

export function useHistory(tool: Tool) {
  return useQuery({
    queryKey: ["history", tool],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("history")
        .select("*")
        .eq("tool", tool)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as HistoryRow[];
    },
  });
}

export function useHistoryMutations(tool: Tool) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["history"] });
  const create = useMutation({
    mutationFn: async (row: { title: string; input: Json; output: Json }) => {
      const { data, error } = await supabase
        .from("history")
        .insert({ tool, ...row })
        .select()
        .single();
      if (error) throw error;
      return data as HistoryRow;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, output }: { id: string; output: Json }) => {
      const { error } = await supabase.from("history").update({ output }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}
