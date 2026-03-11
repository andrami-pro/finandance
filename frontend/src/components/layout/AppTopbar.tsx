"use client";

import { Bell, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { useProjectWizard } from "@/contexts/ProjectWizardContext";

export function AppTopbar() {
  const [search, setSearch] = useState("");
  const { openWizard } = useProjectWizard();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 px-8 backdrop-blur-sm">
      {/* Search */}
      <div className="flex w-1/3 items-center">
        <div className="group relative w-full max-w-sm">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions, assets, or partners…"
            className="w-full rounded-lg border border-input bg-muted py-2 pl-9 pr-4 text-xs font-medium text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-5">
        {/* Notifications */}
        <button
          className="relative text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-card bg-destructive" />
        </button>

        {/* Create Shared Project CTA */}
        <button
          onClick={openWizard}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/10 transition-colors hover:bg-primary/90"
        >
          <Plus size={14} weight="bold" />
          Create Shared Project
        </button>
      </div>
    </header>
  );
}
