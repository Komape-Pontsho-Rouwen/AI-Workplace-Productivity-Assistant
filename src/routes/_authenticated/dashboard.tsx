import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, CalendarCheck, FileText, Mail, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { dueSoon, todayISO, useTasks } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Workplace Productivity Assistant" },
      { name: "description", content: "Your reminders and AI productivity tools in one place." },
      { property: "og:title", content: "Dashboard — AI Workplace Productivity Assistant" },
      { property: "og:description", content: "Your reminders and AI productivity tools in one place." },
    ],
  }),
  component: Dashboard,
});

const TOOLS = [
  { to: "/meetings", title: "Meeting Notes Summarizer", desc: "Summary, action items, decisions and deadlines.", icon: FileText },
  { to: "/planner", title: "Task Planner", desc: "Prioritized daily or weekly schedules.", icon: CalendarCheck },
  { to: "/email", title: "Email Generator", desc: "Formal, friendly or persuasive emails.", icon: Mail },
  { to: "/research", title: "Research Assistant", desc: "Summaries, insights and recommendations.", icon: Search },
] as const;

function Dashboard() {
  const { data: tasks = [] } = useTasks();
  const today = todayISO();
  const soon = dueSoon(tasks, today);
  return (
    <>
      <PageHeader title="Good to see you" subtitle="Here's what needs your attention." />
      <Card className="mb-8 border-warning bg-warning/40 p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold text-warning-foreground">
          <BellRing className="h-4 w-4" /> Reminders
        </div>
        {soon.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks due in the next 2 days.</p>
        ) : (
          <ul className="space-y-2">
            {soon.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{t.title}</span>
                <Badge variant={t.due_date! < today ? "destructive" : "secondary"}>
                  {t.due_date! < today ? "Overdue" : t.due_date === today ? "Due today" : `Due ${t.due_date}`}
                </Badge>
                <Badge variant="outline" className="capitalize">{t.priority}</Badge>
              </li>
            ))}
          </ul>
        )}
        <Link to="/planner" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Open Task Planner →
        </Link>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="h-full p-5 transition hover:border-primary hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
