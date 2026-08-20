import { useRef, useState } from "react";
import { Upload, Trash2, Check } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { cn } from "../../lib/utils";
import { PosterActions } from "../Premarket/posterShared";
import { RaPoster2, RA2_POSTER_SIZE, type Ra2PosterInput } from "./RaPoster2";
import { RA2_THEME_LIST } from "./ra2Themes";
import { RA_DEFAULT_DISCLAIMER, RA_DEFAULT_NAME, RA_DEFAULT_SEBI_REG_NO } from "./raPosterTheme";

// Raw upload ceiling before it's stored as a data URL — generous since this
// is just a backdrop photo behind a theme-color overlay, not a cropped asset.
const MAX_IMAGE_BYTES = 8_000_000;

// Quick-pick openers for Headline Line 1 — "Line 2" (the SEBI RA name) reads
// as the object of whichever of these ends up in front of it, so they're
// all phrased to lead into a name/brand.
const HEADLINE_PRESETS = [
  "Get trusted ideas by",
  "Explore expert market ideas from",
  "Make informed decisions with",
  "Invest with insights from",
  "Your trusted source for market ideas",
  "Smarter investing starts with",
  "Trade smarter with insights from",
  "Stay ahead with trusted insights",
];

// Alternate SEBI-compliant disclaimer wordings, swapped in for the default
// RA_DEFAULT_DISCLAIMER (which every other RA poster in the app also uses).
const DISCLAIMER_PRESETS = [
  RA_DEFAULT_DISCLAIMER,
  "Past performance is not indicative of future returns. Investments are subject to market risks. Please read all scheme-related documents carefully before investing.",
  "Disclaimer: Investments are subject to market risks. Past performance is not indicative of future returns. SEBI registration does not guarantee the performance of the adviser or assure returns.",
  "Disclaimer: Investment in securities market is subject to market risks. Read all the related documents carefully before investing. Past performance is not indicative of future returns. SEBI registration and certification do not guarantee the performance of the intermediary or provide any assurance of returns to investors.",
];

const RA2_DEFAULTS: Ra2PosterInput = {
  headlineLine1: "Get trusted ideas by",
  headlineLine2: "SEBI RA",
  stockName: "",
  callDate: new Date().toISOString().slice(0, 10),
  returnsPct: 7.3,
  duration: "in 5 days",
  showBottomHeadline: true,
  ctaText: "SUBSCRIBE NOW",
  showCompliance: true,
  raName: RA_DEFAULT_NAME,
  sebiRegNo: RA_DEFAULT_SEBI_REG_NO,
  disclaimer: RA_DEFAULT_DISCLAIMER,
  themeId: "midnight-blue",
  coinImageUrl: null,
  backgroundImageUrl: null,
  imageOverlayOpacity: 65,
};

