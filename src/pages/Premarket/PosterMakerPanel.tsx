import { Fragment, createElement, useMemo, useRef, useState } from "react";
import { Wand2, TriangleAlert, CircleCheck } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { cn } from "../../lib/utils";
import { PosterFrame, PosterActions, rowDensityFor } from "./posterShared";
import { POSTER_MAKER_TEMPLATES, type PosterMakerTemplate } from "./posterMakerTemplates";
import { parsePosterMakerText, paginateRows, type ParseError } from "./posterMakerParse";
import type { ReportBranding } from "./useReportBranding";
import type { SocialLinks } from "./useSocialLinks";

function exampleText(template: PosterMakerTemplate) {
  return Array.from({ length: 3 }, () => template.exampleLine).join("\n");
}

function GeneratedPosterCard({
  template,
  title,
  subtitle,
  branding,
  links,
  rows,
  pageIndex,
  totalPages,
  dateStr,
}: {
  template: PosterMakerTemplate;
  title: string;
  subtitle: string;
  branding: ReportBranding;
  links: SocialLinks;
  rows: Record<string, string>[];
  pageIndex: number;
  totalPages: number;
  dateStr: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const density = rowDensityFor(rows.length);
  const posterId = `${template.posterIdPrefix}-${pageIndex}-of-${totalPages}`;

  return (
    <div className="flex shrink-0 snap-start flex-col">
      <div className="overflow-hidden rounded-2xl shadow-md">
        <PosterFrame
          ref={ref}
          posterId={posterId}
          gradient={template.gradient}
          icon={createElement(template.icon, { size: 26 })}
          title={title || template.defaultTitle}
          subtitle={subtitle || template.defaultSubtitle}
          branding={branding}
          links={links}
        >
          {totalPages > 1 && (
            <div className="mb-1.5 self-end rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold text-white">
              Page {pageIndex} of {totalPages}
            </div>
          )}
          <div className={cn("flex flex-col", density.gap)}>
            {rows.map((row, i) => (
              <Fragment key={i}>{template.renderRow(row, density)}</Fragment>
            ))}
          </div>
        </PosterFrame>
      </div>
      <PosterActions
        nodeRef={ref}
        filename={`stoqtrade-${posterId}-${dateStr}.png`}
        shareTitle={totalPages > 1 ? `${title} (${pageIndex}/${totalPages})` : title}
      />
    </div>
  );
}

// Template picker + paste-data engine, reusing the exact same poster
// visuals (PosterFrame, row components, density tiers) the live auto-
// generated posters use. Unlike those — which hard-cap at MAX_POSTER_ROWS
// and silently drop the rest — pasted data that exceeds one poster's worth
// is split across as many posters as it takes, each following the same
// template.
export function PosterMakerPanel({ branding, links }: { branding: ReportBranding; links: SocialLinks }) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [errors, setErrors] = useState<ParseError[]>([]);

  const template = POSTER_MAKER_TEMPLATES.find((t) => t.id === templateId) ?? null;
  const dateStr = new Date().toISOString().slice(0, 10);

  const pages = useMemo(() => (rows && rows.length > 0 ? paginateRows(rows) : []), [rows]);

  function selectTemplate(t: PosterMakerTemplate) {
    setTemplateId(t.id);
    setTitle(t.defaultTitle);
    setSubtitle(t.defaultSubtitle);
    setPasteText("");
    setRows(null);
    setErrors([]);
  }

  function handleGenerate() {
    if (!template) return;
    const result = parsePosterMakerText(pasteText, template.columns);
    setRows(result.rows);
    setErrors(result.errors);
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-base font-extrabold tracking-tight text-foreground">
            Poster Maker<span className="text-accent">.</span>
          </h2>
          <p className="text-xs text-subtle-foreground">
            Pick a template, paste a list of data, and get however many posters it takes to fit it all.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {POSTER_MAKER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={cn(
                "focus-ring flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors",
                templateId === t.id
                  ? "border-accent bg-accent-bg text-accent"
                  : "border-border text-muted-foreground hover:bg-hover",
              )}
            >
              <t.icon size={18} />
              <span className="text-[11px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>

        {template && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={template.defaultTitle} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Subtitle</label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder={template.defaultSubtitle}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Paste data — one row per line, columns separated by a comma, tab, or "|": {" "}
                <span className="font-semibold text-foreground">
                  {template.columns.map((c) => c.label).join(" · ")}
                </span>
              </label>
              <Textarea
                rows={6}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={exampleText(template)}
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
                  <GeneratedPosterCard
                    key={i}
                    template={template}
                    title={title || template.defaultTitle}
                    subtitle={subtitle || template.defaultSubtitle}
                    branding={branding}
                    links={links}
                    rows={pageRows}
                    pageIndex={i + 1}
                    totalPages={pages.length}
                    dateStr={dateStr}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
