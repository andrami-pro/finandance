"use client";

import { useReducer, useCallback, useMemo } from "react";
import { ArrowLeft, ArrowRight, Lock } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WizardStepper } from "./WizardStepper";
import { StepDetails } from "./steps/StepDetails";
import { StepMembers } from "./steps/StepMembers";
import { StepStrategy } from "./steps/StepFunding";
import { StepReview } from "./steps/StepReview";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProject } from "@/hooks/useProjects";
import type {
  FundingStrategy,
  ProjectDetails,
  ProjectMember,
  ProjectResponse,
} from "@/types/projects";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Details" },
  { label: "Members" },
  { label: "Strategy" },
  { label: "Review" },
];

const NEXT_LABELS = ["Next: Add Members", "Next: Strategy", "Next: Review Project"];

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

interface WizardState {
  currentStep: number;
  details: ProjectDetails;
  members: ProjectMember[];
  invitedEmails: string[];
  fundingStrategy: FundingStrategy | null;
  errors: Record<string, string>;
  submitting: boolean;
}

type WizardAction =
  | { type: "SET_STEP"; step: number }
  | { type: "UPDATE_DETAILS"; details: ProjectDetails }
  | { type: "ADD_MEMBER"; email: string }
  | { type: "REMOVE_MEMBER"; email: string }
  | { type: "SET_FUNDING_STRATEGY"; strategy: FundingStrategy }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "CLEAR_ERRORS" }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | { type: "RESET" };

function createInitialState(): WizardState {
  return {
    currentStep: 0,
    details: {
      name: "",
      targetAmount: null,
      targetCurrency: "EUR",
      targetDate: "",
      category: null,
    },
    members: [],
    invitedEmails: [],
    fundingStrategy: null,
    errors: {},
    submitting: false,
  };
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step, errors: {} };

    case "UPDATE_DETAILS":
      return { ...state, details: action.details };

    case "ADD_MEMBER":
      return {
        ...state,
        invitedEmails: [...state.invitedEmails, action.email],
        members: [
          ...state.members,
          {
            email: action.email,
            displayName: action.email.split("@")[0],
            role: "PENDING_INVITE",
          },
        ],
      };

    case "REMOVE_MEMBER":
      return {
        ...state,
        invitedEmails: state.invitedEmails.filter((e) => e !== action.email),
        members: state.members.filter((m) => m.email !== action.email),
      };

    case "SET_FUNDING_STRATEGY":
      return { ...state, fundingStrategy: action.strategy };

    case "SET_ERRORS":
      return { ...state, errors: action.errors };

    case "CLEAR_ERRORS":
      return { ...state, errors: {} };

    case "SET_SUBMITTING":
      return { ...state, submitting: action.submitting };

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: ProjectResponse) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateProjectWizard({ isOpen, onClose, onSuccess }: CreateProjectWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, createInitialState);
  const { user } = useAuth();
  const { create } = useCreateProject();

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  // All members including the current user (owner)
  const allMembers = useMemo(() => {
    const owner: ProjectMember = {
      email: user?.email ?? "you@example.com",
      displayName: user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "You",
      role: "OWNER",
    };
    return [owner, ...state.members];
  }, [state.members, user]);

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validateStep = useCallback(
    (step: number): Record<string, string> => {
      const errors: Record<string, string> = {};

      if (step === 0) {
        if (!state.details.name.trim()) {
          errors.name = "Project name is required";
        }
        if (state.details.targetAmount === null || state.details.targetAmount <= 0) {
          errors.targetAmount = "Enter a target amount greater than 0";
        }
      }

      // Steps 1, 2, 3 have no blocking validation
      return errors;
    },
    [state.details]
  );

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const handleNext = useCallback(async () => {
    // Validate current step
    const errors = validateStep(state.currentStep);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "SET_ERRORS", errors });
      return;
    }

    if (state.currentStep < 3) {
      dispatch({ type: "SET_STEP", step: state.currentStep + 1 });
      return;
    }

    // Final step — submit via API
    dispatch({ type: "SET_SUBMITTING", submitting: true });

    try {
      const result = await create({
        name: state.details.name,
        target_amount: state.details.targetAmount ?? 0,
        target_currency: state.details.targetCurrency,
        target_date: state.details.targetDate || null,
        category: state.details.category,
        invited_emails: state.invitedEmails,
        funding_strategy: state.fundingStrategy,
      });

      dispatch({ type: "RESET" });
      onSuccess(result);
    } catch {
      dispatch({
        type: "SET_ERRORS",
        errors: { submit: "Failed to create project. Please try again." },
      });
    } finally {
      dispatch({ type: "SET_SUBMITTING", submitting: false });
    }
  }, [
    state.currentStep,
    state.details,
    state.invitedEmails,
    state.fundingStrategy,
    validateStep,
    create,
    onSuccess,
  ]);

  const handleBack = useCallback(() => {
    if (state.currentStep > 0) {
      dispatch({ type: "SET_STEP", step: state.currentStep - 1 });
    }
  }, [state.currentStep]);

  const handleClose = useCallback(() => {
    dispatch({ type: "RESET" });
    onClose();
  }, [onClose]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Create New Shared Project</DialogTitle>
        <DialogDescription className="sr-only">
          A 4-step wizard to create a shared financial project.
        </DialogDescription>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-8 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Create New Shared Project
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Stepper */}
        <div className="border-b border-border bg-muted/30 px-8 py-6">
          <WizardStepper steps={STEPS} currentStep={state.currentStep} />
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-8">
          {state.currentStep === 0 && (
            <StepDetails
              data={state.details}
              onChange={(details) => dispatch({ type: "UPDATE_DETAILS", details })}
              errors={state.errors as Record<string, string>}
            />
          )}

          {state.currentStep === 1 && (
            <StepMembers
              members={state.members}
              currentUserEmail={user?.email ?? "you@example.com"}
              currentUserName={
                user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "You"
              }
              onInvite={(email) => dispatch({ type: "ADD_MEMBER", email })}
              onRemoveInvite={(email) => dispatch({ type: "REMOVE_MEMBER", email })}
            />
          )}

          {state.currentStep === 2 && (
            <StepStrategy
              selected={state.fundingStrategy}
              onSelect={(strategy) => dispatch({ type: "SET_FUNDING_STRATEGY", strategy })}
            />
          )}

          {state.currentStep === 3 && (
            <StepReview
              details={state.details}
              members={allMembers}
              fundingStrategy={state.fundingStrategy}
            />
          )}

          {/* Submit error */}
          {state.errors.submit && (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {state.errors.submit}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-8 py-5">
          {state.currentStep > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={state.submitting}
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/10 transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {state.currentStep === 3 ? (
              <>
                <Lock size={14} />
                {state.submitting ? "Creating\u2026" : "Create Project"}
              </>
            ) : (
              <>
                {NEXT_LABELS[state.currentStep]}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
