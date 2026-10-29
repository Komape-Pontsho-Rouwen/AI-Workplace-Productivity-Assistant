import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE =
  "You are a workplace productivity assistant. Be clear, concise and professional. Use plain text with simple '-' bullet lists, no markdown headings or bold.";

function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ notes: z.string().min(1).max(30000) }).parse(d))
  .handler(async ({ data }) => {
    const { generate } = await import("./ai.server");
    const text = await generate(
      `${BASE} Analyze meeting notes. Respond ONLY with JSON: {"summary": string, "action_items": string[], "decisions": string[], "deadlines": string[]}. Use empty arrays when nothing applies.`,
      data.notes,
      getRequest().signal,
    );
    try {
      const j = parseJson<{ summary?: string; action_items?: string[]; decisions?: string[]; deadlines?: string[] }>(text);
      return {
        summary: j.summary ?? "",
        action_items: j.action_items ?? [],
        decisions: j.decisions ?? [],
        deadlines: j.deadlines ?? [],
      };
    } catch {
      return { summary: text, action_items: [], decisions: [], deadlines: [] };
    }
  });

export const planSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        mode: z.enum(["daily", "weekly"]),
        today: z.string(),
        tasks: z.array(z.object({ title: z.string(), due_date: z.string().nullable(), priority: z.string() })).min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { generate } = await import("./ai.server");
    const list = data.tasks.map((t) => `- ${t.title} | priority: ${t.priority} | due: ${t.due_date ?? "none"}`).join("\n");
    return {
      text: await generate(
        `${BASE} Create a prioritized ${data.mode} schedule from the user's tasks. Today is ${data.today}. Order by urgency and priority, group by ${data.mode === "daily" ? "time blocks for today" : "day of the week"}, and add a short rationale.`,
        list,
        getRequest().signal,
      ),
    };
  });

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tone: z.enum(["Formal", "Friendly", "Persuasive"]),
        recipient: z.string().max(200),
        purpose: z.string().min(1).max(10000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { generate } = await import("./ai.server");
    return {
      text: await generate(
        `${BASE} Write a complete email in a ${data.tone} tone. Start with "Subject: ..." on the first line, then the body with greeting and sign-off.`,
        `Recipient: ${data.recipient || "unspecified"}\nPurpose / key points:\n${data.purpose}`,
        getRequest().signal,
      ),
    };
  });

export const researchTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ input: z.string().min(1).max(40000) }).parse(d))
  .handler(async ({ data }) => {
    const { generate } = await import("./ai.server");
    return {
      text: await generate(
        `${BASE} The user gives a topic or pastes an article. Respond with three labelled sections on their own lines: "SUMMARY", "KEY INSIGHTS" (bullets), "RECOMMENDATIONS" (bullets).`,
        data.input,
        getRequest().signal,
      ),
    };
  });
