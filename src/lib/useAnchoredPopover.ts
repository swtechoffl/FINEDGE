import { useEffect, useState, type RefObject } from "react";

export interface AnchoredPopoverPosition {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

// Positions a `position: fixed` popover relative to its trigger button,
// clamped to the viewport on both axes. A fixed-position element anchored
// with only `top: rect.bottom + 8` can end up below `window.innerHeight`
// whenever the trigger sits far down a tall page — and since it's fixed
// (not part of document flow), no amount of scrolling brings it back into
// view. This picks whichever side (below/above the button) has more room
// and anchors from that side instead, so the panel is always reachable.
export function useAnchoredPopoverPosition(
  open: boolean,
  buttonRef: RefObject<HTMLElement | null>,
  panelWidth: number,
) {
  const [position, setPosition] = useState<AnchoredPopoverPosition | null>(null);

  useEffect(() => {
    if (!open) return;
    function update() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8));
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;

      if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
        setPosition({ left, top: rect.bottom + 8, maxHeight: Math.max(160, spaceBelow) });
      } else {
        setPosition({ left, bottom: window.innerHeight - rect.top + 8, maxHeight: Math.max(160, spaceAbove) });
      }
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, buttonRef, panelWidth]);

  return position;
}
