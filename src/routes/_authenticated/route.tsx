import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SupportProvider } from "@/components/SupportPanel";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <SupportProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <div className="flex-1"><Outlet /></div>
        <Footer />
      </div>
    </SupportProvider>
  ),
});
