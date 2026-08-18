import { useRef, useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Download,
  ImagePlus,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Layers,
  Image as ImageIcon,
  Hash,
  ShieldAlert,
  UserCog,
  ZoomIn,
} from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Textarea } from "../../../components/ui/Textarea";
import { Checkbox } from "../../../components/ui/Checkbox";
import { cn } from "../../../lib/utils";
import { nodeToImageFile, downloadFile } from "../../../lib/shareImage";
import { CarouselSlideCanvas, blendedImageStyle, CAROUSEL_WIDTH } from "./CarouselSlideCanvas";
import { CAROUSEL_FONTS } from "./carouselFonts";
import { CAROUSEL_FORMATS, formatById } from "./carouselFormats";
import { PAGINATION_STYLES } from "./carouselPagination";
import { DISCLAIMER_PRESETS } from "./carouselDisclaimers";
import {
  GRADIENT_PRESETS,
  SOLID_PRESETS,
  TEXT_COLOR_PRESETS,
  BLEND_MODE_PRESETS,
  FADE_EDGE_PRESETS,
} from "./carouselPresets";
import { useCarouselDeck, type CarouselSlide } from "./useCarouselDeck";
import type { ReportBranding } from "../../Premarket/useReportBranding";

const MAX_IMAGE_BYTES = 8_000_000;
const PREVIEW_WIDTH = 296;
const THUMB_WIDTH = 60;

