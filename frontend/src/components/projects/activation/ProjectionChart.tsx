"use client";

/**
 * SVG projection chart — shows projected balance growth toward target.
 *
 * All colors via CSS custom properties (semantic tokens only).
 */

import type { ProjectionDataPoint, ProjectionMilestone } from "@/lib/projections";

interface ProjectionChartProps {
  dataPoints: ProjectionDataPoint[];
  targetAmount: number;
  currency: string;
  milestones: ProjectionMilestone[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  BTC: "\u20bf",
};

function formatCompact(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  if (amount >= 1000) {
    return `${sym}${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  }
  return `${sym}${Math.round(amount)}`;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

const PADDING = { top: 24, right: 16, bottom: 36, left: 56 };
const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 200;
const CHART_W = VIEW_WIDTH - PADDING.left - PADDING.right;
const CHART_H = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

export function ProjectionChart({
  dataPoints,
  targetAmount,
  currency,
  milestones,
}: ProjectionChartProps) {
  if (dataPoints.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        Not enough data for projection
      </div>
    );
  }

  const maxMonth = dataPoints[dataPoints.length - 1].monthIndex;
  const maxBalance = Math.max(targetAmount, ...dataPoints.map((p) => p.balance));

  // Scale functions
  const xScale = (month: number) => PADDING.left + (month / Math.max(maxMonth, 1)) * CHART_W;
  const yScale = (balance: number) =>
    PADDING.top + CHART_H - (balance / Math.max(maxBalance, 1)) * CHART_H;

  // Build polyline points
  const linePoints = dataPoints
    .map((p) => `${xScale(p.monthIndex)},${yScale(p.balance)}`)
    .join(" ");

  // Area fill path
  const areaPath = [
    `M ${xScale(0)},${yScale(0)}`,
    ...dataPoints.map((p) => `L ${xScale(p.monthIndex)},${yScale(p.balance)}`),
    `L ${xScale(dataPoints[dataPoints.length - 1].monthIndex)},${yScale(0)}`,
    "Z",
  ].join(" ");

  // Target line Y
  const targetY = yScale(targetAmount);

  // Y-axis ticks (4 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    value: maxBalance * frac,
    y: yScale(maxBalance * frac),
  }));

  // X-axis labels (every ~25% of months)
  const xLabelIndexes = [0, Math.floor(maxMonth * 0.5), maxMonth].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="h-auto w-full" role="img">
        <title>Savings projection chart</title>
        <desc>Line chart showing projected balance growth from contributions over time</desc>

        {/* Grid lines */}
        {yTicks.map((tick) => (
          <line
            key={tick.value}
            x1={PADDING.left}
            y1={tick.y}
            x2={VIEW_WIDTH - PADDING.right}
            y2={tick.y}
            stroke="oklch(var(--border))"
            strokeWidth="0.5"
          />
        ))}

        {/* Target line (dashed) */}
        <line
          x1={PADDING.left}
          y1={targetY}
          x2={VIEW_WIDTH - PADDING.right}
          y2={targetY}
          stroke="oklch(var(--muted-foreground))"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text
          x={VIEW_WIDTH - PADDING.right}
          y={targetY - 4}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize="8"
          fontFamily="inherit"
        >
          Target
        </text>

        {/* Area fill */}
        <path d={areaPath} fill="oklch(var(--primary))" fillOpacity="0.08" />

        {/* Projection line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="oklch(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Milestone dots */}
        {milestones.map((m) => (
          <g key={m.percent}>
            <circle
              cx={xScale(m.monthIndex)}
              cy={yScale(m.amount)}
              r="3.5"
              fill="oklch(var(--primary))"
              stroke="oklch(var(--card))"
              strokeWidth="1.5"
            />
            <text
              x={xScale(m.monthIndex)}
              y={yScale(m.amount) - 8}
              textAnchor="middle"
              className="fill-primary"
              fontSize="7"
              fontWeight="bold"
              fontFamily="inherit"
            >
              {m.percent}%
            </text>
          </g>
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <text
            key={tick.value}
            x={PADDING.left - 6}
            y={tick.y + 3}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize="8"
            fontFamily="inherit"
          >
            {formatCompact(tick.value, currency)}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabelIndexes.map((idx) => {
          const point = dataPoints.find((p) => p.monthIndex === idx);
          if (!point) return null;
          return (
            <text
              key={idx}
              x={xScale(idx)}
              y={VIEW_HEIGHT - 8}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="8"
              fontFamily="inherit"
            >
              {formatMonth(point.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
