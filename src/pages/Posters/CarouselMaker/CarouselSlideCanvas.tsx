import { forwardRef, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronRight } from "lucide-react";
import { fontById } from "./carouselFonts";
import { formatById, type CarouselFormatId } from "./carouselFormats";
import type { PaginationStyleId } from "./carouselPagination";
import type { CarouselSlide, SlideImage } from "./useCarouselDeck";
import type { ReportBranding } from "../../Premarket/useReportBranding";

export const CAROUSEL_WIDTH = 300;

const FADE_DIRECTIONS: Record<SlideImage["fadeEdges"][number], string> = {
  top: "to top",
  bottom: "to bottom",
  left: "to left",
  right: "to right",
};

const HEADING_WEIGHT_VALUES: Record<CarouselSlide["headingWeight"], number> = {
  normal: 400,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};

// Shared by the full slide canvas and the small preview swatch in the editor
// so the blend mode / opacity / scale / edge-fade always render identically
// in both.
export function blendedImageStyle(image: SlideImage): CSSProperties {
  // translate() runs before scale() is applied (transforms compose
  // right-to-left) so the pan percentage always maps to the same on-screen
  // distance regardless of the current zoom level.
  const transform = `translate(${image.offsetX}%, ${image.offsetY}%) scale(${image.scale / 100})`;
  if (image.fadeEdges.length === 0) {
    return { mixBlendMode: image.blend, opacity: image.opacity / 100, transform };
  }
  // Each edge gets its own fade-to-transparent gradient layered as a
  // separate mask; "intersect" multiplies their alphas together instead of
  // the CSS default "add" (union), so a pixel fades if it's close to ANY
  // selected edge rather than only where every layer agrees — e.g.
  // top+left correctly vignettes that corner instead of barely fading at all.
  const maskImage = image.fadeEdges
    .map((edge) => `linear-gradient(${FADE_DIRECTIONS[edge]}, black 0%, black 42%, transparent 96%)`)
    .join(", ");
  return {
    mixBlendMode: image.blend,
    opacity: image.opacity / 100,
    transform,
    WebkitMaskImage: maskImage,
    maskImage,
    maskComposite: "intersect",
  };
}

function clampOffset(v: number) {
  return Math.min(50, Math.max(-50, v));
}

function PaginationIndicator({
  style,
  index,
  total,
  color,
  width,
}: {
  style: PaginationStyleId;
  index: number;
  total: number;
  color: string;
  width: number;
}) {
  if (style === "none" || total <= 1) return null;

  if (style === "fraction") {
    return (
      <span className="font-bold tabular-nums" style={{ fontSize: width * 0.032, color, opacity: 0.8 }}>
        {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </span>
    );
  }

  if (style === "bars") {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all"
            style={{
              height: Math.max(3, width * 0.012),
              width: width * 0.05,
              background: color,
              opacity: i === index ? 0.95 : 0.28,
            }}
          />
        ))}
      </div>
    );
  }

  // dots
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            height: Math.max(4, width * 0.016),
            width: i === index ? width * 0.045 : Math.max(4, width * 0.016),
            background: color,
            opacity: i === index ? 0.95 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

export const CarouselSlideCanvas = forwardRef<
  HTMLDivElement,
  {
    slide: CarouselSlide;
    index: number;
    total: number;
    format: CarouselFormatId;
    paginationStyle: PaginationStyleId;
    showSlideNumber: boolean;
    slideNumberOpacity: number; // 0-100
    branding: ReportBranding;
    width?: number;
    // When provided, the blended image becomes drag-to-reposition in this
    // render (used for the live editor preview only — export/thumbnail
    // renders omit it and stay static).
    onImageOffsetChange?: (offsetX: number, offsetY: number) => void;
  }
