import { useRef, useState } from "react";
import { RotateCcw, Check, X } from "lucide-react";
import { Button } from "../../components/ui/Button";

const VIEWPORT = 220; // CSS px — square crop viewport (shown as a circle, matching every place the logo is displayed)
const OUTPUT = 480; // px — exported logo resolution
const MAX_OUTPUT_BYTES = 1_000_000; // keeps the data URL sane for localStorage

function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.ceil((base64.length * 3) / 4);
}

type Offset = { x: number; y: number };
type Natural = { w: number; h: number };

// Clamps pan so the image always fully covers the square viewport — the
// smaller natural dimension is scaled to exactly fill VIEWPORT at zoom=1
// (like object-fit: cover), so the larger dimension is guaranteed >= VIEWPORT
// and these bounds can never go negative.
function clampOffset(next: Offset, zoom: number, natural: Natural): Offset {
  const baseScale = VIEWPORT / Math.min(natural.w, natural.h);
  const scale = baseScale * zoom;
  const dw = natural.w * scale;
  const dh = natural.h * scale;
  const maxX = Math.max(0, (dw - VIEWPORT) / 2);
  const maxY = Math.max(0, (dh - VIEWPORT) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, next.x)),
    y: Math.min(maxY, Math.max(-maxY, next.y)),
  };
}

export function LogoCropper({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [natural, setNatural] = useState<Natural | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origin: Offset } | null>(null);

  function handleZoomChange(z: number) {
    setZoom(z);
    if (natural) setOffset((o) => clampOffset(o, z, natural));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !natural) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset({ x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy }, zoom, natural));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleReset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleConfirm() {
    if (!natural) return;
    const baseScale = VIEWPORT / Math.min(natural.w, natural.h);
    const scale = baseScale * zoom;
    const dw = natural.w * scale;
    const dh = natural.h * scale;
    const imgLeft = (VIEWPORT - dw) / 2 + offset.x;
    const imgTop = (VIEWPORT - dh) / 2 + offset.y;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.scale(OUTPUT / VIEWPORT, OUTPUT / VIEWPORT);
      ctx.drawImage(img, imgLeft, imgTop, dw, dh);
      let dataUrl = canvas.toDataURL("image/png");
      if (estimateDataUrlBytes(dataUrl) > MAX_OUTPUT_BYTES) {
        dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      }
      if (estimateDataUrlBytes(dataUrl) > MAX_OUTPUT_BYTES) {
        setError("Cropped logo is still too large — try a simpler image.");
        return;
      }
      onConfirm(dataUrl);
    };
    img.onerror = () => setError("Couldn't process that image.");
    img.src = imageSrc;
  }

  const displayStyle = natural
    ? (() => {
        const baseScale = VIEWPORT / Math.min(natural.w, natural.h);
        const scale = baseScale * zoom;
        const dw = natural.w * scale;
        const dh = natural.h * scale;
        return { width: dw, height: dh, left: (VIEWPORT - dw) / 2 + offset.x, top: (VIEWPORT - dh) / 2 + offset.y };
      })()
    : undefined;

  return (
    <>
      <div className="animate-fade-in fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="animate-scale-in flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-sm font-bold text-foreground">Adjust Logo</span>
            <button
              onClick={onCancel}
              className="focus-ring rounded-full p-1.5 text-subtle-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 px-5 py-5">
            <div
              className="relative touch-none select-none overflow-hidden rounded-full border border-border-strong bg-app"
              style={{ width: VIEWPORT, height: VIEWPORT, cursor: natural ? "grab" : "default" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <img
                src={imageSrc}
                alt="Logo to crop"
                draggable={false}
                onLoad={(e) => {
                  const t = e.currentTarget;
                  setNatural({ w: t.naturalWidth, h: t.naturalHeight });
                }}
                className="pointer-events-none absolute select-none"
                style={displayStyle}
              />
            </div>

            <div className="flex w-full items-center gap-3">
              <span className="text-xs text-subtle-foreground">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer accent-accent"
              />
              <button
                onClick={handleReset}
                className="focus-ring shrink-0 rounded-full p-1.5 text-subtle-foreground hover:bg-hover hover:text-foreground"
                title="Reset"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {error && <p className="text-xs text-bearish">{error}</p>}

            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={!natural}>
                <Check size={14} /> Use Logo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
