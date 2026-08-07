import { useLayoutEffect, useRef, useState } from "react";

// Measures a frame's true content height and, if it exceeds the natural
// aspect-ratio sizing at `width`, returns an explicit height override that
// grows the frame instead of clipping — same reasoning as IPO Watch's
// useAutoGrowHeight, generalized to any aspect ratio (not just 9:16) so
// both the narrow product posters and the wider dashboard-style poster can
// share it.
export function useFitHeight(width: number, aspectW = 9, aspectH = 16) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const needed = el.scrollHeight;
    const natural = (width * aspectH) / aspectW;
    // Always at least the natural aspect height — content shorter than
    // that should still fill the frame (flex centering handles the extra
    // space), not shrink it. Only grows further when content overflows.
    const next = Math.max(natural, needed);
    setHeight((prev) => (prev === next ? prev : next));
  });

  return { measureRef, height };
}
