"use client";

import { useRouter } from "next/navigation";
import { useProjectWizard } from "@/contexts/ProjectWizardContext";
import { CreateProjectWizard } from "./CreateProjectWizard";

export function CreateProjectWizardShell() {
  const { isWizardOpen, closeWizard } = useProjectWizard();
  const router = useRouter();

  return (
    <CreateProjectWizard
      isOpen={isWizardOpen}
      onClose={closeWizard}
      onSuccess={(project) => {
        closeWizard();
        router.push(`/shared-projects/${project.id}/get-started`);
      }}
    />
  );
}
