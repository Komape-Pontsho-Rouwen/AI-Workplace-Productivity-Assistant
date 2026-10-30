import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarCheck, FileText, Mail, Search, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Workplace Productivity Assistant" },
      { name: "description", content: "Summarize meetings, plan tasks, write emails and research topics with AI." },
      { property: "og:title", content: "AI Workplace Productivity Assistant" },
      { property: "og:description", content: "Summarize meetings, plan tasks, write emails and research topics with AI." },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: FileText, t: "Meeting Notes Summarizer" },
  { icon: CalendarCheck, t: "Task Planner" },
  { icon: Mail, t: "Email Generator" },
  { icon: Search, t: "Research Assistant" },
];

function Index() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSignedIn(true);
        navigate({ to: "/dashboard" });
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-sidebar text-sidebar-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center gap-2 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Briefcase className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sidebar-accent-foreground">AI Workplace</span>
        <Button asChild variant="secondary" size="sm" className="ml-auto">
          <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Dashboard" : "Log in"}</Link>
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-sidebar-accent-foreground md:text-6xl">
          Your AI workplace productivity assistant.
        </h1>
        <p className="mt-5 max-w-xl text-lg opacity-80">
          Summarize meetings, plan your week, draft emails and research topics — all saved to your account.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
            <Link to="/auth">Get started free</Link>
          </Button>
        </div>
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.t} className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent p-4">
              <f.icon className="h-5 w-5 text-sidebar-primary" />
              <span className="text-sm font-medium text-sidebar-accent-foreground">{f.t}</span>
            </div>
          ))}
        </div>
      </main>
      <footer className="border-t border-sidebar-border px-6 py-4">
        <Disclaimer className="mx-auto max-w-6xl justify-center text-sidebar-foreground/70" />
      </footer>
    </div>
  );
}
