import { forwardRef, type CSSProperties } from "react";
import { ArrowUpRight, IndianRupee } from "lucide-react";
import { useFitHeight } from "./useFitHeight";
import { RA2_THEMES, COIN_METAL_STYLES, type Ra2ThemeId } from "./ra2Themes";
import { fmtRaDate } from "./raPosterTheme";

// Square (1:1) "premium fintech ad" poster — deliberately different visual
// language from the dark-card RA posters (RaCallPoster/RaListPoster): a
// glowing gradient background with metallic coin corners and a floating
// white returns card, built for feed/story ad placement. Theme + an
// optional custom background photo are both swappable per poster.
export const RA2_POSTER_SIZE = 420;

export interface Ra2PosterInput {
  headlineLine1: string;
  headlineLine2: string;
  stockName: string;
  callDate: string;
  returnsPct: number;
  duration: string;
  showBottomHeadline: boolean;
  ctaText: string;
  showCompliance: boolean;
  raName: string;
  sebiRegNo: string;
  disclaimer: string;
  themeId: Ra2ThemeId;
  coinImageUrl: string | null;
  backgroundImageUrl: string | null;
  imageOverlayOpacity: number;
}

// Metallic rupee-coin disc (theme-tinted gold/silver/etc.), or — when the
// user has uploaded one — their own image cropped into the same circular
// footprint so it still reads as a coin dropped into the corner.
function Coin({
  size,
  metal,
  imageUrl,
  style,
}: {
  size: number;
  metal: keyof typeof COIN_METAL_STYLES;
  imageUrl: string | null;
  style?: CSSProperties;
}) {
  const m = COIN_METAL_STYLES[metal];

  if (imageUrl) {
    return (
      <div
        className="pointer-events-none absolute rounded-full bg-cover bg-center"
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${imageUrl})`,
          boxShadow: "0 10px 26px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(255,255,255,0.35), inset 0 -8px 14px rgba(0,0,0,0.35)",
          ...style,
        }}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: m.face,
        boxShadow: "0 10px 26px rgba(0,0,0,0.5), inset 0 3px 5px rgba(255,255,255,0.65), inset 0 -8px 14px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      <div
        className="absolute flex items-center justify-center rounded-full"
        style={{ inset: "9%", border: `2px dashed ${m.ring}` }}
      >
        <IndianRupee size={size * 0.32} color={m.glyph} strokeWidth={2.75} />
      </div>
    </div>
  );
}

function CandleShape({ style }: { style: CSSProperties }) {
  return <div className="pointer-events-none absolute rounded-md blur-xl" style={style} />;
}

export const RaPoster2 = forwardRef<HTMLDivElement, { input: Ra2PosterInput }>(function RaPoster2({ input }, ref) {
  const { measureRef, height } = useFitHeight(RA2_POSTER_SIZE, 1, 1);
  const pct = Number.isFinite(input.returnsPct) ? input.returnsPct : 0;
  const theme = RA2_THEMES[input.themeId] ?? RA2_THEMES["midnight-blue"];
  const hasImage = Boolean(input.backgroundImageUrl);
  const stockLabel = input.stockName.trim();
  const dateLabel = fmtRaDate(input.callDate);

  return (
    <div
      ref={ref}
      data-poster="ra-2"
      className="relative overflow-hidden"
      style={{
        width: RA2_POSTER_SIZE,
        height,
        background: hasImage ? "#050505" : theme.background,
        backgroundImage: hasImage ? `url(${input.backgroundImageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* tints an uploaded background photo with the chosen theme so text stays legible and on-brand */}
      {hasImage && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: theme.background, opacity: input.imageOverlayOpacity / 100 }}
        />
      )}

      {/* subtle fintech line-art grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.07]">
        <defs>
          <pattern id="ra2-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0L0 0 0 34" fill="none" stroke="#8fc4ff" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ra2-grid)" />
      </svg>

      {/* soft glow behind the card */}
      <div
        className="pointer-events-none absolute -translate-x-1/2 rounded-full blur-3xl"
        style={{
          width: 360,
          height: 360,
          left: "50%",
          top: 90,
          background: `radial-gradient(circle, ${theme.glow} 0%, rgba(0,0,0,0) 70%)`,
        }}
      />

      {/* soft blurred 3D candlestick chart shapes */}
      <CandleShape
        style={{ width: 26, height: 130, left: 34, top: 210, background: theme.candleColors[0], opacity: 0.35, transform: "rotate(-6deg)" }}
      />
      <CandleShape
        style={{ width: 26, height: 90, left: 72, top: 252, background: theme.candleColors[1], opacity: 0.3, transform: "rotate(4deg)" }}
      />
      <CandleShape
        style={{ width: 26, height: 160, right: 40, top: 190, background: theme.candleColors[2], opacity: 0.35, transform: "rotate(7deg)" }}
      />
      <CandleShape
        style={{ width: 26, height: 100, right: 80, top: 262, background: theme.candleColors[3], opacity: 0.28, transform: "rotate(-5deg)" }}
      />

      {/* realistic metallic rupee coins, cropped into the corners */}
      <Coin size={130} metal={theme.coin} imageUrl={input.coinImageUrl} style={{ top: -46, left: -46 }} />
      <Coin size={150} metal={theme.coin} imageUrl={input.coinImageUrl} style={{ bottom: -56, right: -56 }} />

      {/* content */}
      <div ref={measureRef} className="relative z-10 flex flex-col items-center px-7 pb-6 pt-8">
        <div className="text-center">
          <div className="text-[15px] font-semibold text-white/85">{input.headlineLine1}</div>
          <div
            className="mt-0.5 text-[30px] font-extrabold uppercase tracking-tight text-white"
            style={{ filter: `drop-shadow(0 0 18px ${theme.glow})` }}
          >
            {input.headlineLine2}
          </div>
        </div>

        <div
          className="relative mt-6 flex w-full max-w-[300px] flex-col items-center gap-1.5 rounded-[28px] bg-white px-6 py-6"
          style={{
            boxShadow: `0 20px 50px rgba(2,8,23,0.55), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px ${theme.glow}`,
          }}
        >
          {stockLabel && (
            <div className="flex items-baseline gap-1.5 text-[17px] font-extrabold uppercase tracking-tight text-slate-900">
              <span className="text-[11px] font-bold tracking-widest text-slate-400">STOCK:</span>
              {stockLabel}
            </div>
          )}
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            Returns
          </div>
          <div className="flex items-center gap-1 leading-none">
            <ArrowUpRight size={30} className="text-emerald-500" strokeWidth={3} />
            <span className="text-[56px] font-extrabold leading-none tracking-tight text-slate-900">
              {pct.toFixed(1)}%
            </span>
          </div>
          <div className="text-[13px] font-semibold text-slate-500">{input.duration}</div>
          {dateLabel && <div className="text-[10px] font-medium text-slate-400">Call given {dateLabel}</div>}
        </div>

        {input.showBottomHeadline && (
          <div
            className="mt-5 text-center text-[22px] font-extrabold uppercase tracking-wide"
            style={{ color: theme.accentText, filter: `drop-shadow(0 0 14px ${theme.accentGlow})` }}
          >
            {stockLabel ? `STOCK: ${stockLabel} · ${pct.toFixed(1)}% Returns` : `${pct.toFixed(1)}% Returns`}
          </div>
        )}

        {input.ctaText.trim() && (
          <div
            className="mt-5 inline-flex items-center justify-center rounded-full px-8 py-3 text-[13px] font-extrabold uppercase tracking-wide"
            style={{
              background: theme.ctaGradient,
              boxShadow: `0 0 26px ${theme.ctaGlow}, 0 8px 18px rgba(0,0,0,0.35)`,
              color: theme.ctaTextColor,
            }}
          >
            {input.ctaText}
          </div>
        )}

        {input.showCompliance && (input.raName.trim() || input.sebiRegNo.trim() || input.disclaimer.trim()) && (
          <div className="mt-4 max-w-[320px] text-center">
            {(input.raName.trim() || input.sebiRegNo.trim()) && (
              <div className="text-[8px] font-semibold text-white/60">
                {[input.raName.trim(), input.sebiRegNo.trim() && `SEBI Reg. No: ${input.sebiRegNo.trim()}`]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
            {input.disclaimer.trim() && (
              <div className="mt-0.5 text-[7.5px] leading-snug text-white/40">{input.disclaimer.trim()}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
