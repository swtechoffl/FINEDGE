import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAnchoredPopoverPosition } from "../../lib/useAnchoredPopover";
import { MOOD_IMAGES, type MarketMood } from "./MarketMoodMotif";
import type {
  IndexOiOverride,
  IndexOverride,
  MoverOverride,
  PostMarketSummaryOverride,
} from "./usePostMarketSummaryOverrides";

const PANEL_WIDTH = 320;

const MOOD_OPTIONS: { key: MarketMood | null; label: string }[] = [
  { key: null, label: "Auto" },
  { key: "bull", label: "Bull" },
  { key: "bear", label: "Bear" },
  { key: "neutral", label: "Neutral" },
  { key: "flat", label: "Flat" },
];

interface IndexLive {
  price: number;
  change: number;
  changePct: number;
}

// Editable as strings so a field can sit empty (= "use live data") without
// fighting a number input's own parsing/formatting.
interface IndexDraft {
  price: string;
  change: string;
  changePct: string;
}

interface MoverDraft {
  symbol: string;
  changePct: string;
}

interface OiDraft {
  finnifty: string;
  nifty: string;
  niftyNxt50: string;
  bankNifty: string;
}

function toDraft(override: IndexOverride | undefined): IndexDraft {
  return {
    price: override?.price?.toString() ?? "",
    change: override?.change?.toString() ?? "",
    changePct: override?.changePct?.toString() ?? "",
  };
}

function toOverride(draft: IndexDraft): IndexOverride | undefined {
  const price = draft.price.trim() === "" ? undefined : Number(draft.price);
  const change = draft.change.trim() === "" ? undefined : Number(draft.change);
  const changePct = draft.changePct.trim() === "" ? undefined : Number(draft.changePct);
  if (price === undefined && change === undefined && changePct === undefined) return undefined;
  return {
    ...(price !== undefined && !Number.isNaN(price) ? { price } : {}),
    ...(change !== undefined && !Number.isNaN(change) ? { change } : {}),
    ...(changePct !== undefined && !Number.isNaN(changePct) ? { changePct } : {}),
  };
}

function toMoverDraft(values?: MoverOverride[]): MoverDraft[] {
  return Array.from({ length: 5 }, (_, index) => ({
    symbol: values?.[index]?.symbol ?? "",
    changePct: values?.[index]?.changePct?.toString() ?? "",
  }));
}

function toMoverOverride(values: MoverDraft[]): MoverOverride[] | undefined {
  const rows = values.flatMap((row) => {
    const symbol = row.symbol.trim().toUpperCase();
    const changePct = Number(row.changePct);
    return symbol && row.changePct.trim() !== "" && Number.isFinite(changePct) ? [{ symbol, changePct }] : [];
  });
  return rows.length ? rows : undefined;
}

function toOiDraft(value?: IndexOiOverride): OiDraft {
  return {
    finnifty: value?.finnifty?.toString() ?? "",
    nifty: value?.nifty?.toString() ?? "",
    niftyNxt50: value?.niftyNxt50?.toString() ?? "",
    bankNifty: value?.bankNifty?.toString() ?? "",
  };
}

function toOiOverride(draft: OiDraft): IndexOiOverride | undefined {
  const result: IndexOiOverride = {};
  for (const key of Object.keys(draft) as (keyof OiDraft)[]) {
    const value = draft[key].trim();
    if (value !== "" && Number.isFinite(Number(value))) result[key] = Number(value);
  }
  return Object.keys(result).length ? result : undefined;
}

