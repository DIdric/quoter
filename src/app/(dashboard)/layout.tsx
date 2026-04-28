import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/sidebar";
import { HelpdeskChat } from "@/components/helpdesk-chat";
import { OnboardingTrigger } from "@/components/onboarding-trigger";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile?.subscription_tier === "free" && !profile?.onboarding_completed) {
      redirect("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="p-4 pt-16 md:p-6 md:pt-16 lg:p-8 lg:pt-8">
          {children}
        </main>
      </div>
      <HelpdeskChat />
      <OnboardingTrigger />
    </div>
  );
}
