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
// ~10mm margin on every side, so content never bleeds to the page edge.
const PAGE_MARGIN_PT = 28;
const USABLE_WIDTH_PT = A4_WIDTH_PT - PAGE_MARGIN_PT * 2;
const USABLE_HEIGHT_PT = A4_HEIGHT_PT - PAGE_MARGIN_PT * 2;

// A flex-column container only counts as a "list" worth breaking inside —
// as opposed to a small, cohesive box (the analyst-info card, the "for
// further queries" contact card) that should always stay intact — once it
// has at least this many rows.
const MIN_LIST_ITEMS_FOR_SAFE_BREAK = 5;

// Y-coordinates (CSS px, relative to `root`'s own top edge) where it's
// visually safe to start a new page — the top edge of any direct child of
// `root` (letterhead, AI summary blurb, the bento grid itself, ...), of any
// direct child of a CSS grid nested inside it (each bento card), or of any
// direct child of a genuinely long flex-column list nested inside it (each
// disclaimer paragraph, each row in a card's own 5+-item list) — so a page
// break lands between cards/paragraphs/rows rather than through the middle
// of one wherever there's a reasonable candidate nearby, without ever
// splitting a small info box apart.
function findSafeBreaks(root: HTMLElement): number[] {
  const rootTop = root.getBoundingClientRect().top;
  const candidates = new Set<number>();
  Array.from(root.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rootTop));
  root.querySelectorAll(":scope .grid").forEach((grid) => {
    Array.from(grid.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rootTop));
  });
  root.querySelectorAll(":scope .flex.flex-col").forEach((list) => {
    if (list.children.length < MIN_LIST_ITEMS_FOR_SAFE_BREAK) return;
    Array.from(list.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rootTop));
  });
  return Array.from(candidates)
    .filter((y) => y > 0)
    .sort((a, b) => a - b);
}

// Fallback candidates for when no card/row-level safe break (findSafeBreaks)
// is close enough to the target — the top edge of every individual wrapped
// text line in `root` (via Range.getClientRects(), which reports one rect
// per visual line, not per DOM node). Free-text blocks like a manually
// typed commentary paragraph aren't broken into per-item safe breaks, so
// without this, a long one could force a raw, unsnapped cut that lands mid
// line and slices letters in half. Line tops are a much denser set than the
// card-level breaks, so they're only consulted as a fallback — see paginate.
function findLineBreaks(root: HTMLElement): number[] {
  const rootTop = root.getBoundingClientRect().top;
  const candidates = new Set<number>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const range = document.createRange();
  let node: Node | null;
  while ((node = walker.nextNode())) {
    range.selectNodeContents(node);
    Array.from(range.getClientRects()).forEach((rect) => candidates.add(rect.top - rootTop));
  }
  return Array.from(candidates)
    .filter((y) => y > 0)
    .sort((a, b) => a - b);
}

// Walks down the content in target increments of `pageHeight`, snapping
// each cut to the latest safe break at or before that target — unless doing
// so would leave a page mostly empty (no safe break within `SLACK` of the
// target), in which case it falls back to the nearest text-line boundary
// (see findLineBreaks) so it still never cuts through the middle of a line,
// and only cuts at the raw target if even that isn't available. The final
// page always runs straight to the true end of the content rather than
// snapping to an earlier safe break, so a small tail (e.g. a disclaimer's
// closing note) doesn't get split into its own near-empty extra page.
function paginate(
  safeBreaks: number[],
  lineBreaks: number[],
  contentHeight: number,
  pageHeight: number,
): Array<[number, number]> {
  const SLACK = pageHeight * 0.35;
  const slices: Array<[number, number]> = [];
  let cursor = 0;
  while (cursor < contentHeight - 0.5) {
    const rawTarget = cursor + pageHeight;
    const isFinalPage = rawTarget >= contentHeight;
    const target = Math.min(rawTarget, contentHeight);
    let cut = target;
    if (!isFinalPage) {
      const candidates = safeBreaks.filter((y) => y > cursor + 1 && y <= target && target - y <= SLACK);
      if (candidates.length > 0) {
        cut = candidates[candidates.length - 1];
      } else {
        const lineCandidates = lineBreaks.filter((y) => y > cursor + 1 && y <= target);
        if (lineCandidates.length > 0) cut = lineCandidates[lineCandidates.length - 1];
      }
    }
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

export interface ReportSection {
  node: HTMLElement;
}

async function rasterizeNode(
  node: HTMLElement,
  toBlob: typeof import("html-to-image")["toBlob"],
  backgroundColor: string,
  pixelRatio: number,
) {
  const pngBlob = await toBlob(node, { pixelRatio, cacheBust: true, backgroundColor });
  if (!pngBlob) throw new Error("Could not rasterize a report page");
  const url = URL.createObjectURL(pngBlob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function cropToCanvas(
  source: HTMLImageElement,
  sourceYPx: number,
  sourceHeightPx: number,
  destWidthPx: number,
  destHeightPx: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = destWidthPx;
  canvas.height = destHeightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(source, 0, sourceYPx, source.width, sourceHeightPx, 0, 0, destWidthPx, destHeightPx);
  return canvas;
}

async function canvasToPdfImage(canvas: HTMLCanvasElement, pdfDoc: import("pdf-lib").PDFDocument) {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode a page image"))), "image/png"),
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return pdfDoc.embedPng(bytes);
}

// Same idea as exportNodesToPdf, but instead of one (potentially very tall,
// non-standard-size) PDF page per node, each section is laid out on proper,
// margined A4 pages — for reports meant to be printed or read like a real
// document rather than a single long screenshot.
export async function exportReportToPdf(sections: ReportSection[], filename: string) {
  const [{ toBlob }, { PDFDocument }] = await Promise.all([import("html-to-image"), import("pdf-lib")]);

  const backgroundColor =
    getComputedStyle(document.documentElement).getPropertyValue("--bg-surface").trim() || "#ffffff";
  const pixelRatio = 2;

  const pdfDoc = await PDFDocument.create();

  for (const { node } of sections) {
    const fullImage = await rasterizeNode(node, toBlob, backgroundColor, pixelRatio);
    const contentRect = node.getBoundingClientRect();

    const safeBreaksPx = findSafeBreaks(node);
    const lineBreaksPx = findLineBreaks(node);
    const pageHeightPx = USABLE_HEIGHT_PT * (contentRect.width / USABLE_WIDTH_PT);
    const slices = paginate(safeBreaksPx, lineBreaksPx, contentRect.height, pageHeightPx);

    for (const [startPx, endPx] of slices) {
      const sliceHeightPx = endPx - startPx;
      if (sliceHeightPx <= 0.5) continue;

      const canvas = cropToCanvas(
        fullImage,
        startPx * pixelRatio,
        sliceHeightPx * pixelRatio,
        fullImage.width,
        Math.round(sliceHeightPx * pixelRatio),
      );
      const sliceImage = await canvasToPdfImage(canvas, pdfDoc);

      const drawHeight = USABLE_WIDTH_PT * (canvas.height / canvas.width);
      const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
      page.drawImage(sliceImage, {
        x: PAGE_MARGIN_PT,
        y: A4_HEIGHT_PT - PAGE_MARGIN_PT - drawHeight,
        width: USABLE_WIDTH_PT,
        height: drawHeight,
      });
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