function MoversOverrideRows({
  label,
  values,
  onChange,
}: {
  label: string;
  values: MoverDraft[];
  onChange: (values: MoverDraft[]) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex flex-col gap-1.5">
        {values.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_90px] gap-2">
            <Input
              placeholder={`Stock ${index + 1}`}
              value={row.symbol}
              onChange={(e) => onChange(values.map((item, i) => (i === index ? { ...item, symbol: e.target.value } : item)))}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Change %"
              value={row.changePct}
              onChange={(e) =>
                onChange(values.map((item, i) => (i === index ? { ...item, changePct: e.target.value } : item)))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function IndexOverrideRow({
  label,
  live,
  draft,
  onChange,
}: {
  label: string;
  live: IndexLive | null;
  draft: IndexDraft;
  onChange: (draft: IndexDraft) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
        {live && (
          <span className="ml-1 font-normal text-subtle-foreground">
            (live: {live.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}, {live.change >= 0 ? "+" : ""}
            {live.change} / {live.changePct >= 0 ? "+" : ""}
            {live.changePct}%)
          </span>
        )}
      </label>
      <div className="grid grid-cols-3 gap-2">
        <Input
          type="number"
          placeholder="Level"
          value={draft.price}
          onChange={(e) => onChange({ ...draft, price: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Points"
          value={draft.change}
          onChange={(e) => onChange({ ...draft, change: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Change %"
          value={draft.changePct}
          onChange={(e) => onChange({ ...draft, changePct: e.target.value })}
        />
      </div>
    </div>
  );
}

export function PostMarketSummaryEditor({
  titleLine1,
  titleLine2,
  subtitle,
  moodOverride,
  nifty,
  sensex,
  bankNifty,
  niftyOverride,
  sensexOverride,
  bankNiftyOverride,
  gainersOverride,
  losersOverride,
  indexOiOverride,
  hasOverride,
  onChange,
  onReset,
}: {
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  moodOverride: MarketMood | null;
  nifty: IndexLive | null;
  sensex: IndexLive | null;
  bankNifty: IndexLive | null;
  niftyOverride?: IndexOverride;
  sensexOverride?: IndexOverride;
  bankNiftyOverride?: IndexOverride;
  gainersOverride?: MoverOverride[];
  losersOverride?: MoverOverride[];
  indexOiOverride?: IndexOiOverride;
  hasOverride: boolean;
  onChange: (patch: PostMarketSummaryOverride) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    titleLine1,
    titleLine2,
    subtitle,
    moodOverride,
    nifty: toDraft(niftyOverride),
    sensex: toDraft(sensexOverride),
    bankNifty: toDraft(bankNiftyOverride),
    gainers: toMoverDraft(gainersOverride),
    losers: toMoverDraft(losersOverride),
    indexOi: toOiDraft(indexOiOverride),
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const position = useAnchoredPopoverPosition(open, buttonRef, PANEL_WIDTH);

  function openEditor() {
    setDraft({
      titleLine1,
      titleLine2,
      subtitle,
      moodOverride,
      nifty: toDraft(niftyOverride),
      sensex: toDraft(sensexOverride),
      bankNifty: toDraft(bankNiftyOverride),
      gainers: toMoverDraft(gainersOverride),
      losers: toMoverDraft(losersOverride),
      indexOi: toOiDraft(indexOiOverride),
    });
    setOpen(true);
  }

  function handleSave() {
    onChange({
      titleLine1: draft.titleLine1,
      titleLine2: draft.titleLine2,
      subtitle: draft.subtitle,
      moodOverride: draft.moodOverride,
      nifty: toOverride(draft.nifty),
      sensex: toOverride(draft.sensex),
      bankNifty: toOverride(draft.bankNifty),
      gainers: toMoverOverride(draft.gainers),
      losers: toMoverOverride(draft.losers),
      indexOi: toOiOverride(draft.indexOi),
    });
    setOpen(false);
  }

  return (
    <>
      <Button ref={buttonRef} variant="outline" size="sm" onClick={openEditor} className="w-full">
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Title line 1</label>
                    <Input
                      value={draft.titleLine1}
                      onChange={(e) => setDraft((d) => ({ ...d, titleLine1: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Title line 2</label>
                    <Input
                      value={draft.titleLine2}
                      onChange={(e) => setDraft((d) => ({ ...d, titleLine2: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Subtitle</label>
                  <Input value={draft.subtitle} onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Bull / bear artwork</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {MOOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setDraft((d) => ({ ...d, moodOverride: opt.key }))}
                        className={`focus-ring flex flex-col items-center gap-1 rounded-lg border-2 p-1 ${
                          draft.moodOverride === opt.key ? "border-accent" : "border-transparent"
                        }`}
                        title={opt.label}
                      >
                        {opt.key === null ? (
                          <div className="flex h-8 w-full items-center justify-center rounded bg-surface-2 text-[9px] font-bold text-muted-foreground">
                            Auto
                          </div>
                        ) : (
                          <img src={MOOD_IMAGES[opt.key]} alt={opt.label} className="h-8 w-full rounded object-cover" />
                        )}
                        <span className="text-[9px] font-medium text-muted-foreground">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <span className="text-xs font-semibold text-foreground">Index levels (manual override)</span>
                  <p className="-mt-1 text-[10px] text-subtle-foreground">
                    Leave blank to use live data. Fill in if the feed's change% looks wrong.
                  </p>
                  <IndexOverrideRow
                    label="Nifty 50"
                    live={nifty}
                    draft={draft.nifty}
                    onChange={(v) => setDraft((d) => ({ ...d, nifty: v }))}
                  />
                  <IndexOverrideRow
                    label="Sensex"
                    live={sensex}
                    draft={draft.sensex}
                    onChange={(v) => setDraft((d) => ({ ...d, sensex: v }))}
                  />
                  <IndexOverrideRow
                    label="Bank Nifty"
                    live={bankNifty}
                    draft={draft.bankNifty}
                    onChange={(v) => setDraft((d) => ({ ...d, bankNifty: v }))}
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-3">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Top movers (manual override)</span>
                    <p className="text-[10px] text-subtle-foreground">Leave every row blank to use Yahoo Finance data.</p>
                  </div>
                  <MoversOverrideRows
                    label="Top gainers"
                    values={draft.gainers}
                    onChange={(values) => setDraft((d) => ({ ...d, gainers: values }))}
                  />
                  <MoversOverrideRows
                    label="Top losers"
                    values={draft.losers}
                    onChange={(values) => setDraft((d) => ({ ...d, losers: values }))}
                  />
                </div>

                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Index futures OI change (manual override)</span>
                    <p className="text-[10px] text-subtle-foreground">Enter percentages; leave blank to use the NSE feed.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["finnifty", "FinNifty"],
                        ["nifty", "Nifty"],
                        ["niftyNxt50", "Nifty Next 50"],
                        ["bankNifty", "Bank Nifty"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{label}</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="OI change %"
                          value={draft.indexOi[key]}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, indexOi: { ...d.indexOi, [key]: e.target.value } }))
                          }
                        />
                      </div>
                    ))}
                  </div>
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
