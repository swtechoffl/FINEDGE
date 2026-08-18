export interface GradientPreset {
  id: string;
  label: string;
  value: string;
}

// Curated on-brand-adjacent gradients spanning a wide mood range — dark,
// moody finance tones through to bright editorial ones — so most niches
// (market wraps, IPO hype, macro takes) find a fit without a custom color.
export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "midnight", label: "Midnight", value: "linear-gradient(160deg, #0f172a 0%, #000000 100%)" },
  { id: "emerald", label: "Emerald", value: "linear-gradient(160deg, #059669 0%, #022c22 100%)" },
  { id: "sapphire", label: "Sapphire", value: "linear-gradient(160deg, #1e3a8a 0%, #020617 100%)" },
  { id: "sunset", label: "Sunset", value: "linear-gradient(160deg, #f97316 0%, #7c2d12 100%)" },
  { id: "orchid", label: "Orchid", value: "linear-gradient(160deg, #a855f7 0%, #1e0a3c 100%)" },
  { id: "rose", label: "Rose", value: "linear-gradient(160deg, #e11d48 0%, #1a0509 100%)" },
  { id: "amber", label: "Amber", value: "linear-gradient(160deg, #d97706 0%, #1c0f02 100%)" },
  { id: "ocean", label: "Ocean", value: "linear-gradient(160deg, #0891b2 0%, #041c24 100%)" },
  { id: "slate", label: "Slate", value: "linear-gradient(160deg, #334155 0%, #0b0f19 100%)" },
  { id: "mono", label: "Mono", value: "linear-gradient(160deg, #27272a 0%, #000000 100%)" },
  { id: "candy", label: "Candy", value: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 55%, #3b82f6 100%)" },
  { id: "citrus", label: "Citrus", value: "linear-gradient(135deg, #facc15 0%, #16a34a 100%)" },
];

export const SOLID_PRESETS: string[] = [
  "#09090b",
  "#111827",
  "#0f172a",
  "#052e1f",
  "#0c4a6e",
  "#3f0d1a",
  "#1f2937",
  "#f8fafc",
];

export const TEXT_COLOR_PRESETS: string[] = ["#ffffff", "#f8fafc", "#facc15", "#34d399", "#38bdf8", "#f472b6", "#09090b"];

export interface BlendModeOption {
  id: import("./useCarouselDeck").BlendMode;
  label: string;
}

// Blend modes worth surfacing for the blended-image layer — each lets the
// slide's background gradient/color tint the photo instead of it sitting on
// top as a flat cutout. "Normal" is included for a plain framed photo.
export const BLEND_MODE_PRESETS: BlendModeOption[] = [
  { id: "normal", label: "Normal" },
  { id: "luminosity", label: "Luminosity" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
  { id: "soft-light", label: "Soft Light" },
];

export interface FadeEdgeOption {
  id: import("./useCarouselDeck").FadeEdge;
  label: string;
}

// Multi-select — any combination fades that many edges into the background
// (e.g. top+left vignettes a corner). "None" is handled separately in the
// UI by clearing the selection rather than being a preset itself.
export const FADE_EDGE_PRESETS: FadeEdgeOption[] = [
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];
