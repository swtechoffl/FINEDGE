import { Square, RectangleVertical, RectangleHorizontal, Smartphone, type LucideIcon } from "lucide-react";

export type CarouselFormatId = "square" | "portrait" | "landscape" | "story";

export interface CarouselFormat {
  id: CarouselFormatId;
  label: string;
  sublabel: string;
  ratio: number; // width / height
  // Export target in px — Instagram/Threads render every feed & story format
  // off a 1080px-wide source, only the height changes with aspect ratio.
  exportWidth: number;
  exportHeight: number;
  icon: LucideIcon;
}

// Current Instagram/Threads recommended media sizes (shared spec — Threads
// rides on Instagram's media pipeline). Feed formats top out at 1080px wide;
// Stories/Reels-style verticals are 1080x1920.
export const CAROUSEL_FORMATS: CarouselFormat[] = [
  { id: "square", label: "Square", sublabel: "1:1 · 1080×1080", ratio: 1, exportWidth: 1080, exportHeight: 1080, icon: Square },
  {
    id: "portrait",
    label: "Portrait",
    sublabel: "4:5 · 1080×1350",
    ratio: 4 / 5,
    exportWidth: 1080,
    exportHeight: 1350,
    icon: RectangleVertical,
  },
  {
    id: "landscape",
    label: "Landscape",
    sublabel: "1.91:1 · 1080×566",
    ratio: 1.91,
    exportWidth: 1080,
    exportHeight: 566,
    icon: RectangleHorizontal,
  },
  {
    id: "story",
    label: "Story",
    sublabel: "9:16 · 1080×1920",
    ratio: 9 / 16,
    exportWidth: 1080,
    exportHeight: 1920,
    icon: Smartphone,
  },
];

export function formatById(id: CarouselFormatId): CarouselFormat {
  return CAROUSEL_FORMATS.find((f) => f.id === id) ?? CAROUSEL_FORMATS[0];
}