// Square (1:1) performance-brag ad — sibling to RaCallCard/RaListMaker but a
// different genre: headline return% + stock/call-date badge + subscribe CTA
// over a glowing fintech-ad background, with a swappable color theme and an
// optional custom background photo.
export function RaPosterMaker2() {
  const ref = useRef<HTMLDivElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const coinFileInputRef = useRef<HTMLInputElement>(null);
  const dateStr = new Date().toISOString().slice(0, 10);
  const [input, setInput] = useState<Ra2PosterInput>(RA2_DEFAULTS);
  const [imageError, setImageError] = useState<string | null>(null);
  const [coinImageError, setCoinImageError] = useState<string | null>(null);

  function patch(patch: Partial<Ra2PosterInput>) {
    setInput((prev) => ({ ...prev, ...patch }));
  }

  function readImageFile(
    e: React.ChangeEvent<HTMLInputElement>,
    onError: (msg: string | null) => void,
    onLoad: (dataUrl: string) => void,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onError("Image is too large — please use a file under 8MB.");
      return;
    }
    onError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onLoad(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    readImageFile(e, setImageError, (dataUrl) => patch({ backgroundImageUrl: dataUrl }));
  }

  function handleCoinImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    readImageFile(e, setCoinImageError, (dataUrl) => patch({ coinImageUrl: dataUrl }));
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-base font-extrabold tracking-tight text-foreground">
            RA 2 — Performance Ad<span className="text-accent">.</span>
          </h2>
          <p className="text-xs text-subtle-foreground">
            A square, feed-ready ad built around one headline return figure, with swappable color themes and an
            optional custom background photo.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Headline Line 1</label>
              <Input
                value={input.headlineLine1}
                onChange={(e) => patch({ headlineLine1: e.target.value })}
                placeholder="Get trusted ideas by"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {HEADLINE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => patch({ headlineLine1: preset })}
                    className={cn(
                      "focus-ring rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors",
                      input.headlineLine1 === preset
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border-strong/40 text-muted-foreground hover:bg-hover",
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Headline Line 2</label>
              <Input
                value={input.headlineLine2}
                onChange={(e) => patch({ headlineLine2: e.target.value.toUpperCase() })}
                placeholder="SEBI RA"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Stock Name</label>
              <Input
                value={input.stockName}
                onChange={(e) => patch({ stockName: e.target.value.toUpperCase() })}
                placeholder="RELIANCE"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Call Given Date</label>
              <Input type="date" value={input.callDate} onChange={(e) => patch({ callDate: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Returns %</label>
              <Input
                type="number"
                step="0.1"
                value={input.returnsPct || ""}
                onChange={(e) => patch({ returnsPct: Number(e.target.value) })}
                placeholder="7.3"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Duration Text</label>
              <Input
                value={input.duration}
                onChange={(e) => patch({ duration: e.target.value })}
                placeholder="in 5 days"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">CTA Button Text</label>
              <Input
                value={input.ctaText}
                onChange={(e) => patch({ ctaText: e.target.value.toUpperCase() })}
                placeholder="SUBSCRIBE NOW"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={input.showBottomHeadline}
                  onChange={(e) => patch({ showBottomHeadline: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Show "X% Returns" line below the card
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Theme</label>
              <div className="flex flex-wrap gap-2">
                {RA2_THEME_LIST.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => patch({ themeId: theme.id })}
                    title={theme.label}
                    className={cn(
                      "focus-ring relative h-9 w-9 shrink-0 rounded-full border-2 transition-transform hover:scale-105",
                      input.themeId === theme.id ? "border-accent" : "border-border-strong/40",
                    )}
                    style={{ background: theme.swatch }}
                  >
                    {input.themeId === theme.id && (
                      <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Corner Coin Image (optional)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {input.coinImageUrl && (
                  <div
                    className="h-9 w-9 shrink-0 rounded-full border border-border-strong/40 bg-cover bg-center"
                    style={{ backgroundImage: `url(${input.coinImageUrl})` }}
                  />
                )}
                <input
                  ref={coinFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoinImageUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={() => coinFileInputRef.current?.click()}>
                  <Upload size={13} /> {input.coinImageUrl ? "Replace" : "Upload"} coin
                </Button>
                {input.coinImageUrl && (
                  <Button variant="ghost" size="sm" onClick={() => patch({ coinImageUrl: null })}>
                    <Trash2 size={13} /> Remove
                  </Button>
                )}
              </div>
              {coinImageError && <p className="mt-1 text-xs text-bearish">{coinImageError}</p>}
              <p className="mt-1 text-[10.5px] text-subtle-foreground">
                Replaces the default metallic rupee coin in both corners with your own image, cropped into the same
                circle. Leave empty to keep the theme's metallic coin.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Background Image (optional)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={() => bgFileInputRef.current?.click()}>
                  <Upload size={13} /> Upload photo
                </Button>
                {input.backgroundImageUrl && (
                  <Button variant="ghost" size="sm" onClick={() => patch({ backgroundImageUrl: null })}>
                    <Trash2 size={13} /> Remove
                  </Button>
                )}
                {input.backgroundImageUrl && (
                  <div className="flex flex-1 items-center gap-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Theme tint</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={input.imageOverlayOpacity}
                      onChange={(e) => patch({ imageOverlayOpacity: Number(e.target.value) })}
                      className="w-full max-w-[140px]"
                    />
                  </div>
                )}
              </div>
              {imageError && <p className="mt-1 text-xs text-bearish">{imageError}</p>}
              <p className="mt-1 text-[10.5px] text-subtle-foreground">
                Replaces the generated background with your photo, tinted with the selected theme's colors so the
                text stays readable.
              </p>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                id="ra2-show-compliance"
                type="checkbox"
                checked={input.showCompliance}
                onChange={(e) => patch({ showCompliance: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="ra2-show-compliance" className="text-xs font-medium text-muted-foreground">
                Show SEBI RA name / registration / disclaimer footer
              </label>
            </div>
            {input.showCompliance && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Research Analyst / Firm Name
                  </label>
                  <Input value={input.raName} onChange={(e) => patch({ raName: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">SEBI Reg. No.</label>
                  <Input value={input.sebiRegNo} onChange={(e) => patch({ sebiRegNo: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Disclaimer</label>
                  <Textarea
                    rows={2}
                    value={input.disclaimer}
                    onChange={(e) => patch({ disclaimer: e.target.value })}
                    className="text-xs"
                  />
                  <div className="mt-1.5 flex flex-col gap-1">
                    {DISCLAIMER_PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => patch({ disclaimer: preset })}
                        className={cn(
                          "focus-ring rounded-lg border px-2.5 py-1.5 text-left text-[10.5px] leading-snug transition-colors",
                          input.disclaimer === preset
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-border-strong/40 text-muted-foreground hover:bg-hover",
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-center">
            <div className="overflow-hidden rounded-2xl shadow-md">
              <RaPoster2 ref={ref} input={input} />
            </div>
            <div className="mt-2" style={{ width: RA2_POSTER_SIZE }}>
              <PosterActions
                nodeRef={ref}
                filename={`stoqtrade-ra2-returns-${dateStr}.png`}
                shareTitle="Trusted Ideas by SEBI RA"
                width={RA2_POSTER_SIZE}
                pixelRatio={2.5}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
