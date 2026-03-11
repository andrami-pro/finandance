"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AirplaneTilt,
  ArrowLeft,
  CalendarBlank,
  Car,
  CaretRight,
  Check,
  CircleNotch,
  CurrencyBtc,
  CurrencyDollar,
  CurrencyEur,
  Envelope,
  Flag,
  FloppyDisk,
  Heart,
  House,
  Lightning,
  Link as LinkIcon,
  PencilSimple,
  Plus,
  Trash,
  TrendUp,
  Users,
  Wallet,
  X,
} from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useProjectDetail,
  useUpdateProject,
  useDeleteProject,
  useFundingSources,
} from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { SavingsPlanSection } from "@/components/projects/SavingsPlanSection";
import { StrategyBadge } from "@/components/projects/StrategyBadge";
import { EmptySourcesCTA } from "@/components/projects/EmptySourcesCTA";
import type {
  FundingSourceOption,
  ProjectCategory,
  ProjectCurrency,
  ProjectResponse,
  Provider,
} from "@/types/projects";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<ProjectCategory, ComponentType<IconProps>> = {
  travel: AirplaneTilt,
  home: House,
  auto: Car,
  family: Heart,
  emergency: Lightning,
};

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  travel: "Shared Vacation Fund",
  home: "Home Improvement Fund",
  auto: "Vehicle Fund",
  family: "Family Fund",
  emergency: "Emergency Reserve",
};

const CURRENCY_ICONS: Record<ProjectCurrency, ComponentType<IconProps>> = {
  EUR: CurrencyEur,
  USD: CurrencyDollar,
  BTC: CurrencyBtc,
};

const CURRENCY_SYMBOLS: Record<ProjectCurrency, string> = {
  EUR: "\u20ac",
  USD: "$",
  BTC: "\u20bf",
};

const PROVIDER_STYLES: Record<Provider, { bg: string; text: string; letter: string }> = {
  WISE: { bg: "bg-[#9fe870]", text: "text-[#163300]", letter: "W" },
  KRAKEN: { bg: "bg-[#5741d9]", text: "text-white", letter: "K" },
  LEDGER: { bg: "bg-stone-800", text: "text-white", letter: "L" },
  REVOLUT: { bg: "bg-[#0075EB]", text: "text-white", letter: "R" },
};

