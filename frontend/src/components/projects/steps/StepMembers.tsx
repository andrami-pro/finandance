"use client";

import { useState } from "react";
import { Envelope, User, X } from "@phosphor-icons/react";
import type { ProjectMember } from "@/types/projects";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepMembersProps {
  members: ProjectMember[];
  currentUserEmail: string;
  currentUserName: string;
  onInvite: (email: string) => void;
  onRemoveInvite: (email: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepMembers({
  members,
  currentUserEmail,
  currentUserName,
  onInvite,
  onRemoveInvite,
}: StepMembersProps) {
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleInvite = () => {
    const email = emailInput.trim().toLowerCase();

    if (!email) {
      setEmailError("Email is required");
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }

    if (email === currentUserEmail.toLowerCase()) {
      setEmailError("You can't invite yourself");
      return;
    }

    if (members.some((m) => m.email.toLowerCase() === email)) {
      setEmailError("This email has already been invited");
      return;
    }

    setEmailError(null);
    setEmailInput("");
    onInvite(email);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInvite();
    }
  };

  const pendingMembers = members.filter((m) => m.role === "PENDING_INVITE");

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h3 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Who is joining this project?
        </h3>
        <p className="text-xs text-muted-foreground">
          Invite your partner or friends to share balances and track goals together.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Email invite bar */}
        <div className="rounded-md border border-border/50 bg-muted/50 p-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Envelope
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setEmailError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter email address"
                className="w-full rounded-md border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/50 shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleInvite}
              className="whitespace-nowrap rounded-md bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/10 transition-colors hover:bg-primary/90"
            >
              Send Invite
            </button>
          </div>
          {emailError && <p className="mt-1 px-1 text-xs text-destructive">{emailError}</p>}
        </div>

        {/* Members list */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
            Project Members
          </h4>

          <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-md border border-border bg-card">
            {/* Current user (owner) */}
            <div className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-primary/10 text-sm font-bold text-primary">
                  {currentUserName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">{currentUserName} (You)</span>
                  <span className="text-[10px] text-muted-foreground">Owner &bull; Pro Plan</span>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary ring-1 ring-inset ring-primary/20">
                Admin
              </span>
            </div>

            {/* Pending invites */}
            {pendingMembers.map((member) => (
              <div key={member.email} className="flex items-center justify-between bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-muted-foreground/30 bg-muted opacity-70">
                    <User size={20} className="text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground opacity-70">
                      {member.email}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Invitation Sent</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-border">
                    Pending
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveInvite(member.email)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    title="Remove invite"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
