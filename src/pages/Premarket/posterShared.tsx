import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Download, Share2 } from "lucide-react";
import type { ReportBranding } from "./useReportBranding";
import { socialDisplay, SOCIAL_META, type SocialLinks } from "./useSocialLinks";
import { nodeToImageFile, downloadFile, shareImageFile } from "../../lib/shareImage";

export const POSTER_WIDTH = 234;

// A poster's list sections (stocks to watch, earnings, corporate actions,
// IPOs, volume gainers) have a fixed-height frame but a variable number of
// items. Rather than hard-capping at whatever fits at one fixed size, rows
// step down through a few density tiers as the list grows so more items fit
// — cramped press-release density rather than a hard cutoff.
export interface RowDensity {
  gap: string;
  padding: string;
  primaryText: string;
  secondaryText: string;
}

export function rowDensityFor(count: number): RowDensity {
  if (count <= 6) {
    return { gap: "gap-1.5", padding: "px-2.5 py-1.5", primaryText: "text-[10.5px]", secondaryText: "text-[9.5px]" };
  }
  if (count <= 8) {
    return { gap: "gap-1", padding: "px-2.5 py-1", primaryText: "text-[9.5px]", secondaryText: "text-[8.5px]" };
  }
  return { gap: "gap-0.5", padding: "px-2 py-0.5", primaryText: "text-[8.5px]", secondaryText: "text-[7.5px]" };
}

// Max items a poster list section will ever show, even if more data exists
// — keeps the smallest density tier from becoming illegibly tiny.
export const MAX_POSTER_ROWS = 10;

// The content area a PosterFrame at POSTER_WIDTH normally budgets for its
// children, once the fixed header (logo/title) and footer (brand strip) are
// accounted for — measured directly off a rendered frame. Poster sections
// that must never truncate (e.g. IPO Watch, where omitting a listing is
// worse than a taller image) use this to detect when their content would
// overflow that budget and grow the frame instead of letting it clip.
const DEFAULT_POSTER_CONTENT_HEIGHT = 206;

// Measures `contentRef`'s actual rendered height and, if it exceeds what a
// standard aspect-[9/16] frame at `width` budgets for, returns a `height`
// override that grows the frame downward by exactly the overflow — so
// PosterFrame never needs to clip this section's content. Returns
// `height: undefined` (falls back to the normal aspect ratio) otherwise.
export function useAutoGrowHeight(width: number = POSTER_WIDTH) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const needed = el.scrollHeight;
    const overflow = needed - DEFAULT_POSTER_CONTENT_HEIGHT;
    const nextHeight = overflow > 0 ? (width * 16) / 9 + overflow : undefined;
    setHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  });

  return { contentRef, height };
}

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function BrandFooter({ branding, links }: { branding: ReportBranding; links: SocialLinks }) {
  // Only ever shows handles the user actually typed in — no built-in
  // Sharewealth default handles mixed in or falled back to.
  const entries = (Object.keys(links) as (keyof SocialLinks)[]).filter((k) => links[k].trim());
  return (
    <div className="flex items-center gap-2 border-t border-white/25 pt-2.5">
      {branding.logoDataUrl ? (
        <img src={branding.logoDataUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
      ) : (
        // The fallback mark is a "squircle" app-icon asset with its own
        // baked-in rounded corners — clipping it to a circle as-is combines
        // two different corner curves into an octagon-ish shape rather than
        // a clean circle. Scaling the image up inside a fixed circular clip
        // pushes those corners outside the frame so only the circle shows.
        <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full">
          <img src="/sharewealth-logo.png" alt="Sharewealth" className="h-full w-full scale-125 object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {entries.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {entries.map((k) => {
              const { icon: Icon } = SOCIAL_META[k];
              return (
                <div key={k} className="flex items-center gap-0.5 text-[8px] font-semibold text-white/85">
                  <Icon size={8} className="shrink-0 text-white/70" />
                  <span className="truncate">{socialDisplay(k, links[k])}</span>
                </div>
              );
            })}
          </div>
        ) : branding.name ? (
          <div className="truncate text-[9px] font-semibold text-white/70">{branding.name}</div>
        ) : null}
      </div>
    </div>
  );
}

