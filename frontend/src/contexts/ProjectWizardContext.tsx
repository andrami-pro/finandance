"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ProjectWizardContextValue {
  isWizardOpen: boolean;
  openWizard: () => void;
  closeWizard: () => void;
}

const ProjectWizardContext = createContext<ProjectWizardContextValue | null>(null);

export function ProjectWizardProvider({ children }: { children: ReactNode }) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <ProjectWizardContext.Provider
      value={{
        isWizardOpen,
        openWizard: () => setIsWizardOpen(true),
        closeWizard: () => setIsWizardOpen(false),
      }}
    >
      {children}
    </ProjectWizardContext.Provider>
  );
}

export function useProjectWizard() {
  const ctx = useContext(ProjectWizardContext);
  if (!ctx) {
    throw new Error("useProjectWizard must be used within a ProjectWizardProvider");
  }
  return ctx;
}
