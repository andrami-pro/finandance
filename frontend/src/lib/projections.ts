/**
 * Projection calculator for savings plans.
 *
 * Pure function — no API calls. Takes contribution parameters and
 * returns projected milestones and data points for chart rendering.
 */

import type { PlanFrequency } from "@/types/projects";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectionInput {
  currentBalance: number;
  targetAmount: number;
  contributionAmount: number;
  frequency: PlanFrequency;
  startDate?: Date;
}

export interface ProjectionMilestone {
  percent: number; // 25, 50, 75, or 100
  amount: number;
  date: Date;
  monthIndex: number;
}

export interface ProjectionDataPoint {
  monthIndex: number;
  date: Date;
  balance: number;
}

export interface ProjectionResult {
  estimatedCompletionDate: Date | null;
  monthsToGoal: number;
  milestones: ProjectionMilestone[];
  dataPoints: ProjectionDataPoint[];
  goalAlreadyReached: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREQUENCY_MONTHLY_MULTIPLIER: Record<PlanFrequency, number> = {
  weekly: 4.333,
  biweekly: 2.167,
  monthly: 1,
};

const MAX_MONTHS = 120;

const MILESTONE_PERCENTS = [25, 50, 75, 100];

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

export function calculateProjection(input: ProjectionInput): ProjectionResult {
  const { currentBalance, targetAmount, contributionAmount, frequency, startDate } = input;

  const start = startDate ?? new Date();

  // Edge case: goal already reached
  if (currentBalance >= targetAmount) {
    return {
      estimatedCompletionDate: start,
      monthsToGoal: 0,
      milestones: [],
      dataPoints: [{ monthIndex: 0, date: start, balance: currentBalance }],
      goalAlreadyReached: true,
    };
  }

  // Edge case: zero contribution
  if (contributionAmount <= 0) {
    const points: ProjectionDataPoint[] = [{ monthIndex: 0, date: start, balance: currentBalance }];
    return {
      estimatedCompletionDate: null,
      monthsToGoal: Infinity,
      milestones: [],
      dataPoints: points,
      goalAlreadyReached: false,
    };
  }

  const monthlyRate = contributionAmount * FREQUENCY_MONTHLY_MULTIPLIER[frequency];
  const remaining = targetAmount - currentBalance;
  const monthsToGoal = Math.ceil(remaining / monthlyRate);
  const cappedMonths = Math.min(monthsToGoal, MAX_MONTHS);

  // Build data points (one per month, starting from month 0)
  const dataPoints: ProjectionDataPoint[] = [];
  const milestones: ProjectionMilestone[] = [];
  const milestoneThresholds = MILESTONE_PERCENTS.map((p) => currentBalance + (remaining * p) / 100);
  const milestoneHit = new Set<number>();

  for (let m = 0; m <= cappedMonths; m++) {
    const balance = Math.min(currentBalance + monthlyRate * m, targetAmount);
    const date = addMonths(start, m);
    dataPoints.push({ monthIndex: m, date, balance });

    // Check milestones
    for (let i = 0; i < milestoneThresholds.length; i++) {
      if (!milestoneHit.has(i) && balance >= milestoneThresholds[i]) {
        milestoneHit.add(i);
        milestones.push({
          percent: MILESTONE_PERCENTS[i],
          amount: milestoneThresholds[i],
          date,
          monthIndex: m,
        });
      }
    }
  }

  const completionDate = addMonths(start, monthsToGoal);

  return {
    estimatedCompletionDate: monthsToGoal <= MAX_MONTHS ? completionDate : null,
    monthsToGoal,
    milestones,
    dataPoints,
    goalAlreadyReached: false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
