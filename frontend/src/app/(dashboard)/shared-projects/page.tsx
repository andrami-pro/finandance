"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AirplaneTilt,
  Car,
  Check,
  CircleNotch,
  DotsThree,
  Funnel,
  Heart,
  House,
  Lightning,
  LinkSimple,
  PencilSimple,
  Plus,
  SortAscending,
  Trash,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProjectWizard } from "@/contexts/ProjectWizardContext";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import type { ProjectCategory, ProjectCurrency, ProjectListItem } from "@/types/projects";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";

const CURRENCY_SYMBOLS: Record<ProjectCurrency, string> = {
  EUR: "\u20ac",
  USD: "$",
  BTC: "\u20bf",
};

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<ProjectCategory, ComponentType<IconProps>> = {
  travel: AirplaneTilt,
  home: House,
  auto: Car,
  family: Heart,
  emergency: Lightning,
};

const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  travel: "bg-primary/10 text-primary",
  home: "bg-blue-100 text-blue-600",
  auto: "bg-stone-100 text-stone-600",
  family: "bg-purple-100 text-purple-600",
  emergency: "bg-primary/15 text-primary",
};

// ---------------------------------------------------------------------------
// ProjectCard
// ---------------------------------------------------------------------------

function ProjectCard({ project }: { project: ProjectListItem }) {
  const router = useRouter();
  const category = project.category ?? "travel";
  const Icon = CATEGORY_ICONS[category];
  const colorClass = CATEGORY_COLORS[category];
  const sym = CURRENCY_SYMBOLS[(project.target_currency ?? "EUR") as ProjectCurrency] ?? "\u20ac";

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { deleteProject, deleting } = useDeleteProject(project.id);

  const projectUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/shared-projects/${project.id}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }

  async function handleDelete() {
    try {
      await deleteProject();
      setShowDeleteDialog(false);
    } catch {
      // Error is surfaced via hook state
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push(`/shared-projects/${project.id}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(`/shared-projects/${project.id}`);
          }
        }}
        className="flex cursor-pointer flex-col gap-4 rounded-md border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/30"
      >
        {/* Top row: icon + menu + avatars */}
        <div className="flex items-start justify-between">
          <div className={`h-10 w-10 rounded-md ${colorClass} flex items-center justify-center`}>
            <Icon size={20} />
          </div>
          <div className="flex items-center gap-1">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(project.member_count, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground"
                  style={{ zIndex: project.member_count - i }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              {project.member_count > 3 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground">
                  +{project.member_count - 3}
                </div>
              )}
            </div>

            {/* Context menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Project options"
                >
                  <DotsThree size={20} weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={() => router.push(`/shared-projects/${project.id}`)}
                  className="gap-2 text-xs"
                >
                  <PencilSimple size={14} />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink} className="gap-2 text-xs">
                  {linkCopied ? <Check size={14} /> : <LinkSimple size={14} />}
                  {linkCopied ? "Link Copied!" : "Copy Share Link"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-xs text-destructive focus:text-destructive"
                >
                  <Trash size={14} />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Project name */}
        <div>
          <h3 className="text-sm font-bold text-foreground">{project.name}</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Target: {sym}
            {project.target_amount.toLocaleString("en")}
          </p>
        </div>

        {/* Amount + progress */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">
              {sym}
              {project.current_amount.toLocaleString("en")}
            </span>
            <span className="text-xs text-muted-foreground">{project.progress_percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${project.progress_percent}%` }}
            />
          </div>
        </div>

        {/* Sources */}
        {project.funding_sources_count > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Sources
            </span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(project.funding_sources_count, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold text-primary"
                >
                  {["W", "K", "L"][i % 3]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{project.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and remove all members. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SharedProjectsPage() {
  const { openWizard } = useProjectWizard();
  const { projects: apiProjects, loading, error } = useProjects();

  const projects = apiProjects;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
            Active Projects
          </h2>
          {loading ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CircleNotch size={12} className="animate-spin" />
              Loading projects…
            </p>
          ) : error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              You have {projects.length} active collaborative goal
              {projects.length !== 1 ? "s" : ""}.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30">
            <Funnel size={14} />
            Filter
          </button>
          <button className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30">
            <SortAscending size={14} />
            Sort by: Recent
          </button>
        </div>
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        {/* Create New Project card */}
        <button
          type="button"
          onClick={openWizard}
          className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card/50 p-6 shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Plus size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">Create New Project</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Start saving for a new goal together with your partner.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