// Currency classification for strategy-aware sorting
const FIAT_CURRENCIES = new Set([
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: ProjectCurrency): string {
  const sym = CURRENCY_SYMBOLS[currency];
  if (currency === "BTC") return `${sym}${amount}`;
  return `${sym}${amount.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<IconProps>;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={16} className={accent ? "text-primary" : "text-muted-foreground"} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
      {sub && <span className="text-[10px] font-medium text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected Sources Section
// ---------------------------------------------------------------------------

function ConnectedSourcesSection({
  project,
  allSources,
  linkedSourceIds,
  onToggle,
}: {
  project: ProjectResponse;
  allSources: FundingSourceOption[];
  linkedSourceIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const currency = (project.target_currency ?? "EUR") as ProjectCurrency;
  const strategy = project.funding_strategy;

  // Sort strategy-compatible sources first
  const sortedSources = [...allSources].sort((a, b) => {
    if (!strategy) return 0;
    const aIsFiat = FIAT_CURRENCIES.has(a.currency);
    const bIsFiat = FIAT_CURRENCIES.has(b.currency);
    const aMatch = strategy === "fiat" ? aIsFiat : !aIsFiat;
    const bMatch = strategy === "fiat" ? bIsFiat : !bIsFiat;
    if (aMatch === bMatch) return 0;
    return aMatch ? -1 : 1;
  });

  return (
    <div className="rounded-md border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <LinkIcon size={16} className="text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Connected Funding Sources
          </h3>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">
          {linkedSourceIds.size} linked
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-border px-5 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Source Name</span>
        <span>Asset Type</span>
        <span>Currency</span>
        <span className="text-right">Balance</span>
        <span className="w-10 text-center">Link</span>
      </div>

      {/* Rows — sorted by strategy compatibility */}
      {sortedSources.length > 0 ? (
        sortedSources.map((source) => {
          const style = PROVIDER_STYLES[source.provider];
          const isLinked = linkedSourceIds.has(source.id);
          return (
            <div
              key={source.id}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-border px-5 py-3 transition-colors last:border-b-0 ${
                isLinked ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 shrink-0 rounded-md ${style.bg} ${style.text} flex items-center justify-center text-[10px] font-bold shadow-sm`}
                >
                  {style.letter}
                </div>
                <span className="truncate text-sm font-medium text-foreground">{source.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {FIAT_CURRENCIES.has(source.currency) ? "Fiat" : "Crypto"}
              </span>
              <span className="text-xs text-muted-foreground">{source.currency}</span>
              <span className="text-right text-xs font-medium text-foreground">
                {formatCurrency(source.currentBalance, source.currency as ProjectCurrency)}
              </span>
              <div className="flex w-10 justify-center">
                <button
                  type="button"
                  onClick={() => onToggle(source.id)}
                  className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors ${
                    isLinked
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-muted-foreground/30 bg-card hover:border-primary/50"
                  }`}
                >
                  {isLinked && <Check size={12} weight="bold" />}
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <EmptySourcesCTA
          targetCurrency={currency}
          variant="inline"
          onConnected={() => window.location.reload()}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members Section
// ---------------------------------------------------------------------------

function MembersSection({
  project,
  onInvite,
}: {
  project: ProjectResponse;
  onInvite: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState("");

  const handleInvite = () => {
    setInviteError("");
    if (!email.trim() || !email.includes("@")) {
      setInviteError("Enter a valid email address");
      return;
    }
    if (project.members.some((m) => m.email === email.trim())) {
      setInviteError("Already a member");
      return;
    }
    onInvite(email.trim());
    setEmail("");
  };

  return (
    <div className="rounded-md border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Users size={16} className="text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Members</h3>
        <span className="ml-auto text-[10px] font-medium text-muted-foreground">
          {project.members.length} member{project.members.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Member list */}
      <div className="divide-y divide-border">
        {project.members.map((member) => (
          <div key={member.user_id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {(member.full_name ?? member.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {member.full_name ?? member.email ?? "Unknown"}
              </p>
              {member.email && (
                <p className="truncate text-[10px] text-muted-foreground">{member.email}</p>
              )}
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                member.role === "OWNER"
                  ? "bg-primary/10 text-primary"
                  : member.role === "PENDING_INVITE"
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted text-foreground"
              }`}
            >
              {member.role === "PENDING_INVITE" ? "Pending" : member.role}
            </span>
          </div>
        ))}
      </div>

      {/* Invite bar */}
      <div className="border-t border-border bg-muted/30 px-5 py-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Envelope
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="member@email.com"
              className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleInvite}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus size={12} weight="bold" />
            Invite
          </button>
        </div>
        {inviteError && <p className="mt-1.5 text-[10px] text-destructive">{inviteError}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// General Info (editable)
// ---------------------------------------------------------------------------

function GeneralInfoSection({
  project,
  editMode,
  draft,
  onUpdateDraft,
}: {
  project: ProjectResponse;
  editMode: boolean;
  draft: {
    name: string;
    target_amount: number;
    target_date: string;
    category: string | null;
  };
  onUpdateDraft: (patch: Partial<typeof draft>) => void;
}) {
  const currency = (project.target_currency ?? "EUR") as ProjectCurrency;
  const CurrIcon = CURRENCY_ICONS[currency];
  const CategoryIcon = project.category
    ? CATEGORY_ICONS[project.category as ProjectCategory]
    : Flag;
  const categoryLabel = project.category
    ? CATEGORY_LABELS[project.category as ProjectCategory]
    : "Shared Project";

  if (editMode) {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-primary/30 bg-card p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <PencilSimple size={14} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Editing Project
          </span>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Project Name
          </label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => onUpdateDraft({ name: e.target.value })}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Target Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {CURRENCY_SYMBOLS[currency]}
              </span>
              <input
                type="number"
                value={draft.target_amount}
                onChange={(e) => onUpdateDraft({ target_amount: Number(e.target.value) })}
                min={0}
                className="w-full rounded-md border border-border bg-card py-2 pl-7 pr-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Target Date
            </label>
            <input
              type="date"
              value={draft.target_date}
              onChange={(e) => onUpdateDraft({ target_date: e.target.value })}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <CategoryIcon size={24} className="text-primary" />
      </div>
      <div className="flex-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{project.name}</h2>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{categoryLabel}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flag size={14} className="text-primary" />
            <span className="text-xs text-muted-foreground">
              Target:{" "}
              <span className="font-bold text-foreground">
                {formatCurrency(project.target_amount, currency)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarBlank size={14} className="text-primary" />
            <span className="text-xs text-muted-foreground">
              {project.target_date
                ? new Date(project.target_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "No deadline"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CurrIcon size={14} className="text-primary" />
            <span className="text-xs text-muted-foreground">{project.target_currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset Allocation Donut
// ---------------------------------------------------------------------------

function AssetAllocationSection({
  allSources,
  linkedSourceIds,
}: {
  allSources: FundingSourceOption[];
  linkedSourceIds: Set<string>;
}) {
  const linked = allSources.filter((s) => linkedSourceIds.has(s.id));
  const total = linked.reduce((sum, s) => sum + (s.balanceInBaseCurrency ?? s.currentBalance), 0);

  // Group by provider (use EUR-converted balances for correct proportions)
  const byProvider = linked.reduce<Record<string, number>>((acc, s) => {
    acc[s.provider] = (acc[s.provider] ?? 0) + (s.balanceInBaseCurrency ?? s.currentBalance);
    return acc;
  }, {});

  const providers = Object.entries(byProvider);

  const providerColors: Record<string, string> = {
    WISE: "#9fe870",
    KRAKEN: "#5741d9",
    LEDGER: "#1c1c1c",
    REVOLUT: "#0075EB",
  };

  // Build SVG donut segments
  let cumulativePercent = 0;
  const segments = providers.map(([provider, amount]) => {
    const percent = total > 0 ? (amount / total) * 100 : 0;
    const startAngle = (cumulativePercent / 100) * 360;
    const endAngle = ((cumulativePercent + percent) / 100) * 360;
    cumulativePercent += percent;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const r = 40;
    const cx = 50;
    const cy = 50;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = percent > 50 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return { provider, percent, d, color: providerColors[provider] ?? "#888" };
  });

  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Wallet size={16} className="text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Asset Allocation
        </h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            {segments.length > 0 ? (
              segments.map((seg) => (
                <path
                  key={seg.provider}
                  d={seg.d}
                  fill={seg.color}
                  className="transition-all duration-300"
                />
              ))
            ) : (
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="oklch(var(--border))"
                strokeWidth="2"
              />
            )}
            <circle cx="50" cy="50" r="24" fill="oklch(var(--card))" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] text-muted-foreground">Total</span>
            <span className="text-sm font-bold text-foreground">{linked.length}</span>
            <span className="text-[8px] text-muted-foreground">Assets</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2">
          {segments.map((seg) => (
            <div key={seg.provider} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-xs font-medium text-foreground">
                {seg.provider.charAt(0) + seg.provider.slice(1).toLowerCase()}
              </span>
              <span className="text-[10px] text-muted-foreground">{seg.percent.toFixed(0)}%</span>
            </div>
          ))}
          {segments.length === 0 && (
            <span className="text-xs text-muted-foreground">No sources linked</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const { user } = useAuth();
  const { project, loading, error, refresh } = useProjectDetail(projectId);
  const { update, submitting: saving } = useUpdateProject(projectId);
  const { deleteProject, deleting } = useDeleteProject(projectId);
  const { sources: allFundingSources } = useFundingSources();

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    target_amount: 0,
    target_date: "",
    category: null as string | null,
  });

  // Linked funding sources (local state for toggling)
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [linkedDirty, setLinkedDirty] = useState(false);

  // Initialize draft + linked IDs when project loads
  useEffect(() => {
    if (project) {
      setDraft({
        name: project.name,
        target_amount: project.target_amount,
        target_date: project.target_date ?? "",
        category: project.category,
      });
      setLinkedIds(new Set(project.funding_sources.map((fs) => fs.funding_source_id)));
      setLinkedDirty(false);
    }
  }, [project]);

  const currency = (project?.target_currency ?? "EUR") as ProjectCurrency;
  const isOwner = project?.members.some((m) => m.user_id === user?.id && m.role === "OWNER");

  const toggleSource = useCallback((id: string) => {
    setLinkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLinkedDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!project) return;

    const payload: Record<string, unknown> = {};

    if (editMode) {
      if (draft.name !== project.name) payload.name = draft.name;
      if (draft.target_amount !== project.target_amount)
        payload.target_amount = draft.target_amount;
      if (draft.target_date !== (project.target_date ?? ""))
        payload.target_date = draft.target_date || null;
      if (draft.category !== project.category) payload.category = draft.category;
    }

    if (linkedDirty) {
      payload.funding_source_ids = Array.from(linkedIds);
    }

    if (Object.keys(payload).length === 0) {
      setEditMode(false);
      return;
    }

    try {
      await update(payload as Parameters<typeof update>[0]);
      setEditMode(false);
      setLinkedDirty(false);
      refresh();
    } catch {
      // Error is set in the hook
    }
  }, [project, draft, editMode, linkedDirty, linkedIds, update, refresh]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteProject();
      router.push("/shared-projects");
    } catch {
      // Error shown inline
    }
  }, [deleteProject, router]);

  const handleInviteViaApi = useCallback(
    async (email: string) => {
      if (!project) return;
      try {
        const { api: apiClient } = await import("@/lib/api");
        await apiClient.post(`/api/v1/projects/${project.id}/invite`, {
          email,
        });
        refresh();
      } catch {
        // Refresh anyway to show any changes
        refresh();
      }
    },
    [project, refresh]
  );

  // Progress computation
  const progressPercent = useMemo(() => {
    if (!project || project.target_amount <= 0) return 0;
    return Math.min(Math.round((project.current_amount / project.target_amount) * 100), 100);
  }, [project]);

  const hasChanges = editMode || linkedDirty;

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (loading || !project) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <CircleNotch size={32} className="animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            {error ? error : "Loading project\u2026"}
          </span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-7xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/dashboard" className="transition-colors hover:text-foreground">
          Dashboard
        </Link>
        <CaretRight size={10} />
        <Link href="/shared-projects" className="transition-colors hover:text-foreground">
          Shared Projects
        </Link>
        <CaretRight size={10} />
        <span className="max-w-[200px] truncate font-medium text-foreground">{project.name}</span>
      </nav>

      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/shared-projects"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card shadow-sm transition-colors hover:border-primary/30"
          >
            <ArrowLeft size={16} className="text-muted-foreground" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{project.name}</h1>
          <StrategyBadge strategy={project.funding_strategy} />
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            {!editMode && (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/30"
              >
                <PencilSimple size={14} />
                Edit
              </button>
            )}

            {hasChanges && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <FloppyDisk size={14} />
                {saving ? "Saving\u2026" : "Save Changes"}
              </button>
            )}

            {editMode && (
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  // Reset draft
                  if (project) {
                    setDraft({
                      name: project.name,
                      target_amount: project.target_amount,
                      target_date: project.target_date ?? "",
                      category: project.category,
                    });
                  }
                }}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
              >
                <X size={14} />
                Cancel
              </button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-card px-3 py-2 text-xs font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/10"
                >
                  <Trash size={14} />
                  Delete
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &ldquo;{project.name}
                    &rdquo;? This action cannot be undone. All members, funding source links, and
                    project data will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting\u2026" : "Delete Project"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Total Project Balance"
          value={formatCurrency(project.current_amount, currency)}
          sub={`${progressPercent}% funded`}
          icon={Wallet}
          accent
        />
        <StatCard
          label="Progress to Goal"
          value={formatCurrency(project.target_amount - project.current_amount, currency)}
          sub="to go"
          icon={Flag}
        />
        <StatCard
          label="Target Amount"
          value={formatCurrency(project.target_amount, currency)}
          sub={
            project.target_date
              ? `Due ${new Date(project.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : "No deadline set"
          }
          icon={TrendUp}
        />
      </div>

      {/* Progress bar */}
      <div className="mb-6 rounded-md border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Overall Progress
          </span>
          <span className="text-sm font-bold text-foreground">{progressPercent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-2.5 rounded-full bg-primary transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {formatCurrency(project.current_amount, currency)} saved
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatCurrency(project.target_amount, currency)} goal
          </span>
        </div>
      </div>

      {/* Savings Plan */}
      <div className="mb-6">
        <SavingsPlanSection
          projectId={projectId}
          plan={
            project.funding_plans?.find((p) => p.is_active) ?? project.funding_plans?.[0] ?? null
          }
          targetAmount={project.target_amount}
          currentBalance={project.current_amount}
          targetCurrency={project.target_currency}
          onPlanChanged={refresh}
        />
      </div>

      {/* Two-column layout: General Info + Asset Allocation */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GeneralInfoSection
            project={project}
            editMode={editMode}
            draft={draft}
            onUpdateDraft={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          />
        </div>
        <div>
          <AssetAllocationSection allSources={allFundingSources} linkedSourceIds={linkedIds} />
        </div>
      </div>

      {/* Connected Sources */}
      <div className="mb-6">
        <ConnectedSourcesSection
          project={project}
          allSources={allFundingSources}
          linkedSourceIds={linkedIds}
          onToggle={toggleSource}
        />
      </div>

      {/* Members */}
      <div className="mb-6">
        <MembersSection project={project} onInvite={handleInviteViaApi} />
      </div>
    </div>
  );
}
