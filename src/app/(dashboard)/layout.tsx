import Sidebar from "@/components/sidebar";
import { HelpdeskChat } from "@/components/helpdesk-chat";
import { OnboardingTrigger } from "@/components/onboarding-trigger";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
