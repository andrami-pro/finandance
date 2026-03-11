import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { ProjectWizardProvider } from "@/contexts/ProjectWizardContext";
import { CreateProjectWizardShell } from "@/components/projects/CreateProjectWizardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userName = user.user_metadata?.full_name ?? user.email ?? "User";

  return (
    <ProjectWizardProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar userName={userName} userPlan="Pro Plan" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppTopbar />
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
        <CreateProjectWizardShell />
      </div>
    </ProjectWizardProvider>
  );
}
