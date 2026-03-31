// Design tokens for OneDegree Finance v2

export const C = {
  // Backgrounds
  bg:           "#0B1120",
  card:         "#131B2E",
  cardHover:    "#1A2540",

  // Brand: Gold
  gold:         "#E8B84B",
  goldSoft:     "rgba(232,184,75,0.12)",
  goldMed:      "rgba(232,184,75,0.25)",
  goldGlow:     "rgba(232,184,75,0.3)",

  // Semantic
  green:        "#34D399",
  greenSoft:    "rgba(52,211,153,0.12)",
  greenBorder:  "rgba(52,211,153,0.2)",

  red:          "#F87171",
  redSoft:      "rgba(248,113,113,0.12)",
  redBorder:    "rgba(248,113,113,0.2)",

  blue:         "#60A5FA",
  blueSoft:     "rgba(96,165,250,0.12)",
  blueBorder:   "rgba(96,165,250,0.2)",

  orange:       "#FB923C",
  orangeSoft:   "rgba(251,146,60,0.12)",
  orangeBorder: "rgba(251,146,60,0.2)",

  purple:       "#A78BFA",
  purpleSoft:   "rgba(167,139,250,0.12)",

  // Text
  text:         "#F1F5F9",
  textSec:      "#94A3B8",
  textDim:      "#64748B",

  // Borders
  border:       "rgba(255,255,255,0.06)",
  borderLight:  "rgba(255,255,255,0.1)",
} as const;

export const CLight = {
  bg:           "#F8F7FF",
  card:         "#FFFFFF",
  cardHover:    "#F3F2FF",

  gold:         "#D4A03A",
  goldSoft:     "rgba(212,160,58,0.10)",
  goldMed:      "rgba(212,160,58,0.20)",
  goldGlow:     "rgba(212,160,58,0.25)",

  green:        "#059669",
  greenSoft:    "rgba(5,150,105,0.08)",
  greenBorder:  "rgba(5,150,105,0.15)",

  red:          "#DC2626",
  redSoft:      "rgba(220,38,38,0.08)",
  redBorder:    "rgba(220,38,38,0.15)",

  blue:         "#3B82F6",
  blueSoft:     "rgba(59,130,246,0.08)",
  blueBorder:   "rgba(59,130,246,0.15)",

  orange:       "#EA580C",
  orangeSoft:   "rgba(234,88,12,0.08)",
  orangeBorder: "rgba(234,88,12,0.15)",

  purple:       "#7C3AED",
  purpleSoft:   "rgba(124,58,237,0.08)",

  text:         "#1F2937",
  textSec:      "#6B7280",
  textDim:      "#9CA3AF",

  border:       "rgba(0,0,0,0.06)",
  borderLight:  "rgba(0,0,0,0.10)",
} as const;

export const shadows = {
  card:    "0 2px 12px rgba(0,0,0,0.3)",
  gold:    "0 4px 20px rgba(232,184,75,0.3)",
  blue:    "0 4px 16px rgba(96,165,250,0.25)",
  modal:   "0 -4px 40px rgba(0,0,0,0.6)",
  cardLight: "0 1px 3px rgba(0,0,0,0.08)",
  goldLight: "0 4px 20px rgba(212,160,58,0.25)",
} as const;

export const gradients = {
  heroCard:  "linear-gradient(135deg, #E8B84B 0%, #D4A03A 100%)",
  profitBar: "linear-gradient(90deg, #34D399, #E8B84B)",
  categoryBar: "linear-gradient(90deg, #E8B84B, #34D399)",
  navBg:     "rgba(11,17,32,0.95)",
  navBgLight: "rgba(248,247,255,0.95)",
} as const;

export const spacing = {
  micro: 4,
  tight: 6,
  xs: 8,
  sm: 10,
  md: 12,
  cardCompact: 12,
  cardStandard: 14,
  gutter: 16,
  cardGenerous: 18,
  section: 20,
  lg: 24,
} as const;

export const radius = {
  bar: 4,
  chip: 4,
  btnSm: 8,
  input: 8,
  cardSm: 10,
  btn: 10,
  card: 12,
  alert: 12,
  modal: 14,
  cardStd: 14,
  cardLg: 16,
  fab: 20,
  sheet: 24,
  phone: 36,
} as const;

export const type = {
  h1:      { fontSize: 28, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" },
  h2:      { fontSize: 20, fontWeight: 800 },
  h3:      { fontSize: 18, fontWeight: 800 },
  h4:      { fontSize: 16, fontWeight: 800 },
  body:    { fontSize: 13, fontWeight: 600 },
  label:   { fontSize: 12, fontWeight: 600 },
  caption: { fontSize: 11, fontWeight: 600 },
  micro:   { fontSize: 10, fontWeight: 700 },
  nav:     { fontSize: 9, fontWeight: 700 },
} as const;
