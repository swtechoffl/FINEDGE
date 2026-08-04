import { PDFDocument } from "pdf-lib";
import { launchBrowser } from "./posterScreenshots.js";

// Which report page to capture, keyed by the value n8n/the caller passes.
// `path` gets `?export=1` appended, which the page reads on mount to force
// a live data refresh and switch straight into "export mode" (hides
// interactive-only affordances like remove buttons and the manual-add
// forms) without needing a real click — see PremarketPage.tsx/
// PostMarketPage.tsx's isExportCapture handling.
export const REPORT_CAPTURE_CONFIG = {
  premarket: { path: "/premarket", filenamePrefix: "premarket-report", title: "Premarket Report" },
  postmarket: { path: "/postmarket", filenamePrefix: "postmarket-report", title: "Post Market Report" },
};

// Standard A4 page size in PDF points (1/72in) — 210mm x 297mm. Mirrors the
// same constants/algorithm src/lib/exportPdf.ts uses client-side for the
// interactive "Export PDF" button, so both paths lay out identically.
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
// ~10mm margin on every side, so content never bleeds to the page edge.
const PAGE_MARGIN_PT = 28;
const USABLE_WIDTH_PT = A4_WIDTH_PT - PAGE_MARGIN_PT * 2;
const USABLE_HEIGHT_PT = A4_HEIGHT_PT - PAGE_MARGIN_PT * 2;

// Walks down the content in target increments of `pageHeight`, snapping
// each cut to the latest safe break (a card/section edge) at or before that
// target — unless doing so would leave a page mostly empty (no safe break
// within SLACK of the target), in which case it just cuts at the raw target.
function paginate(safeBreaks, contentHeight, pageHeight) {
  const SLACK = pageHeight * 0.35;
  const slices = [];
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

async function measureLayout(page, selector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return null;
    const rect = root.getBoundingClientRect();
    const candidates = new Set();
    Array.from(root.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rect.top));
    root.querySelectorAll(".grid > *").forEach((el) => candidates.add(el.getBoundingClientRect().top - rect.top));
    const safeBreaks = Array.from(candidates)
      .filter((y) => y > 0)
      .sort((a, b) => a - b);
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, safeBreaks };
  }, selector);
}

// Measures `selector`'s own bounding box plus every safe page-break
// candidate inside it (the top edge of each of its direct children, and of
// each direct child of any CSS grid nested inside it — i.e. every bento
// card), then screenshots it as a sequence of A4-page-sized clips (snapped
// to those safe breaks where possible, each drawn within the page margin)
// and adds each as its own page to `pdfDoc`.
async function addPaginatedNodeToPdf(page, pdfDoc, selector) {
  const layout = await measureLayout(page, selector);
  if (!layout) return;

  const pageHeightPx = USABLE_HEIGHT_PT * (layout.width / USABLE_WIDTH_PT);
  const slices = paginate(layout.safeBreaks, layout.height, pageHeightPx);

  for (const [startPx, endPx] of slices) {
    const sliceHeightPx = endPx - startPx;
    if (sliceHeightPx <= 0.5) continue;
    const clipBuffer = await page.screenshot({
      type: "png",
      clip: { x: layout.x, y: layout.y + startPx, width: layout.width, height: sliceHeightPx },
    });
    const image = await pdfDoc.embedPng(clipBuffer);
    const drawHeight = USABLE_WIDTH_PT * (sliceHeightPx / layout.width);
    const pdfPage = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    pdfPage.drawImage(image, {
      x: PAGE_MARGIN_PT,
      y: A4_HEIGHT_PT - PAGE_MARGIN_PT - drawHeight,
      width: USABLE_WIDTH_PT,
      height: drawHeight,
    });
  }
}

// Like addPaginatedNodeToPdf, but forces everything onto exactly one page —
// scaled down (never cropped) to fit the usable area on whichever axis is
// more constraining, then centered. Used for the disclaimer: shorter,
// linear content that reads better as a single page than spread thin
// across two or three.
async function addFitToOnePagePdf(page, pdfDoc, selector) {
  const layout = await measureLayout(page, selector);
  if (!layout) return;

  const clipBuffer = await page.screenshot({
    type: "png",
    clip: { x: layout.x, y: layout.y, width: layout.width, height: layout.height },
  });
  const image = await pdfDoc.embedPng(clipBuffer);

  const scale = Math.min(USABLE_WIDTH_PT / layout.width, USABLE_HEIGHT_PT / layout.height);
  const drawWidth = layout.width * scale;
  const drawHeight = layout.height * scale;
  const pdfPage = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  pdfPage.drawImage(image, {
    x: (A4_WIDTH_PT - drawWidth) / 2,
    y: A4_HEIGHT_PT - PAGE_MARGIN_PT - drawHeight,
    width: drawWidth,
    height: drawHeight,
  });
}

// Renders the full report page in a headless browser, force-refreshed and
// switched into export mode via ?export=1, and lays out the report card
// (paginated across as many standard A4 pages as it needs) and its
// disclaimer page (forced onto a single page) — same algorithm as the
// interactive "Export PDF" button.
export async function captureReportPdf(origin, reportKey) {
  const config = REPORT_CAPTURE_CONFIG[reportKey];
  if (!config) throw new Error(`Unknown report "${reportKey}"`);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // Tall enough that the report card never exceeds the viewport — if it
    // did, capturing it would need an internal resize/re-layout, and the
    // page's `position: sticky` header ends up bleeding into that capture
    // (verified live) since it's re-anchored to the top of the taller
    // viewport. No scrolling ever happens at this height, so clip
    // coordinates from getBoundingClientRect() stay valid page coordinates.
    await page.setViewport({ width: 1400, height: 6000, deviceScaleFactor: 2 });
    await page.goto(`${origin}${config.path}?export=1`, { waitUntil: "networkidle0", timeout: 60_000 });

    // The page only adds this marker once its forced data refresh has
    // actually landed and export mode is active — see isExportCapture in
    // the page component. Waiting for it (rather than just "some content
    // exists") avoids screenshotting the pre-refresh, possibly-stale first
    // paint.
    await page.waitForSelector('[data-export-ready="1"]', { timeout: 45_000 });

    const pdfDoc = await PDFDocument.create();
    const hasReport = await page.$('[data-export-node="report"]');
    if (!hasReport) throw new Error(`report content not found for "${reportKey}"`);
    await addPaginatedNodeToPdf(page, pdfDoc, '[data-export-node="report"]');

    const hasDisclaimer = await page.$('[data-export-node="disclaimer"]');
    if (hasDisclaimer) await addFitToOnePagePdf(page, pdfDoc, '[data-export-node="disclaimer"]');

    const pdfBytes = await pdfDoc.save();
    return { buffer: Buffer.from(pdfBytes), filenamePrefix: config.filenamePrefix, title: config.title };
  } finally {
    await browser.close();
  }
}
