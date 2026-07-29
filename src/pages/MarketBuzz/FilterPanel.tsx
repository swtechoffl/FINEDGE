import { useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { CollapsibleSection } from "./CollapsibleSection";
import { SectorHeatMap } from "./SectorHeatMap";
import { SECTORS, CATEGORIES, SOURCES } from "../../data/mock";
import type { NewsItem, Signal } from "../../types";
import { IMPACT_LEVELS, type FilterState, type TimelineWindow } from "./types";
import { cn } from "../../lib/utils";
import { Checkbox as CheckboxUI } from "../../components/ui/Checkbox";
import { Switch } from "../../components/ui/Switch";
import { Badge } from "../../components/ui/Badge";

const SIGNAL_SWATCH: { key: Signal; label: string; className: string }[] = [
  { key: "bullish", label: "Bullish", className: "bg-bullish" },
  { key: "neutral", label: "Neutral", className: "bg-neutral" },
  { key: "bearish", label: "Bearish", className: "bg-bearish" },
];

const TIMELINES: TimelineWindow[] = ["1H", "6H", "12H", "24H", "7D"];

function Checkbox({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-hover">
      <CheckboxUI checked={checked} onCheckedChange={onChange} />
      <span className="flex-1 truncate text-foreground">{label}</span>
      {count !== undefined && <span className="text-xs text-subtle-foreground">{count}</span>}
    </label>
  );
}

function StockSectorGroup({
  sector,
  selected,
  onToggle,
}: {
  sector: (typeof SECTORS)[number];
  selected: string[];
  onToggle: (symbol: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedCount = sector.stocks.filter((s) => selected.includes(s.symbol)).length;

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="focus-ring flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-hover"
      >
        <ChevronRight
          size={14}
          className={cn(
            "shrink-0 text-subtle-foreground transition-transform duration-150",
            expanded && "rotate-90",
          )}
        />
        <span className="flex-1 truncate font-medium text-foreground">{sector.name}</span>
        <Badge>
          {selectedCount > 0 ? `${selectedCount}/` : ""}
          {sector.stocks.length}
        </Badge>
      </button>
      {expanded && (
        <div className="ml-5 flex flex-col">
          {sector.stocks.map((s) => (
            <Checkbox
              key={s.symbol}
              checked={selected.includes(s.symbol)}
              onChange={() => onToggle(s.symbol)}
              label={`${s.symbol} — ${s.name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterPanel({
  filters,
  setFilters,
  allNews,
  mobileOpen = false,
  onMobileClose,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  allNews: NewsItem[];
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const [stockSearch, setStockSearch] = useState("");

  const filteredSectors = useMemo(() => {
    if (!stockSearch.trim()) return SECTORS;
    const q = stockSearch.toLowerCase();
    return SECTORS.map((s) => ({
      ...s,
      stocks: s.stocks.filter(
        (st) => st.symbol.toLowerCase().includes(q) || st.name.toLowerCase().includes(q),
      ),
    })).filter((s) => s.stocks.length > 0);
  }, [stockSearch]);

  const toggleInArray = (key: "stocks" | "categories" | "sources", value: string) => {
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  };

  return (
    <>
      {/* Mobile-only backdrop — the panel itself is always in the DOM (so
          desktop's `lg:` styles just override back to the normal sticky
          sidebar), only the backdrop/slide behavior is mobile-specific. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-80 max-w-[85vw] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface px-4 py-4 shadow-xl transition-transform duration-300 ease-[var(--ease-out-expo)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-[73px] lg:z-auto lg:h-[calc(100vh-73px)] lg:max-w-none lg:translate-x-0 lg:shadow-none",
        )}
      >
        <div className="mb-2 flex items-center justify-between lg:hidden">
          <span className="text-sm font-bold text-foreground">Filters</span>
          <button
            onClick={onMobileClose}
            className="focus-ring rounded-full p-1.5 text-subtle-foreground hover:bg-hover hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <CollapsibleSection title="Focus" accent defaultOpen>
        <div className="flex flex-col gap-4">
          {/* Stocks */}
          <div>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Stocks</div>
            <div className="focus-within:ring-ring/50 mb-2 flex items-center gap-2 rounded-full border border-border bg-app px-3 py-1.5 transition-shadow duration-150 focus-within:ring-4">
              <Search size={14} className="shrink-0 text-subtle-foreground" />
              <input
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredSectors.map((sector) => (
                <StockSectorGroup
                  key={sector.name}
                  sector={sector}
                  selected={filters.stocks}
                  onToggle={(sym) => toggleInArray("stocks", sym)}
                />
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Category</div>
            <div className="max-h-40 overflow-y-auto">
              {CATEGORIES.map((c) => (
                <Checkbox
                  key={c}
                  checked={filters.categories.includes(c)}
                  onChange={() => toggleInArray("categories", c)}
                  label={c}
                />
              ))}
            </div>
          </div>

          {/* Sources */}
          <div>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Sources</div>
            <div className="max-h-40 overflow-y-auto">
              {SOURCES.map((s) => (
                <Checkbox
                  key={s}
                  checked={filters.sources.includes(s)}
                  onChange={() => toggleInArray("sources", s)}
                  label={s}
                />
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* My Playground Stocks */}
      <div className="flex items-center justify-between border-b border-border py-3">
        <span className="text-sm font-bold text-foreground">My Playground Stocks</span>
        <Switch
          checked={filters.playgroundOnly}
          onCheckedChange={(checked) => setFilters((f) => ({ ...f, playgroundOnly: checked }))}
        />
      </div>

      {/* Signal Filter */}
      <CollapsibleSection title="Signal Filter" defaultOpen>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilters((f) => ({ ...f, signal: "all" }))}
            className={cn(
              "focus-ring rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150",
              filters.signal === "all" ? "bg-accent-bg text-accent" : "bg-chip text-muted-foreground hover:bg-hover",
            )}
          >
            All Signals
          </button>
          {SIGNAL_SWATCH.map((s) => (
            <button
              key={s.key}
              title={s.label}
              onClick={() => setFilters((f) => ({ ...f, signal: f.signal === s.key ? "all" : s.key }))}
              className={cn(
                "focus-ring flex h-6 w-6 items-center justify-center rounded-full border-2 transition-transform duration-150 hover:scale-110",
                s.className,
                filters.signal === s.key ? "border-foreground" : "border-transparent",
              )}
            />
          ))}
        </div>
      </CollapsibleSection>

      {/* Impact Filter */}
      <CollapsibleSection title="Impact Filter" defaultOpen>
        <div className="px-1">
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={filters.minImpactIndex}
            onChange={(e) => setFilters((f) => ({ ...f, minImpactIndex: Number(e.target.value) }))}
            className="focus-ring h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border-strong accent-accent"
          />
          <div className="mt-1.5 flex justify-between text-[11px]">
            {IMPACT_LEVELS.map((lvl, i) => (
              <span
                key={lvl}
                className={cn(
                  "capitalize transition-colors duration-150",
                  filters.minImpactIndex === i ? "font-bold text-foreground" : "text-muted-foreground",
                )}
              >
                {lvl}
              </span>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* Timeline */}
      <CollapsibleSection title="Timeline" defaultOpen>
        <div className="mb-2 text-xs text-subtle-foreground">{allNews.length} total</div>
        <div className="flex overflow-hidden rounded-full border border-border bg-app p-0.5">
          {TIMELINES.map((tl) => (
            <button
              key={tl}
              onClick={() => setFilters((f) => ({ ...f, timeline: tl }))}
              className={cn(
                "focus-ring flex-1 rounded-full py-1.5 text-xs font-semibold transition-all duration-150",
                filters.timeline === tl
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tl}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      <div className="pt-3">
        <SectorHeatMap allNews={allNews} />
      </div>
      </aside>
    </>
  );
}
