import { Fragment, useMemo, useRef, useState } from "react";
import { Wand2, TriangleAlert, CircleCheck } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { PosterActions, rowDensityFor } from "../Premarket/posterShared";
import { parsePosterMakerText, paginateRows, type ParseError } from "../Premarket/posterMakerParse";
import type { PosterMakerColumn } from "../Premarket/posterMakerTemplates";
import { RaCallPoster, RA_CALL_POSTER_WIDTH, type RaCallInput } from "./RaCallPoster";
import { RaListPosterFrame, RaCallRow, type RaListRow } from "./RaListPoster";
import { RA_DEFAULT_DISCLAIMER } from "./raPosterTheme";

const LIST_COLUMNS: PosterMakerColumn[] = [
  { key: "symbol", label: "Stock", required: true, placeholder: "RELIANCE" },
  { key: "callDate", label: "Call Date", required: true, placeholder: "12-Aug-2026" },
  { key: "entryPrice", label: "Entry", required: true, type: "number", placeholder: "2450" },
  { key: "profitPct", label: "% Profit", required: true, type: "number", placeholder: "6.4" },
];
const EXAMPLE_LINE = "RELIANCE, 12-Aug-2026, 2450, 6.4";

// Single-call card: fill in one call, get one detailed "call announced /
// running" poster. Sibling to the list maker below for a "this week's calls"
// roundup — both share the same fields (stock, call date, entry, %profit,
// disclaimer) and just differ in how many calls land on one image.
function RaCallCard() {
  const ref = useRef<HTMLDivElement>(null);
  const dateStr = new Date().toISOString().slice(0, 10);
  const [call, setCall] = useState<RaCallInput>({
    symbol: "",
    companyName: "",
    callDate: dateStr,
    entryPrice: 0,
    profitPct: 0,
    disclaimer: RA_DEFAULT_DISCLAIMER,
  });

  function patch(field: keyof RaCallInput, value: string | number) {
    setCall((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-base font-extrabold tracking-tight text-foreground">
            RA Call Card<span className="text-accent">.</span>
          </h2>
          <p className="text-xs text-subtle-foreground">
            One call, one poster — stock, call date, entry price, % profit and a disclaimer.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Stock Name</label>
              <Input
                value={call.symbol}
                onChange={(e) => patch("symbol", e.target.value.toUpperCase())}
                placeholder="RELIANCE"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Company (optional)</label>
              <Input
                value={call.companyName}
                onChange={(e) => patch("companyName", e.target.value)}
                placeholder="Reliance Industries Ltd"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Call Given Date</label>
              <Input type="date" value={call.callDate} onChange={(e) => patch("callDate", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Entry Price</label>
              <Input
                type="number"
                value={call.entryPrice || ""}
                onChange={(e) => patch("entryPrice", Number(e.target.value))}
                placeholder="2450"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">% Profit</label>
              <Input
                type="number"
                step="0.01"
                value={call.profitPct || ""}
                onChange={(e) => patch("profitPct", Number(e.target.value))}
                placeholder="6.4 (use a negative number for a loss)"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Disclaimer</label>
              <Textarea
                rows={3}
                value={call.disclaimer}
                onChange={(e) => patch("disclaimer", e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center">
            <div className="overflow-hidden rounded-2xl shadow-md">
              <RaCallPoster ref={ref} call={call} />
            </div>
            <div className="mt-2" style={{ width: RA_CALL_POSTER_WIDTH }}>
              <PosterActions
                nodeRef={ref}
                filename={`stoqtrade-ra-call-${call.symbol || "call"}-${dateStr}.png`}
                shareTitle={call.symbol ? `${call.symbol} — Research Call` : "Research Call"}
                width={RA_CALL_POSTER_WIDTH}
                pixelRatio={2.5}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function GeneratedRaListPoster({
  title,
  subtitle,
  disclaimer,
  rows,
  pageIndex,
  totalPages,
  dateStr,
}: {
  title: string;
  subtitle: string;
  disclaimer: string;
  rows: RaListRow[];
  pageIndex: number;
  totalPages: number;
  dateStr: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const density = rowDensityFor(rows.length);
  const posterId = `ra-poster-maker-${pageIndex}-of-${totalPages}`;

  return (
    <div className="flex shrink-0 snap-start flex-col">
      <div className="overflow-hidden rounded-2xl shadow-md">
        <RaListPosterFrame
          ref={ref}
          posterId={posterId}
          title={title}
          subtitle={subtitle}
          disclaimer={disclaimer}
          pageLabel={totalPages > 1 ? `Page ${pageIndex} of ${totalPages}` : undefined}
        >
          <div className={`flex flex-col ${density.gap}`}>
            {rows.map((row, i) => (
              <Fragment key={i}>
                <RaCallRow row={row} density={density} />
              </Fragment>
            ))}
          </div>
        </RaListPosterFrame>
      </div>
      <PosterActions
        nodeRef={ref}
        filename={`stoqtrade-${posterId}-${dateStr}.png`}
        shareTitle={totalPages > 1 ? `${title} (${pageIndex}/${totalPages})` : title}
      />
    </div>
  );
}

// Bulk sibling of RaCallCard — paste many calls at once (same four fields
// per line) and get however many list posters it takes to fit them, reusing
// the exact paste-parse-paginate engine the Premarket Poster Maker uses.
function RaListMaker() {
  const [title, setTitle] = useState("Research Calls");
  const [subtitle, setSubtitle] = useState("Track Record");
  const [disclaimer, setDisclaimer] = useState(RA_DEFAULT_DISCLAIMER);
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<RaListRow[] | null>(null);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const dateStr = new Date().toISOString().slice(0, 10);

  const pages = useMemo(() => (rows && rows.length > 0 ? paginateRows(rows) : []), [rows]);

  function handleGenerate() {
    const result = parsePosterMakerText(pasteText, LIST_COLUMNS);
    setRows(result.rows as unknown as RaListRow[]);
    setErrors(result.errors);
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-base font-extrabold tracking-tight text-foreground">
            RA Poster Maker<span className="text-accent">.</span>
          </h2>
          <p className="text-xs text-subtle-foreground">
            Paste a list of calls and get however many posters it takes to fit them all.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Research Calls" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Subtitle</label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Track Record" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Disclaimer</label>
            <Textarea rows={2} value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} className="text-xs" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Paste data — one row per line, columns separated by a comma, tab, or "|":{" "}
              <span className="font-semibold text-foreground">{LIST_COLUMNS.map((c) => c.label).join(" · ")}</span>
            </label>
            <Textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={Array.from({ length: 3 }, () => EXAMPLE_LINE).join("\n")}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleGenerate} disabled={pasteText.trim() === ""}>
              <Wand2 size={14} /> Generate Posters
            </Button>
            {rows !== null && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-bullish">
                <CircleCheck size={14} /> {rows.length} row{rows.length === 1 ? "" : "s"} → {pages.length} poster
                {pages.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg bg-bearish-bg px-3 py-2">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-bearish">
                <TriangleAlert size={13} /> {errors.length} row{errors.length === 1 ? "" : "s"} skipped
              </div>
              <ul className="flex flex-col gap-0.5">
                {errors.map((err, i) => (
                  <li key={i} className="text-[11px] text-bearish">
                    Line {err.line}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pages.length > 0 && (
            <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1">
              {pages.map((pageRows, i) => (
                <GeneratedRaListPoster
                  key={i}
                  title={title || "Research Calls"}
                  subtitle={subtitle || "Track Record"}
                  disclaimer={disclaimer}
                  rows={pageRows}
                  pageIndex={i + 1}
                  totalPages={pages.length}
                  dateStr={dateStr}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function RaPosterMaker() {
  return (
    <div className="flex flex-col gap-4">
      <RaCallCard />
      <RaListMaker />
    </div>
  );
}
