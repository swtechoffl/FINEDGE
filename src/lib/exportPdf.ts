type ToBlobOptions = NonNullable<Parameters<typeof import("html-to-image")["toBlob"]>[1]>;

// pdf-lib (and the PNG rasterization step) are only needed when a user
// actually clicks "Export PDF" — dynamically importing here keeps them out
// of the main bundle that loads for every page visit.
export async function exportNodesToPdf(nodes: HTMLElement[], filename: string, toBlobOptions?: ToBlobOptions) {
  const [{ toBlob }, { PDFDocument }] = await Promise.all([import("html-to-image"), import("pdf-lib")]);

  const backgroundColor =
    getComputedStyle(document.documentElement).getPropertyValue("--bg-surface").trim() || "#ffffff";

  const pdfDoc = await PDFDocument.create();

  for (const node of nodes) {
    const pngBlob = await toBlob(node, { pixelRatio: 2, cacheBust: true, backgroundColor, ...toBlobOptions });
    if (!pngBlob) throw new Error("Could not rasterize a report page");
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const { width, height } = pngImage;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(pngImage, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  // pdf-lib's return type is generically `Uint8Array<ArrayBufferLike>` (could
  // in principle wrap a SharedArrayBuffer), but Blob's type wants a concrete
  // `ArrayBuffer`-backed view — Uint8Array.from() guarantees a fresh, plain copy.
  const pdfBlob = new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportNodeToPdf(node: HTMLElement, filename: string, toBlobOptions?: ToBlobOptions) {
  return exportNodesToPdf([node], filename, toBlobOptions);
}

// Standard A4 page size in PDF points (1/72in) — 210mm x 297mm.
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

// Y-coordinates (CSS px, relative to `root`'s own top edge) where it's
// visually safe to start a new page — the top edge of any direct child of
// `root` (letterhead, AI summary blurb, the bento grid itself, ...) or of
// any direct child of a CSS grid nested inside it (each bento card), so a
// page break lands between cards/sections rather than through the middle
// of one wherever there's a reasonable candidate nearby.
function findSafeBreaks(root: HTMLElement): number[] {
  const rootTop = root.getBoundingClientRect().top;
  const candidates = new Set<number>();
  Array.from(root.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rootTop));
  root.querySelectorAll(":scope .grid > *").forEach((el) => candidates.add(el.getBoundingClientRect().top - rootTop));
  return Array.from(candidates)
    .filter((y) => y > 0)
    .sort((a, b) => a - b);
}

// Walks down the content in target increments of `pageHeight`, snapping
// each cut to the latest safe break at or before that target — unless doing
// so would leave a page mostly empty (no safe break within `SLACK` of the
// target), in which case it just cuts at the raw target instead.
function paginate(safeBreaks: number[], contentHeight: number, pageHeight: number): Array<[number, number]> {
  const SLACK = pageHeight * 0.35;
  const slices: Array<[number, number]> = [];
  let cursor = 0;
  while (cursor < contentHeight - 0.5) {
    const target = Math.min(cursor + pageHeight, contentHeight);
    const candidates = safeBreaks.filter((y) => y > cursor + 1 && y <= target && target - y <= SLACK);
    const cut = candidates.length > 0 ? candidates[candidates.length - 1] : target;
    slices.push([cursor, Math.min(cut, contentHeight)]);
    cursor = slices[slices.length - 1][1];
  }
  return slices;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load rasterized image"));
    img.src = src;
  });
}

// Same idea as exportNodesToPdf, but instead of one (potentially very tall,
// non-standard-size) PDF page per node, each node is sliced into as many
// standard A4 pages as its content needs — for reports meant to be printed
// or read like a real document rather than a single long screenshot.
export async function exportReportToPdf(nodes: HTMLElement[], filename: string) {
  const [{ toBlob }, { PDFDocument }] = await Promise.all([import("html-to-image"), import("pdf-lib")]);

  const backgroundColor =
    getComputedStyle(document.documentElement).getPropertyValue("--bg-surface").trim() || "#ffffff";
  const pixelRatio = 2;

  const pdfDoc = await PDFDocument.create();

  for (const node of nodes) {
    const pngBlob = await toBlob(node, { pixelRatio, cacheBust: true, backgroundColor });
    if (!pngBlob) throw new Error("Could not rasterize a report page");
    const fullImageUrl = URL.createObjectURL(pngBlob);
    let fullImage: HTMLImageElement;
    try {
      fullImage = await loadImage(fullImageUrl);
    } finally {
      URL.revokeObjectURL(fullImageUrl);
    }

    const contentRect = node.getBoundingClientRect();
    const safeBreaksPx = findSafeBreaks(node);
    const pageHeightPx = A4_HEIGHT_PT * (contentRect.width / A4_WIDTH_PT);
    const slices = paginate(safeBreaksPx, contentRect.height, pageHeightPx);

    for (const [startPx, endPx] of slices) {
      const sliceHeightPx = endPx - startPx;
      if (sliceHeightPx <= 0.5) continue;

      const canvas = document.createElement("canvas");
      canvas.width = fullImage.width;
      canvas.height = Math.round(sliceHeightPx * pixelRatio);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.drawImage(
        fullImage,
        0,
        startPx * pixelRatio,
        fullImage.width,
        sliceHeightPx * pixelRatio,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const sliceBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not crop a page slice"))), "image/png"),
      );
      const sliceBytes = new Uint8Array(await sliceBlob.arrayBuffer());
      const sliceImage = await pdfDoc.embedPng(sliceBytes);

      const drawHeight = A4_WIDTH_PT * (canvas.height / canvas.width);
      const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
      page.drawImage(sliceImage, { x: 0, y: A4_HEIGHT_PT - drawHeight, width: A4_WIDTH_PT, height: drawHeight });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
