// Selectable color themes for the RA 2 performance-ad poster. Each theme
// drives every color surface on the poster (background gradient, ambient
// glow, blurred candlestick bars, CTA gradient/glow, bottom headline accent)
// plus which metallic coin finish suits it, so switching themes always
// looks cohesive rather than mixing an arbitrary background with a
// mismatched coin/CTA color.
export type Ra2ThemeId = "midnight-blue" | "royal-purple" | "emerald" | "crimson" | "graphite-gold";
export type CoinMetal = "gold" | "silver" | "rose-gold" | "bronze";

export interface Ra2Theme {
  id: Ra2ThemeId;
  label: string;
  background: string;
  glow: string;
  candleColors: [string, string, string, string];
  ctaGradient: string;
  ctaGlow: string;
  ctaTextColor: string;
  accentText: string;
  accentGlow: string;
  coin: CoinMetal;
  swatch: string;
}

export const RA2_THEMES: Record<Ra2ThemeId, Ra2Theme> = {
  "midnight-blue": {
    id: "midnight-blue",
    label: "Midnight Blue",
    background: "linear-gradient(150deg, #030711 0%, #06153a 38%, #0c2d6e 68%, #1457c9 100%)",
    glow: "rgba(56,189,248,0.35)",
    candleColors: [
      "linear-gradient(180deg,#22d3ee,#0ea5e9)",
      "linear-gradient(180deg,#34d399,#059669)",
      "linear-gradient(180deg,#60a5fa,#2563eb)",
      "linear-gradient(180deg,#34d399,#0f766e)",
    ],
    ctaGradient: "linear-gradient(90deg,#22d3ee,#3b82f6)",
    ctaGlow: "rgba(56,189,248,0.65)",
    ctaTextColor: "#020617",
    accentText: "#67e8f9",
    accentGlow: "rgba(34,211,238,0.6)",
    coin: "gold",
    swatch: "linear-gradient(135deg,#06153a,#1457c9)",
  },
  "royal-purple": {
    id: "royal-purple",
    label: "Royal Purple",
    background: "linear-gradient(150deg, #0a0518 0%, #1e0a45 38%, #4c1d95 68%, #7c3aed 100%)",
    glow: "rgba(196,153,255,0.35)",
    candleColors: [
      "linear-gradient(180deg,#c084fc,#a855f7)",
      "linear-gradient(180deg,#f0abfc,#d946ef)",
      "linear-gradient(180deg,#818cf8,#6366f1)",
      "linear-gradient(180deg,#e879f9,#a21caf)",
    ],
    ctaGradient: "linear-gradient(90deg,#e879f9,#8b5cf6)",
    ctaGlow: "rgba(196,153,255,0.65)",
    ctaTextColor: "#1e0b33",
    accentText: "#e9d5ff",
    accentGlow: "rgba(216,180,254,0.6)",
    coin: "rose-gold",
    swatch: "linear-gradient(135deg,#1e0a45,#7c3aed)",
  },
  emerald: {
    id: "emerald",
    label: "Emerald Green",
    background: "linear-gradient(150deg, #030c09 0%, #04241a 38%, #065f46 68%, #10b981 100%)",
    glow: "rgba(110,231,183,0.35)",
    candleColors: [
      "linear-gradient(180deg,#6ee7b7,#10b981)",
      "linear-gradient(180deg,#5eead4,#0d9488)",
      "linear-gradient(180deg,#a3e635,#65a30d)",
      "linear-gradient(180deg,#34d399,#047857)",
    ],
    ctaGradient: "linear-gradient(90deg,#6ee7b7,#059669)",
    ctaGlow: "rgba(110,231,183,0.65)",
    ctaTextColor: "#022c22",
    accentText: "#6ee7b7",
    accentGlow: "rgba(110,231,183,0.6)",
    coin: "gold",
    swatch: "linear-gradient(135deg,#04241a,#10b981)",
  },
  crimson: {
    id: "crimson",
    label: "Crimson Red",
    background: "linear-gradient(150deg, #120309 0%, #3b0a1c 38%, #7f1d3a 68%, #e11d48 100%)",
    glow: "rgba(251,113,133,0.35)",
    candleColors: [
      "linear-gradient(180deg,#fca5a5,#f43f5e)",
      "linear-gradient(180deg,#fdba74,#ea580c)",
      "linear-gradient(180deg,#fb7185,#be123c)",
      "linear-gradient(180deg,#fda4af,#9f1239)",
    ],
    ctaGradient: "linear-gradient(90deg,#fda4af,#e11d48)",
    ctaGlow: "rgba(251,113,133,0.65)",
    ctaTextColor: "#2a0510",
    accentText: "#fda4af",
    accentGlow: "rgba(251,113,133,0.6)",
    coin: "silver",
    swatch: "linear-gradient(135deg,#3b0a1c,#e11d48)",
  },
  "graphite-gold": {
    id: "graphite-gold",
    label: "Graphite Gold",
    background: "linear-gradient(150deg, #050505 0%, #171410 38%, #332a13 68%, #a8791f 100%)",
    glow: "rgba(251,191,36,0.3)",
    candleColors: [
      "linear-gradient(180deg,#fde68a,#d97706)",
      "linear-gradient(180deg,#e5e7eb,#9ca3af)",
      "linear-gradient(180deg,#fcd34d,#b45309)",
      "linear-gradient(180deg,#d6d3d1,#78716c)",
    ],
    ctaGradient: "linear-gradient(90deg,#fde68a,#d97706)",
    ctaGlow: "rgba(251,191,36,0.65)",
    ctaTextColor: "#1c1408",
    accentText: "#fcd34d",
    accentGlow: "rgba(251,191,36,0.6)",
    coin: "gold",
    swatch: "linear-gradient(135deg,#171410,#a8791f)",
  },
};

export const RA2_THEME_LIST = Object.values(RA2_THEMES);

// Default coin finish (used when the poster has no custom coin image) —
// keyed by the theme's `coin` field so it stays on-brand automatically.
export const COIN_METAL_STYLES: Record<CoinMetal, { face: string; ring: string; glyph: string }> = {
  gold: {
    face: "radial-gradient(circle at 35% 28%, #fff6d6 0%, #f4cf5e 20%, #d9a234 45%, #a9701a 72%, #6b430c 100%)",
    ring: "rgba(107,67,12,0.55)",
    glyph: "#5c3a08",
  },
  silver: {
    face: "radial-gradient(circle at 35% 28%, #ffffff 0%, #e5e9ee 20%, #b6bfc9 45%, #838d99 72%, #4a5058 100%)",
    ring: "rgba(58,64,71,0.55)",
    glyph: "#3a4047",
  },
  "rose-gold": {
    face: "radial-gradient(circle at 35% 28%, #fff0ea 0%, #f6cdbd 20%, #e2a48c 45%, #b96e56 72%, #7a4432 100%)",
    ring: "rgba(96,58,42,0.55)",
    glyph: "#5c3324",
  },
  bronze: {
    face: "radial-gradient(circle at 35% 28%, #f3d9b0 0%, #cf9c58 20%, #a9702f 45%, #7a4d1c 72%, #4a2e10 100%)",
    ring: "rgba(66,40,12,0.55)",
    glyph: "#3d2409",
  },
};
