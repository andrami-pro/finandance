"use client";

/**
 * SavingsPlanSection — shows active savings plan on the project detail page.
 *
 * States:
 *   - No plan: muted card + "Set Up Auto-Save" link
 *   - Active plan: summary + reminder indicator + actions
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarBlank,
  CircleNotch,
  Pause,
  Play,
  Timer,
  Trash,
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
import { useDeleteFundingPlan, useUpdateFundingPlan } from "@/hooks/useFundingPlans";
import { calculateProjection } from "@/lib/projections";
import type { FundingPlanResponse, PlanFrequency } from "@/types/projects";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  BTC: "\u20bf",
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "weekly",
  biweekly: "every 2 weeks",
  monthly: "monthly",
};

// ---------------------------------------------------------------------------
// Reminder status
// ---------------------------------------------------------------------------

type ReminderStatus = "overdue" | "due" | "upcoming" | "none";

function getReminderStatus(nextReminderAt: string | null): ReminderStatus {
  if (!nextReminderAt) return "none";
  const now = new Date();
  const reminder = new Date(nextReminderAt);
  const diffMs = reminder.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffMs < 0) return "overdue";
  if (diffHours <= 24) return "due";
  if (diffHours <= 168) return "upcoming"; // 7 days
  return "none";
}

const REMINDER_DOT_STYLES: Record<ReminderStatus, string> = {
  overdue: "bg-destructive animate-pulse",
  due: "bg-primary animate-pulse",
  upcoming: "bg-muted-foreground",
  none: "bg-muted-foreground/30",
};

const REMINDER_LABELS: Record<ReminderStatus, string> = {
  overdue: "Reminder overdue",
  due: "Due today",
  upcoming: "Upcoming",
  none: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SavingsPlanSectionProps {
  projectId: string;
  plan: FundingPlanResponse | null;
  targetAmount: number;
  currentBalance: number;
  targetCurrency: string;
  onPlanChanged: () => void;
}

export function SavingsPlanSection({
  projectId,
  plan,
  targetAmount,
  currentBalance,
  targetCurrency,
  onPlanChanged,
}: SavingsPlanSectionProps) {
  const sym = CURRENCY_SYMBOLS[targetCurrency] ?? targetCurrency;

  // No plan state
  if (!plan) {
    return (
      <div className="rounded-md border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-muted-foreground" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Savings Plan
            </h3>
          </div>
          <Link
            href={`/shared-projects/${projectId}/get-started`}
            className="flex items-center gap-1.5 text-xs font-bold text-primary transition-colors hover:text-primary/80"
          >
            Set Up Auto-Save
            <ArrowRight size={12} />
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          No savings plan configured. Set up recurring contributions to reach your goal faster.
        </p>
      </div>
    );
  }

  // Active plan
  return (
    <ActivePlanCard
      plan={plan}
      targetAmount={targetAmount}
      currentBalance={currentBalance}
      sym={sym}
      onPlanChanged={onPlanChanged}
    />
  );
}

// ---------------------------------------------------------------------------
// ActivePlanCard (extracted for hooks)
// ---------------------------------------------------------------------------

function ActivePlanCard({
  plan,
  targetAmount,
  currentBalance,
  sym,
  onPlanChanged,
}: {
  plan: FundingPlanResponse;
  targetAmount: number;
  currentBalance: number;
  sym: string;
  onPlanChanged: () => void;
}) {
  const { update, submitting: toggling } = useUpdateFundingPlan(plan.id);
  const { deletePlan, deleting } = useDeleteFundingPlan(plan.id);
  const [localActive, setLocalActive] = useState(plan.is_active);

  const reminderStatus = getReminderStatus(plan.next_reminder_at);

  const projection = useMemo(() => {
    if (!plan.frequency || !plan.is_active) return null;
    return calculateProjection({
      currentBalance,
      targetAmount,
      contributionAmount: plan.amount,
      frequency: plan.frequency as PlanFrequency,
    });
  }, [currentBalance, targetAmount, plan.amount, plan.frequency, plan.is_active]);

  const handleToggle = useCallback(async () => {
    const newActive = !localActive;
    setLocalActive(newActive);
    try {
      await update({ is_active: newActive });
      onPlanChanged();
    } catch {
      setLocalActive(!newActive);
    }
  }, [localActive, update, onPlanChanged]);

  const handleDelete = useCallback(async () => {
    try {
      await deletePlan();
      onPlanChanged();
    } catch {
      // Error shown via hook
    }
  }, [deletePlan, onPlanChanged]);

  const freqLabel = plan.frequency
    ? (FREQUENCY_LABELS[plan.frequency] ?? plan.frequency)
    : "one-time";

  return (
    <div className="rounded-md border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Savings Plan
          </h3>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            localActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {localActive ? "Active" : "Paused"}
        </span>
      </div>

      <div className="flex flex-col gap-3 px-5 py-4">
        {/* Summary row */}
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] font-medium text-muted-foreground">Amount</span>
            <p className="text-lg font-bold tracking-tight text-foreground">
              {sym}
              {plan.amount.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium text-muted-foreground">Frequency</span>
            <p className="text-sm font-medium capitalize text-foreground">{freqLabel}</p>
          </div>

          {/* Reminder indicator */}
          {plan.next_reminder_at && localActive && (
            <div className="ml-auto flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${REMINDER_DOT_STYLES[reminderStatus]}`} />
              <div>
                <span className="block text-[10px] font-medium text-muted-foreground">
                  {REMINDER_LABELS[reminderStatus] || "Next reminder"}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <CalendarBlank size={11} className="text-muted-foreground" />
                  {new Date(plan.next_reminder_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Estimated completion */}
        {projection?.estimatedCompletionDate && (
          <p className="text-[11px] text-muted-foreground">
            Estimated completion:{" "}
            <span className="font-bold text-foreground">
              {projection.estimatedCompletionDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>{" "}
            ({projection.monthsToGoal} months)
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border bg-muted/20 px-5 py-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:border-primary/30 disabled:opacity-50"
        >
          {toggling ? (
            <CircleNotch size={12} className="animate-spin" />
          ) : localActive ? (
            <Pause size={12} />
          ) : (
            <Play size={12} />
          )}
          {localActive ? "Pause" : "Resume"}
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-card px-3 py-1.5 text-[11px] font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {deleting ? <CircleNotch size={12} className="animate-spin" /> : <Trash size={12} />}
              Delete
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Savings Plan</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this savings plan? You can always create a new one
                later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Plan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
