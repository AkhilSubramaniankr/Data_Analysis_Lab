/**
 * Chart theme tokens — direct hex values for dark theme.
 *
 * These hex values match the OKLCH design tokens in globals.css and are
 * used directly in recharts components — no CSS variable resolution needed.
 */

export const CHART_THEME = {
  // Surfaces
  grid: "#303846",
  axisText: "#CBD5E1",
  tooltipBg: "#141922",
  tooltipBorder: "#252C38",
  tooltipText: "#F4F6FA",
  tooltipSecondary: "#AAB4C2",

  // Series colors
  cyan: "#38BDF8",
  blue: "#3B82F6",
  purple: "#A78BFA",
  green: "#34D399",
  amber: "#FBBF24",
  red: "#F87171",
  white: "#E2E8F0",

  // Feature selection semantic colors
  selected: "#34D399",   // green — selected features
  dropped: "#3B82F6",    // blue — dropped features
  threshold: "#FBBF24",  // amber — threshold indicator

  // Default series palette (cycled by index)
  palette: ["#38BDF8", "#A78BFA", "#34D399", "#FBBF24", "#F87171"],
} as const;

/** Tooltip contentStyle prop for recharts Tooltip. */
export const TOOLTIP_STYLE = {
  fontSize: 11,
  borderRadius: 6,
  border: `1px solid ${CHART_THEME.tooltipBorder}`,
  background: CHART_THEME.tooltipBg,
  color: CHART_THEME.tooltipText,
} as const;

/** Tooltip cursor for bar charts — transparent to prevent gray hover rectangles. */
export const BAR_CURSOR = { fill: "transparent" } as const;

/** Common tick style for XAxis/YAxis. */
export const AXIS_TICK = {
  fontSize: 11,
  fill: CHART_THEME.axisText,
} as const;

/** Common axis label style. */
export function axisLabel(text: string, angle: number = -90, position: string = "insideLeft") {
  return {
    value: text,
    angle,
    position,
    offset: 8,
    fontSize: 11,
    fill: CHART_THEME.axisText,
  };
}