function Section({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-subtle-foreground">
          {icon}
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function thumbBackgroundStyle(bg: CarouselSlide["background"]): React.CSSProperties {
  return bg.type === "image" ? {} : { background: bg.value };
}

export function CarouselMakerPanel({ branding }: { branding: ReportBranding }) {
  const deck = useCarouselDeck();
  const {
    slides,
    current,
    setCurrent,
    format,
    setFormat,
    paginationStyle,
    setPaginationStyle,
    showSlideNumber,
    setShowSlideNumber,
    slideNumberOpacity,
    setSlideNumberOpacity,
    logoOverride,
    setLogoOverride,
    nameOverride,
    setNameOverride,
  } = deck;
  const effectiveBranding: ReportBranding = {
    name: nameOverride.trim() || branding.name,
    logoDataUrl: logoOverride ?? branding.logoDataUrl,
  };
  const slide = slides[current];
  const canvasRef = useRef<HTMLDivElement>(null);
  const exportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blendedImageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [bgTab, setBgTab] = useState<"gradient" | "solid" | "image">(
    slide.background.type === "color" ? "solid" : slide.background.type,
  );
  const [busy, setBusy] = useState<"one" | "all" | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  function patch(patchValue: Partial<CarouselSlide>) {
    deck.updateSlide(slide.id, patchValue);
  }

  function selectSlide(i: number) {
    setCurrent(i);
    const next = slides[i];
    setBgTab(next.background.type === "color" ? "solid" : next.background.type);
  }

  function setOverlay(overlay: number) {
    if (slide.background.type !== "image") return;
    patch({ background: { ...slide.background, overlay } });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        patch({ background: { type: "image", value: reader.result, overlay: 55 } });
      }
    };
    reader.readAsDataURL(file);
  }

  function appendDisclaimer(text: string) {
    const current = slide.disclaimer.trim();
    patch({ disclaimer: current ? `${current} ${text}` : text });
  }

  function patchImage(imagePatch: Partial<NonNullable<CarouselSlide["image"]>>) {
    if (!slide.image) return;
    patch({ image: { ...slide.image, ...imagePatch } });
  }

  function toggleFadeEdge(edge: NonNullable<CarouselSlide["image"]>["fadeEdges"][number]) {
    if (!slide.image) return;
    const next = slide.image.fadeEdges.includes(edge)
      ? slide.image.fadeEdges.filter((e) => e !== edge)
      : [...slide.image.fadeEdges, edge];
    patchImage({ fadeEdges: next });
  }

  function handleBlendedImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        patch({ image: { value: reader.result, blend: "luminosity", opacity: 90, scale: 100, fadeEdges: ["top"] } });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogoOverride(reader.result);
    };
    reader.readAsDataURL(file);
  }

  // Instagram/Threads render every feed & story format off a 1080px-wide
  // source — pixelRatio is derived from the on-screen width so the exported
  // PNG lands on that exact spec width regardless of preview/thumbnail zoom.
  async function downloadCurrent() {
    if (!canvasRef.current || busy) return;
    setBusy("one");
    const pixelRatio = formatById(format).exportWidth / PREVIEW_WIDTH;
    const file = await nodeToImageFile(canvasRef.current, `carousel-slide-${current + 1}-of-${slides.length}.png`, pixelRatio);
    setBusy(null);
    if (file) downloadFile(file);
  }

  async function downloadAll() {
    if (busy) return;
    setBusy("all");
    const pixelRatio = formatById(format).exportWidth / CAROUSEL_WIDTH;
    for (let i = 0; i < slides.length; i++) {
      const node = exportRefs.current[slides[i].id];
      if (!node) continue;
      const file = await nodeToImageFile(node, `carousel-slide-${i + 1}-of-${slides.length}.png`, pixelRatio);
      if (file) downloadFile(file);
      // Small gap between downloads — firing many a[download] clicks back to
      // back gets silently dropped by some browsers' download managers.
      await new Promise((resolve) => setTimeout(resolve, 260));
    }
    setBusy(null);
  }

  const ratio = formatById(format).ratio;

  return (
    // No overflow-hidden here — the thumbnail rail's -mx-5 never actually
    // reaches the card's rounded corners (parent p-5 keeps vertical padding),
    // and an ancestor with overflow != visible would become the sticky
    // preview's containing block and break its stick-to-viewport behavior.
    <Card>
      <div className="bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              Carousel Maker<span className="text-accent">.</span>
            </h2>
            <p className="text-xs text-subtle-foreground">
              Build a multi-slide carousel with custom fonts, backgrounds and branding — ready for Instagram or
              LinkedIn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
            {CAROUSEL_FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={cn(
                  "focus-ring flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  format === f.id ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <f.icon size={13} />
                {f.label}
                <span className="text-subtle-foreground">· {f.sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Live preview — sticky on wide screens so it stays in view while
              scrolling the (often taller) editor controls next to it. */}
          <div className="flex flex-col items-center gap-3 lg:sticky lg:top-6 lg:self-start">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Sparkles size={13} className="text-accent" />
              Slide {current + 1} of {slides.length}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => selectSlide(Math.max(0, current - 1))}
                disabled={current === 0}
                className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong text-muted-foreground transition-colors hover:bg-hover disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-border">
                <CarouselSlideCanvas
                  ref={canvasRef}
                  slide={slide}
                  index={current}
                  total={slides.length}
                  format={format}
                  paginationStyle={paginationStyle}
                  showSlideNumber={showSlideNumber}
                  slideNumberOpacity={slideNumberOpacity}
                  branding={effectiveBranding}
                  width={PREVIEW_WIDTH}
                />
              </div>

              <button
                onClick={() => selectSlide(Math.min(slides.length - 1, current + 1))}
                disabled={current === slides.length - 1}
                className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong text-muted-foreground transition-colors hover:bg-hover disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex w-full max-w-[296px] flex-col gap-2.5 rounded-lg border border-border bg-surface-2 p-3">
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-subtle-foreground">
                  Page indicator
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
                  {PAGINATION_STYLES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaginationStyle(p.id)}
                      className={cn(
                        "flex-1 rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors",
                        paginationStyle === p.id
                          ? "bg-accent-bg text-accent"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Checkbox checked={showSlideNumber} onCheckedChange={() => setShowSlideNumber((v) => !v)} />
                  <Hash size={12} /> Big slide number
                </label>
              </div>
              {showSlideNumber && (
                <div>
                  <label className="mb-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                    <span>Number opacity</span>
                    <span>{slideNumberOpacity}%</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={40}
                    value={slideNumberOpacity}
                    onChange={(e) => setSlideNumberOpacity(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>
              )}
            </div>

            <div className="grid w-full max-w-[296px] grid-cols-2 gap-2 pt-1">
              <Button size="sm" onClick={downloadCurrent} disabled={busy !== null}>
                {busy === "one" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                This slide
              </Button>
              <Button variant="outline" size="sm" onClick={downloadAll} disabled={busy !== null}>
                {busy === "all" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                All ({slides.length})
              </Button>
            </div>
          </div>

          {/* Editor controls */}
          <div className="flex flex-col gap-5">
            <Section icon={<Type size={12} />} title="Content">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Eyebrow label (optional)</label>
                  <Input
                    value={slide.eyebrow}
                    onChange={(e) => patch({ eyebrow: e.target.value })}
                    placeholder="MARKET WRAP"
                    maxLength={28}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Heading</label>
                  <Textarea
                    rows={2}
                    value={slide.heading}
                    onChange={(e) => patch({ heading: e.target.value })}
                    placeholder="Your big idea here"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Body text</label>
                  <Textarea
                    rows={3}
                    value={slide.body}
                    onChange={(e) => patch({ body: e.target.value })}
                    placeholder="Add a short supporting line…"
                  />
                </div>
              </div>
            </Section>

            <Section icon={<Sparkles size={12} />} title="Font">
              <div className="grid grid-cols-2 gap-1.5">
                {CAROUSEL_FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => patch({ fontId: f.id })}
                    className={cn(
                      "focus-ring rounded-lg border px-2.5 py-2 text-left transition-colors",
                      slide.fontId === f.id ? "border-accent bg-accent-bg" : "border-border hover:bg-hover",
                    )}
                    style={{ fontFamily: f.family }}
                  >
                    <div className="text-sm font-semibold leading-tight text-foreground">{f.label}</div>
                    <div className="text-[9px] font-sans font-medium text-subtle-foreground">{f.category}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section icon={<Palette size={12} />} title="Text style">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => patch({ align: "left" })}
                    className={cn(
                      "focus-ring flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      slide.align === "left" ? "border-accent bg-accent-bg text-accent" : "border-border text-muted-foreground hover:bg-hover",
                    )}
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    onClick={() => patch({ align: "center" })}
                    className={cn(
                      "focus-ring flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      slide.align === "center" ? "border-accent bg-accent-bg text-accent" : "border-border text-muted-foreground hover:bg-hover",
                    )}
                  >
                    <AlignCenter size={14} />
                  </button>

                  <span className="mx-1 h-5 w-px bg-border" />

                  {TEXT_COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => patch({ textColor: c })}
                      className={cn(
                        "focus-ring h-6 w-6 shrink-0 rounded-full border-2",
                        slide.textColor === c ? "border-accent" : "border-transparent",
                      )}
                      style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)" }}
                      aria-label={`Use ${c}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={slide.textColor}
                    onChange={(e) => patch({ textColor: e.target.value })}
                    className="h-6 w-6 shrink-0 cursor-pointer rounded-full border border-border bg-transparent p-0"
                    title="Custom text color"
                  />
                </div>
              </div>
            </Section>

            <Section icon={<Layers size={12} />} title="Background">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
                  {(["gradient", "solid", "image"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBgTab(t)}
                      className={cn(
                        "flex-1 rounded-md px-2 py-1 text-[11px] font-semibold capitalize transition-colors",
                        bgTab === t ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {bgTab === "gradient" && (
                  <div className="grid grid-cols-6 gap-1.5">
                    {GRADIENT_PRESETS.map((g) => (
                      <button
                        key={g.id}
                        title={g.label}
                        onClick={() => patch({ background: { type: "gradient", value: g.value } })}
                        className={cn(
                          "focus-ring aspect-square rounded-lg border-2 transition-transform hover:scale-105",
                          slide.background.type === "gradient" && slide.background.value === g.value
                            ? "border-accent"
                            : "border-transparent",
                        )}
                        style={{ background: g.value }}
                      />
                    ))}
                  </div>
                )}

                {bgTab === "solid" && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {SOLID_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => patch({ background: { type: "color", value: c } })}
                        className={cn(
                          "focus-ring h-7 w-7 shrink-0 rounded-lg border-2 transition-transform hover:scale-105",
                          slide.background.type === "color" && slide.background.value === c
                            ? "border-accent"
                            : "border-transparent",
                        )}
                        style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(127,127,127,0.3)" }}
                      />
                    ))}
                    <input
                      type="color"
                      value={slide.background.type === "color" ? slide.background.value : "#111827"}
                      onChange={(e) => patch({ background: { type: "color", value: e.target.value } })}
                      className="h-7 w-7 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0"
                      title="Custom color"
                    />
                  </div>
                )}

                {bgTab === "image" && (
                  <div className="flex flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    {slide.background.type === "image" ? (
                      <>
                        <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border">
                          <img src={slide.background.value} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <ImagePlus size={13} /> Change
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => patch({ background: { type: "gradient", value: GRADIENT_PRESETS[0].value } })}
                          >
                            <Trash2 size={13} /> Remove
                          </Button>
                        </div>
                        <div>
                          <label className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                            <span>Overlay darkness (for text legibility)</span>
                            <span>{slide.background.overlay}%</span>
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={slide.background.overlay}
                            onChange={(e) => setOverlay(Number(e.target.value))}
                            className="w-full accent-accent"
                          />
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="focus-ring flex h-24 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-subtle-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        <ImagePlus size={18} />
                        <span className="text-xs font-medium">Upload background image</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Section>

            <Section
              icon={<ImageIcon size={12} />}
              title="Blended image"
              action={
                slide.image && (
                  <button
                    onClick={() => patch({ image: null })}
                    className="focus-ring flex items-center gap-1 text-[10px] font-semibold text-subtle-foreground hover:text-bearish"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                )
              }
            >
              <input
                ref={blendedImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleBlendedImageUpload}
                className="hidden"
              />
              {slide.image ? (
                <div className="flex flex-col gap-2.5">
                  <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border">
                    <div className="absolute inset-0" style={thumbBackgroundStyle(slide.background)} />
                    {slide.background.type === "image" && (
                      <img src={slide.background.value} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <img
                      src={slide.image.value}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      style={blendedImageStyle(slide.image)}
                    />
                  </div>

                  <Button variant="outline" size="sm" onClick={() => blendedImageInputRef.current?.click()}>
                    <ImagePlus size={13} /> Replace photo
                  </Button>

                  <div className="grid grid-cols-3 gap-1.5">
                    {BLEND_MODE_PRESETS.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => patchImage({ blend: b.id })}
                        className={cn(
                          "focus-ring rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-colors",
                          slide.image!.blend === b.id
                            ? "border-accent bg-accent-bg text-accent"
                            : "border-border text-muted-foreground hover:bg-hover",
                        )}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Opacity</span>
                      <span>{slide.image.opacity}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={slide.image.opacity}
                      onChange={(e) => patchImage({ opacity: Number(e.target.value) })}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ZoomIn size={11} /> Image size
                      </span>
                      <span>{slide.image.scale}%</span>
                    </label>
                    <input
                      type="range"
                      min={60}
                      max={200}
                      step={5}
                      value={slide.image.scale}
                      onChange={(e) => patchImage({ scale: Number(e.target.value) })}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Fade edges (pick any combination)
                    </label>
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
                      <button
                        onClick={() => patchImage({ fadeEdges: [] })}
                        className={cn(
                          "flex-1 rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors",
                          slide.image!.fadeEdges.length === 0
                            ? "bg-accent-bg text-accent"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        None
                      </button>
                      {FADE_EDGE_PRESETS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => toggleFadeEdge(f.id)}
                          className={cn(
                            "flex-1 rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors",
                            slide.image!.fadeEdges.includes(f.id)
                              ? "bg-accent-bg text-accent"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => blendedImageInputRef.current?.click()}
                  className="focus-ring flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-subtle-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <ImagePlus size={18} />
                  <span className="text-xs font-medium">Add a photo, blended into the design</span>
                </button>
              )}
            </Section>

            <Section
              icon={<ShieldAlert size={12} />}
              title="Disclaimer"
              action={
                slide.disclaimer && (
                  <button
                    onClick={() => patch({ disclaimer: "" })}
                    className="focus-ring flex items-center gap-1 text-[10px] font-semibold text-subtle-foreground hover:text-bearish"
                  >
                    <Trash2 size={11} /> Clear
                  </button>
                )
              }
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {DISCLAIMER_PRESETS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => appendDisclaimer(d.text)}
                      title={d.text}
                      className="focus-ring rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-accent hover:bg-accent-bg hover:text-accent"
                    >
                      + {d.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={2}
                  value={slide.disclaimer}
                  onChange={(e) => patch({ disclaimer: e.target.value })}
                  placeholder="Fine-print shown at the bottom of the slide — tap a preset above or type your own"
                  className="text-xs"
                />
              </div>
            </Section>

            <Section
              icon={<UserCog size={12} />}
              title="Branding"
              action={
                (nameOverride || logoOverride) && (
                  <button
                    onClick={() => {
                      setNameOverride("");
                      setLogoOverride(null);
                    }}
                    className="focus-ring flex items-center gap-1 text-[10px] font-semibold text-subtle-foreground hover:text-bearish"
                  >
                    <Trash2 size={11} /> Use report branding
                  </button>
                )
              }
            >
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Company name</label>
                  <Input
                    value={nameOverride}
                    onChange={(e) => setNameOverride(e.target.value)}
                    placeholder={branding.name || "stoqtrade.ai"}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Logo</label>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-app">
                      {effectiveBranding.logoDataUrl ? (
                        <img src={effectiveBranding.logoDataUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserCog size={14} className="text-subtle-foreground" />
                      )}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <ImagePlus size={13} /> Upload
                    </Button>
                    {logoOverride && (
                      <Button variant="ghost" size="sm" onClick={() => setLogoOverride(null)}>
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Checkbox checked={slide.showLogo} onCheckedChange={() => patch({ showLogo: !slide.showLogo })} />
                  Show logo on this slide
                </label>
              </div>
            </Section>
          </div>
        </div>

        {/* Pagination / slide rail */}
        <div className="-mx-5 mt-6 flex snap-x gap-2 overflow-x-auto border-t border-border px-5 pt-4 pb-1">
          {slides.map((s, i) => (
            <button
              key={s.id}
              draggable
              onDragStart={() => setDragId(s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) deck.reorderSlide(dragId, s.id);
                setDragId(null);
              }}
              onDragEnd={() => setDragId(null)}
              onClick={() => selectSlide(i)}
              className={cn(
                "group relative flex shrink-0 cursor-grab snap-start flex-col overflow-hidden rounded-lg border-2 transition-all active:cursor-grabbing",
                current === i ? "border-accent" : "border-transparent hover:border-border-strong",
                dragId === s.id && "opacity-40",
              )}
              style={{ width: THUMB_WIDTH, aspectRatio: `${ratio}` }}
            >
              <div className="absolute inset-0" style={thumbBackgroundStyle(s.background)} />
              {s.background.type === "image" && (
                <img src={s.background.value} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <span
                className="relative z-10 mt-auto p-1 text-left text-[8px] font-black"
                style={{ color: s.textColor, fontFamily: '"Inter Variable", sans-serif' }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="absolute right-0.5 top-0.5 z-10 hidden gap-0.5 group-hover:flex">
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deck.duplicateSlide(s.id);
                  }}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  title="Duplicate"
                >
                  <Copy size={8} />
                </span>
                {slides.length > 1 && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deck.removeSlide(s.id);
                    }}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-bearish"
                    title="Delete"
                  >
                    <X size={9} />
                  </span>
                )}
              </div>
            </button>
          ))}

          <button
            onClick={deck.addSlide}
            className="focus-ring flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border text-subtle-foreground transition-colors hover:border-accent hover:text-accent"
            style={{ width: THUMB_WIDTH, aspectRatio: `${ratio}` }}
            title="Add slide"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Off-screen full-resolution renders used for "download all" — kept
          out of the viewport but attached to the DOM so html-to-image can
          rasterize every slide, not just the one currently on screen. */}
      <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
        {slides.map((s, i) => (
          <CarouselSlideCanvas
            key={s.id}
            ref={(el) => {
              exportRefs.current[s.id] = el;
            }}
            slide={s}
            index={i}
            total={slides.length}
            format={format}
            paginationStyle={paginationStyle}
            showSlideNumber={showSlideNumber}
            slideNumberOpacity={slideNumberOpacity}
            branding={effectiveBranding}
          />
        ))}
      </div>
    </Card>
  );
}
