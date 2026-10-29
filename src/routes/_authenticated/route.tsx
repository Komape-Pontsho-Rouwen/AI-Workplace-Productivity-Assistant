import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Disclaimer } from "@/components/Disclaimer";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
            <SidebarTrigger />
            <span className="ml-auto truncate text-sm text-muted-foreground">{user.email}</span>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
          <footer className="border-t px-4 py-4 md:px-8">
            <Disclaimer className="mx-auto max-w-6xl justify-center" />
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