export const PosterFrame = forwardRef<
  HTMLDivElement,
  {
    posterId: string;
    gradient: string;
    icon: ReactNode;
    title: string;
    subtitle: string;
    branding: ReportBranding;
    links: SocialLinks;
    children: ReactNode;
    width?: number;
    // Explicit pixel override for sections that must never truncate — see
    // useAutoGrowHeight. Omit to keep the default aspect-[9/16] sizing.
    height?: number;
  }
>(function PosterFrame({ posterId, gradient, icon, title, subtitle, branding, links, children, width, height }, ref) {
  return (
    <div
      ref={ref}
      data-poster={posterId}
      className="relative flex aspect-[9/16] flex-col overflow-hidden p-4"
      style={{ width: width ?? POSTER_WIDTH, height, background: gradient }}
    >
      <div className="flex items-center justify-between gap-2">
        <img src="/logo.png" alt="Finedge" className="h-6 w-auto shrink-0" />
        <div className="shrink-0 text-[8px] text-white/60">{todayLabel()}</div>
      </div>

      <div className="mt-4 mb-3">
        <div className="mb-1 text-white/90">{icon}</div>
        <div className="text-[17px] font-extrabold uppercase leading-[1.15] tracking-tight text-white">{title}</div>
        <div className="text-[9.5px] font-medium text-white/70">{subtitle}</div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">{children}</div>

      <div className="mt-3">
        <BrandFooter branding={branding} links={links} />
      </div>
    </div>
  );
});

export function PosterActions({
  nodeRef,
  filename,
  shareTitle,
  width,
  pixelRatio = 4,
}: {
  nodeRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  shareTitle: string;
  width?: number;
  // Rasterization scale for nodeToImageFile — default 4 matches the narrow
  // story-card posters. Wider/denser posters (e.g. a dashboard-style poster
  // already built at a larger on-page width) should pass a smaller value
  // to land on a specific target export resolution instead of ballooning.
  pixelRatio?: number;
}) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleDownload() {
    if (!nodeRef.current) return;
    setBusy("download");
    setNotice(null);
    const file = await nodeToImageFile(nodeRef.current, filename, pixelRatio);
    setBusy(null);
    if (file) downloadFile(file);
    else setNotice("Couldn't generate the poster image.");
  }

  async function handleShare() {
    if (!nodeRef.current) return;
    setBusy("share");
    setNotice(null);
    const file = await nodeToImageFile(nodeRef.current, filename, pixelRatio);
    if (!file) {
      setNotice("Couldn't generate the poster image.");
      setBusy(null);
      return;
    }
    const result = await shareImageFile(file, { title: shareTitle, text: `${shareTitle}\nvia stoqtrade.ai` });
    setBusy(null);
    if (result === "downloaded") setNotice("Saved — share it to your story from your gallery.");
  }

  return (
    <div style={{ width: width ?? POSTER_WIDTH }}>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          onClick={handleShare}
          disabled={busy !== null}
          className="focus-ring flex items-center justify-center gap-1.5 rounded-lg bg-accent py-1.5 text-xs font-semibold text-accent-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Share2 size={13} /> {busy === "share" ? "…" : "Share"}
        </button>
        <button
          onClick={handleDownload}
          disabled={busy !== null}
          className="focus-ring flex items-center justify-center gap-1.5 rounded-lg border border-border-strong py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-hover disabled:opacity-60"
        >
          <Download size={13} /> {busy === "download" ? "…" : "Save"}
        </button>
      </div>
      {notice && <p className="mt-1.5 text-[10px] leading-snug text-subtle-foreground">{notice}</p>}
    </div>
  );
}

