import { useState } from "react";
import { GRADIENT_PRESETS } from "./carouselPresets";
import { CAROUSEL_FORMATS, type CarouselFormatId } from "./carouselFormats";
import type { PaginationStyleId } from "./carouselPagination";

export type SlideBackground =
  | { type: "gradient"; value: string }
  | { type: "color"; value: string }
  | { type: "image"; value: string; overlay: number };

// A blend mode of "normal" with fade off is just an inset photo; the useful
// cases are the ones that let the background gradient/color show through the
// image (multiply/screen/overlay/luminosity/soft-light) so a plain photo
// picks up the slide's palette instead of sitting on top of it as a flat cutout.
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "luminosity" | "soft-light";

// Edges the image can fade from into the slide's background. Any number of
// these can be combined — e.g. top+left fades both edges into a vignetted
// corner — an empty array means a hard rectangular photo with no fade.
export type FadeEdge = "top" | "bottom" | "left" | "right";

export interface SlideImage {
  value: string;
  blend: BlendMode;
  opacity: number; // 0-100
  scale: number; // 100 = fills the frame at 1x; >100 zooms in, <100 zooms out
  fadeEdges: FadeEdge[];
  // Pan from center, as a percentage of the frame's own width/height —
  // dragging the photo in the preview updates these; 0,0 is centered.
  offsetX: number;
  offsetY: number;
}

export type FontWeight = "normal" | "semibold" | "bold" | "extrabold";

export interface CarouselSlide {
  id: string;
  eyebrow: string;
  heading: string;
  body: string;
  background: SlideBackground;
  image: SlideImage | null;
  fontId: string;
  // Multipliers on top of the width-relative base size, so text scales with
  // the export resolution the same way the rest of the slide does — 100 is
  // the default size, <100 shrinks, >100 enlarges.
  headingSize: number;
  bodySize: number;
  headingWeight: FontWeight;
  textColor: string;
  align: "left" | "center";
  showLogo: boolean;
  disclaimer: string;
}

let seq = 0;
function newId() {
  seq += 1;
  return `slide-${Date.now()}-${seq}`;
}

// Compliance fine-print is carried into new slides by default (a financial
// carousel typically needs it on every slide) — everything else here is a
// creative choice worth repeating for consistency but easy to override.
type StyleCarry = Pick<
  CarouselSlide,
  "background" | "fontId" | "headingSize" | "bodySize" | "headingWeight" | "textColor" | "align" | "showLogo" | "disclaimer"
>;

function makeSlide(overrides?: Partial<CarouselSlide>): CarouselSlide {
  return {
    id: newId(),
    eyebrow: "",
    heading: "",
    body: "",
    background: { type: "gradient", value: GRADIENT_PRESETS[0].value },
    image: null,
    fontId: "inter",
    headingSize: 100,
    bodySize: 100,
    headingWeight: "extrabold",
    textColor: "#ffffff",
    align: "left",
    showLogo: true,
    disclaimer: "",
    ...overrides,
  };
}

export function useCarouselDeck() {
  const [slides, setSlides] = useState<CarouselSlide[]>(() => [
    makeSlide({
      eyebrow: "SLIDE 1",
      heading: "Your big idea here",
      body: "Add a short supporting line to hook your audience, then swipe through the rest of the story.",
    }),
  ]);
  const [current, setCurrent] = useState(0);
  const [format, setFormat] = useState<CarouselFormatId>(CAROUSEL_FORMATS[1].id);
  const [paginationStyle, setPaginationStyle] = useState<PaginationStyleId>("dots");
  const [showSlideNumber, setShowSlideNumber] = useState(true);
  const [slideNumberOpacity, setSlideNumberOpacity] = useState(9);
  // Lets the carousel use its own logo/name instead of the Posters page's
  // shared report branding — null/empty means "fall back to that branding".
  const [logoOverride, setLogoOverride] = useState<string | null>(null);
  const [nameOverride, setNameOverride] = useState("");

  function carryStyle(slide: CarouselSlide | undefined): StyleCarry | undefined {
    if (!slide) return undefined;
    const { background, fontId, headingSize, bodySize, headingWeight, textColor, align, showLogo, disclaimer } = slide;
    return { background, fontId, headingSize, bodySize, headingWeight, textColor, align, showLogo, disclaimer };
  }

  function addSlide() {
    setSlides((prev) => [...prev, makeSlide(carryStyle(prev[prev.length - 1]))]);
    setCurrent(slides.length);
  }

  function duplicateSlide(id: string) {
    setSlides((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const copy: CarouselSlide = { ...prev[idx], id: newId() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      setCurrent(idx + 1);
      return next;
    });
  }

  function removeSlide(id: string) {
    setSlides((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((s) => s.id === id);
      const next = prev.filter((s) => s.id !== id);
      setCurrent((c) => Math.min(idx === -1 ? c : idx, next.length - 1));
      return next;
    });
  }

  function reorderSlide(fromId: string, toId: string) {
    if (fromId === toId) return;
    setSlides((prev) => {
      const fromIdx = prev.findIndex((s) => s.id === fromId);
      const toIdx = prev.findIndex((s) => s.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setCurrent(next.findIndex((s) => s.id === fromId));
      return next;
    });
  }

  function updateSlide(id: string, patch: Partial<CarouselSlide>) {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return {
    slides,
    current,
    setCurrent,
    format,
    setFormat,
    paginationStyle,
    setPaginationStyle,
    showSlideNumber,
    setShowSlideNumber,
    slideNumberOpacity,
    setSlideNumberOpacity,
    logoOverride,
    setLogoOverride,
    nameOverride,
    setNameOverride,
    addSlide,
    duplicateSlide,
    removeSlide,
    reorderSlide,
    updateSlide,
  };
}
