import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAnchoredPopoverPosition } from "../../lib/useAnchoredPopover";
import type { MarketingPosterTemplate } from "./marketingPosterTemplates";
import type { MarketingPosterOverride } from "./useMarketingPosterOverrides";

const PANEL_WIDTH = 320;

// A handful of on-brand swatches plus a native color picker for anything
// else — most edits will just be "make it feel like our brand", not a
// bespoke hex value.
const COLOR_SWATCHES = ["#1447e6", "#15803d", "#0e7490", "#c2410c", "#7e22ce", "#be123c", "#0f766e", "#334155"];

export function MarketingPosterEditor({
  template,
  hasOverride,
  onChange,
  onReset,
  triggerClassName,
}: {
  template: MarketingPosterTemplate;
  hasOverride: boolean;
  onChange: (patch: MarketingPosterOverride) => void;
  onReset: () => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(template);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const position = useAnchoredPopoverPosition(open, buttonRef, PANEL_WIDTH);

  function openEditor() {
    setDraft(template);
    setOpen(true);
  }

  function setFeature(index: number, value: string) {
    setDraft((d) => ({ ...d, features: d.features.map((f, i) => (i === index ? value : f)) }));
  }

  function handleSave() {
    onChange({
      color: draft.color,
      kicker: draft.kicker,
      heroText: draft.heroText,
      heroSize: draft.heroSize,
      heroSub: draft.heroSub,
      features: draft.features,
      cta: draft.cta,
    });
    setOpen(false);
  }

  return (
    <>
      <Button ref={buttonRef} variant="outline" size="sm" onClick={openEditor} className={triggerClassName}>
        <Pencil size={13} />
        <span>Edit</span>
      </Button>

      {open &&
        position &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="animate-scale-in fixed z-50 max-w-[calc(100vw-2.5rem)] origin-top overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg"
              style={{
                top: position.top,
                bottom: position.bottom,
                left: position.left,
                width: PANEL_WIDTH,
                maxHeight: position.maxHeight,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Edit Poster</span>
                <button
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-foreground"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Color</label>
                  <div className="flex items-center gap-1.5">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setDraft((d) => ({ ...d, color: c }))}
                        className={`focus-ring h-6 w-6 shrink-0 rounded-full border-2 ${draft.color === c ? "border-foreground" : "border-transparent"}`}
                        style={{ background: c }}
                        aria-label={`Use ${c}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={draft.color}
                      onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                      className="h-6 w-6 shrink-0 cursor-pointer rounded-full border border-border bg-transparent p-0"
                      title="Custom color"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Kicker label</label>
                  <Input value={draft.kicker} onChange={(e) => setDraft((d) => ({ ...d, kicker: e.target.value }))} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Hero stat</label>
                    <Input
                      value={draft.heroText}
                      onChange={(e) => setDraft((d) => ({ ...d, heroText: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Size</label>
                    <Input
                      type="number"
                      min={20}
                      max={72}
                      value={draft.heroSize}
                      onChange={(e) => setDraft((d) => ({ ...d, heroSize: Number(e.target.value) || d.heroSize }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Hero subtitle</label>
                  <Input
                    value={draft.heroSub}
                    onChange={(e) => setDraft((d) => ({ ...d, heroSub: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Features</label>
                  <div className="flex flex-col gap-2">
                    {draft.features.map((f, i) => (
                      <Input key={i} value={f} onChange={(e) => setFeature(i, e.target.value)} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">CTA button text</label>
                  <Input value={draft.cta} onChange={(e) => setDraft((d) => ({ ...d, cta: e.target.value }))} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    onReset();
                    setOpen(false);
                  }}
                  disabled={!hasOverride}
                  className="focus-ring flex items-center gap-1 text-xs font-medium text-subtle-foreground hover:text-bearish disabled:opacity-40"
                >
                  <RotateCcw size={12} /> Reset to default
                </button>
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
