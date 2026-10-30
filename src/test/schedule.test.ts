import { describe, expect, it } from "vitest";
import { buildBlocks, BUFFER_MIN } from "@/lib/schedule";

const now = new Date("2026-10-30T09:47:00");

describe("deadline-safe schedule", () => {
  it("starts from the real current time, never earlier", () => {
    const b = buildBlocks([{ title: "A", priority: "high", due_date: "2026-11-02", due_time: "17:00" }], now)[0]!;
    expect(b.start.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it("finishes every task at least 30 minutes before its deadline", () => {
    const blocks = buildBlocks(
      [
        { title: "Report", priority: "high", due_date: "2026-10-30", due_time: "11:00" },
        { title: "Slides", priority: "medium", due_date: "2026-10-30", due_time: "12:30" },
        { title: "Email", priority: "low", due_date: "2026-10-31", due_time: "09:00" },
      ],
      now,
    );
    for (const b of blocks) {
      expect(b.deadline!.getTime() - b.end.getTime()).toBeGreaterThanOrEqual(BUFFER_MIN * 60000);
    }
  });

  it("puts a task due tomorrow morning today or early tomorrow, before the deadline", () => {
    const b = buildBlocks([{ title: "Tomorrow", priority: "medium", due_date: "2026-10-31", due_time: "09:00" }], now)[0]!;
    expect(b.end.getTime()).toBeLessThanOrEqual(new Date("2026-10-31T08:30:00").getTime());
  });
});
