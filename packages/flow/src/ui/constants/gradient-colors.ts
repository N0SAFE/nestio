/**
 * Gradient colors for node headers
 * Based on shadcn-next-workflows theme
 */

export const HeaderGradientColors = {
  purple: "from-purple-700",
  red: "from-red-700",
  blue: "from-blue-700",
  green: "from-green-700",
  yellow: "from-yellow-700",
  pink: "from-pink-700",
  orange: "from-orange-700",
  teal: "from-teal-700",
  lime: "from-lime-700",
  indigo: "from-indigo-700",
  fuchsia: "from-fuchsia-700",
  emerald: "from-emerald-700",
  cyan: "from-cyan-700",
  rose: "from-rose-700",
  sky: "from-sky-700",
  gray: "from-gray-700",
  slate: "from-slate-700",
} as const;

export type GradientColorKey = keyof typeof HeaderGradientColors;