>(function CarouselSlideCanvas(
  {
    slide,
    index,
    total,
    format,
    paginationStyle,
    showSlideNumber,
    slideNumberOpacity,
    branding,
    width = CAROUSEL_WIDTH,
    onImageOffsetChange,
  },
  ref,
) {
  const font = fontById(slide.fontId);
  const ratio = formatById(format).ratio;
  const isImage = slide.background.type === "image";
  const backgroundStyle = isImage ? undefined : { background: slide.background.value };
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  function handleImagePointerDown(e: ReactPointerEvent<HTMLImageElement>) {
    if (!onImageOffsetChange || !slide.image) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: slide.image.offsetX, originY: slide.image.offsetY };
  }

  function handleImagePointerMove(e: ReactPointerEvent<HTMLImageElement>) {
    if (!dragRef.current || !onImageOffsetChange) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const boxHeight = width / ratio;
    onImageOffsetChange(
      clampOffset(dragRef.current.originX + (dx / width) * 100),
      clampOffset(dragRef.current.originY + (dy / boxHeight) * 100),
    );
  }

  function handleImagePointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      ref={ref}
      data-carousel-slide={slide.id}
      className="relative flex shrink-0 flex-col overflow-hidden"
      style={{ width, aspectRatio: `${ratio}`, fontFamily: font.family, ...backgroundStyle }}
    >
      {isImage && slide.background.type === "image" && (
        <>
          <img src={slide.background.value} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(185deg, rgba(0,0,0,${Math.min(
                0.85,
                slide.background.overlay / 130,
              )}) 0%, rgba(0,0,0,${Math.min(0.95, slide.background.overlay / 100)}) 100%)`,
            }}
          />
        </>
      )}

      {slide.image && (
        <img
          src={slide.image.value}
          alt=""
          draggable={false}
          className={`absolute inset-0 h-full w-full object-cover${
            onImageOffsetChange ? " cursor-grab touch-none active:cursor-grabbing" : ""
          }`}
          style={blendedImageStyle(slide.image)}
          onPointerDown={handleImagePointerDown}
          onPointerMove={handleImagePointerMove}
          onPointerUp={handleImagePointerUp}
          onPointerCancel={handleImagePointerUp}
        />
      )}

      {/* decorative oversized slide index, purely typographic */}
      {showSlideNumber && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[3%] -top-[4%] select-none font-black leading-none"
          style={{ fontSize: width * 0.46, color: slide.textColor, opacity: slideNumberOpacity / 100 }}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
      )}

      {/* pointer-events-none: purely decorative text/branding overlay with no
          interactive children — without this it sits over the full card and
          swallows the pointer events the blended image needs for drag-to-reposition. */}
      <div className="relative flex h-full flex-col pointer-events-none" style={{ padding: width * 0.075 }}>
        <div className="flex items-center justify-between gap-2">
          {slide.eyebrow ? (
            <span
              className="rounded-full font-bold uppercase tracking-wide"
              style={{
                fontSize: width * 0.032,
                padding: `${width * 0.016}px ${width * 0.028}px`,
                background: `${slide.textColor}1f`,
                color: slide.textColor,
                border: `1px solid ${slide.textColor}40`,
              }}
            >
              {slide.eyebrow}
            </span>
          ) : (
            <span />
          )}
          {slide.showLogo && branding.logoDataUrl && (
            <img
              src={branding.logoDataUrl}
              alt=""
              className="shrink-0 rounded-lg object-cover"
              style={{ width: width * 0.09, height: width * 0.09, boxShadow: `0 0 0 2px ${slide.textColor}40` }}
            />
          )}
        </div>

        <div
          className={`mt-auto flex flex-col gap-2 ${slide.align === "center" ? "items-center text-center" : "items-start text-left"}`}
        >
          {slide.heading && (
            <div
              className="whitespace-pre-wrap leading-[1.08] tracking-tight"
              style={{
                fontSize: width * 0.115 * (slide.headingSize / 100),
                fontWeight: HEADING_WEIGHT_VALUES[slide.headingWeight],
                color: slide.textColor,
              }}
            >
              {slide.heading}
            </div>
          )}
          {slide.body && (
            <div
              className="whitespace-pre-wrap font-medium leading-snug"
              style={{
                fontSize: width * 0.042 * (slide.bodySize / 100),
                color: slide.textColor,
                opacity: 0.85,
                maxWidth: "92%",
              }}
            >
              {slide.body}
            </div>
          )}
        </div>

        {slide.disclaimer && (
          <div
            className="mt-2 whitespace-pre-wrap leading-snug"
            style={{ fontSize: width * 0.024, color: slide.textColor, opacity: 0.5 }}
          >
            {slide.disclaimer}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className="truncate font-semibold"
            style={{ fontSize: width * 0.03, color: slide.textColor, opacity: 0.55 }}
          >
            {branding.name || "stoqtrade.ai"}
          </span>
          <div className="flex items-center gap-2.5">
            <PaginationIndicator style={paginationStyle} index={index} total={total} color={slide.textColor} width={width} />
            {index < total - 1 && <ChevronRight size={width * 0.045} style={{ color: slide.textColor, opacity: 0.55 }} />}
          </div>
        </div>
      </div>
    </div>
  );
});
