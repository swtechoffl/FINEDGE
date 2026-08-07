import { forwardRef } from "react";
import { ArrowRight } from "lucide-react";
import type { ReportBranding } from "../Premarket/useReportBranding";
import { socialDisplay, SOCIAL_META, type SocialLinks } from "../Premarket/useSocialLinks";
import { POSTER_WIDTH } from "../Premarket/posterShared";
import { useFitHeight } from "./useFitHeight";

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ImprintFooter({ branding, links }: { branding: ReportBranding; links: SocialLinks }) {
  const entries = (Object.keys(links) as (keyof SocialLinks)[]).filter((k) => links[k].trim());
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 border-t border-white/10 px-4 py-2.5">
      <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-white/45">
        {branding.name || "Finedge"}
      </span>
      {entries.map((k) => {
        const { icon: Icon } = SOCIAL_META[k];
        return (
          <span key={k} className="flex items-center gap-0.5 text-[8px] font-semibold text-white/45">
            <Icon size={8} className="shrink-0" />
            {socialDisplay(k, links[k])}
          </span>
        );
      })}
    </div>
  );
}

export const MarketingPosterFrame = forwardRef<
  HTMLDivElement,
  {
    posterId: string;
    color: string;
    kicker: string;
    heroText: string;
    heroSize: number;
    heroSub: string;
    features: string[];
    cta: string;
    branding: ReportBranding;
    links: SocialLinks;
    width?: number;
  }
>(function MarketingPosterFrame(
  { posterId, color, kicker, heroText, heroSize, heroSub, features, cta, branding, links, width },
  ref,
) {
  const w = width ?? POSTER_WIDTH;
  const { measureRef, height } = useFitHeight(w);

  return (
    <div
      ref={ref}
      data-poster={posterId}
      className="relative flex aspect-[9/16] flex-col overflow-hidden"
      style={{ width: w, height, background: "#0a0a0c" }}
    >
      <div ref={measureRef} className="flex flex-col">
        {/* Hero band — solid color, no gradient, with two overlapping
            translucent circles as the only decorative accent. */}
        <div className="relative overflow-hidden px-4 pb-5 pt-4" style={{ background: color }}>
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -right-1 top-12 h-10 w-10 rounded-full bg-white/10" />
          <div className="relative z-10 flex items-center justify-between">
            <img src="/logo.png" alt="Finedge" className="h-5 w-auto shrink-0" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/70">{todayLabel()}</span>
          </div>
          <div className="relative z-10 mt-5">
            <div className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-white/75">{kicker}</div>
            <div className="mt-1 font-black leading-[0.92] tracking-tight text-white" style={{ fontSize: heroSize }}>
              {heroText}
            </div>
            <div className="mt-2 text-[11px] font-semibold leading-snug text-white/90">{heroSub}</div>
          </div>
        </div>

        {/* Body — flat dark ground, features as a numbered fine-print list
            (hairline rules, no card chrome) rather than pill/glass rows. */}
        <div className="flex flex-col gap-2.5 px-4 py-4">
          {features.map((f, i) => (
            <div key={f} className="flex items-baseline gap-2.5 border-b border-white/10 pb-2.5 last:border-none">
              <span className="shrink-0 text-[10px] font-black" style={{ color }}>
                0{i + 1}
              </span>
              <span className="text-[10.5px] font-semibold leading-snug text-white/90">{f}</span>
            </div>
          ))}
        </div>

        {/* CTA band — solid color again, bookending the hero band. */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between px-3.5 py-2.5" style={{ background: color }}>
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-white">{cta}</span>
            <ArrowRight size={14} className="shrink-0 text-white" />
          </div>
        </div>

        <ImprintFooter branding={branding} links={links} />
      </div>
    </div>
  );
});
