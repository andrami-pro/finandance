"use client";

/**
 * Post-creation activation interstitial — strategy-aware.
 *
 * Branches the experience based on `project.funding_strategy`:
 *   - crypto → inline CryptoActivationCards (Kraken + Ledger) + DCA framing
 *   - fiat   → FiatActivationCards (filtered sources or Wise connect) + Auto-Save
 *   - null   → generic activation (no regression from spec 002)
 */

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CircleNotch,
  CurrencyBtc,
  Link as LinkIcon,
  Sparkle,
  Timer,
  Wallet,
} from "@phosphor-icons/react";
import { useProjectDetail, useFundingSources } from "@/hooks/useProjects";
import { LinkSourcesPanel } from "@/components/projects/activation/LinkSourcesPanel";
import { AutoSavePanel } from "@/components/projects/activation/AutoSavePanel";
import { CryptoActivationCards } from "@/components/projects/activation/CryptoActivationCards";
import { FiatActivationCards } from "@/components/projects/activation/FiatActivationCards";
import { StrategyBadge } from "@/components/projects/StrategyBadge";

type ActivePanel = "none" | "link-sources" | "auto-save" | "connect-wallet" | "link-fiat";

export default function GetStartedPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const { project, loading } = useProjectDetail(projectId);
  const { sources: fundingSources } = useFundingSources();

  const [activePanel, setActivePanel] = useState<ActivePanel>("none");

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading || !project) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <CircleNotch size={32} className="animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading project&hellip;</span>
        </div>
      </div>
    );
  }

  const strategy = project.funding_strategy;
  const existingSourceIds = project.funding_sources.map((fs) => fs.funding_source_id);
  const navigateToDetail = () => router.push(`/shared-projects/${projectId}`);

  // ---------------------------------------------------------------------------
  // Panel views
  // ---------------------------------------------------------------------------

  // Crypto: inline wallet/exchange connection
  if (activePanel === "connect-wallet") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setActivePanel("none")}
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            &larr; Back to options
          </button>
        </div>
        <CryptoActivationCards projectId={projectId} onComplete={navigateToDetail} />
      </div>
    );
  }

  // Fiat: filtered sources or Wise connect
  if (activePanel === "link-fiat") {
    return (
      <div className="mx-auto max-w-2xl">
        <FiatActivationCards
          projectId={projectId}
          existingSourceIds={existingSourceIds}
          targetCurrency={project.target_currency}
          fundingSources={fundingSources}
          onComplete={navigateToDetail}
          onBack={() => setActivePanel("none")}
        />
      </div>
    );
  }

  // Generic link sources (null strategy)
  if (activePanel === "link-sources") {
    return (
      <div className="mx-auto max-w-2xl">
        <LinkSourcesPanel
          projectId={projectId}
          existingSourceIds={existingSourceIds}
          targetCurrency={project.target_currency}
          onBack={() => setActivePanel("none")}
          onComplete={navigateToDetail}
        />
      </div>
    );
  }

  // Auto-save / DCA
  if (activePanel === "auto-save") {
    return (
      <div className="mx-auto max-w-2xl">
        <AutoSavePanel
          projectId={projectId}
          targetAmount={project.target_amount}
          currentBalance={project.current_amount}
          targetCurrency={project.target_currency}
          fundingStrategy={project.funding_strategy}
          onBack={() => setActivePanel("none")}
          onComplete={navigateToDetail}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Default: 3 option cards (strategy-specific content)
  // ---------------------------------------------------------------------------

  const isCrypto = strategy === "crypto";
  const isFiat = strategy === "fiat";

  // Header content
  const headerIcon = isCrypto ? (
    <CurrencyBtc size={24} className="text-primary" />
  ) : (
    <Sparkle size={24} className="text-primary" />
  );

  const title = isCrypto
    ? `Your crypto project "${project.name}" is ready!`
    : isFiat
      ? `Your savings project "${project.name}" is ready!`
      : `Your project "${project.name}" is ready!`;

  const subtitle = isCrypto
    ? "Let's connect your first wallet to start tracking."
    : isFiat
      ? "Link your savings accounts to start tracking progress."
      : "Choose how you'd like to get started.";

  // Primary card
  const primaryIcon = isCrypto ? (
    <Wallet size={20} className="text-primary" />
  ) : (
    <LinkIcon size={20} className="text-primary" />
  );

  const primaryTitle = isCrypto
    ? "Connect Wallet"
    : isFiat
      ? "Link Savings"
      : "Link Funding Sources";

  const primaryDescription = isCrypto
    ? "Link your exchange account or add a wallet address to track your crypto holdings."
    : isFiat
      ? "Connect your savings accounts to track progress toward your goal. Only fiat sources are shown."
      : "Connect your accounts to start tracking progress toward your goal.";

  const primaryAction = isCrypto
    ? () => setActivePanel("connect-wallet")
    : isFiat
      ? () => setActivePanel("link-fiat")
      : () => setActivePanel("link-sources");

  // Auto-save card
  const autoSaveTitle = isCrypto ? "Set Up DCA" : "Set Up Auto-Save";
  const autoSaveDescription = isCrypto
    ? "Dollar-Cost Average into crypto at regular intervals to reduce volatility impact."
    : "Plan recurring contributions and see a projection of when you\u2019ll reach your goal.";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Success header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
          {headerIcon}
        </div>
        <div className="mb-2 flex items-center justify-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          <StrategyBadge strategy={strategy} />
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Option cards */}
      <div className="grid grid-cols-1 gap-3">
        <OptionCard
          icon={primaryIcon}
          title={primaryTitle}
          description={primaryDescription}
          onClick={primaryAction}
        />
        <OptionCard
          icon={<Timer size={20} className="text-primary" />}
          title={autoSaveTitle}
          description={autoSaveDescription}
          onClick={() => setActivePanel("auto-save")}
        />
        <OptionCard
          icon={<ArrowRight size={20} className="text-primary" />}
          title="Explore First"
          description="Go to your project dashboard. You can set up funding later."
          onClick={navigateToDetail}
          muted
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OptionCard
// ---------------------------------------------------------------------------

function OptionCard({
  icon,
  title,
  description,
  onClick,
  muted,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-4 rounded-md border p-5 text-left shadow-sm transition-all ${
        muted
          ? "border-border bg-muted/30 hover:border-border hover:bg-muted/50"
          : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="mb-0.5 text-sm font-bold text-foreground">{title}</h3>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <ArrowRight
        size={16}
        className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
      />
    </button>
  );
}
