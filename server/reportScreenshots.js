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
// interactive "Export PDF" button, so both paths paginate identically.
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

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

// Measures `selector`'s own bounding box plus every safe page-break
// candidate inside it (the top edge of each of its direct children, and of
// each direct child of any CSS grid nested inside it — i.e. every bento
// card), then screenshots it as a sequence of A4-page-sized clips (snapped
// to those safe breaks where possible) and adds each as its own page to
// `pdfDoc`.
async function addPaginatedNodeToPdf(page, pdfDoc, selector) {
  const layout = await page.evaluate((sel) => {
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
  if (!layout) return;

  const pageHeightPx = A4_HEIGHT_PT * (layout.width / A4_WIDTH_PT);
  const slices = paginate(layout.safeBreaks, layout.height, pageHeightPx);

  for (const [startPx, endPx] of slices) {
    const sliceHeightPx = endPx - startPx;
    if (sliceHeightPx <= 0.5) continue;
    const clipBuffer = await page.screenshot({
      type: "png",
      clip: { x: layout.x, y: layout.y + startPx, width: layout.width, height: sliceHeightPx },
    });
    const image = await pdfDoc.embedPng(clipBuffer);
    const drawHeight = A4_WIDTH_PT * (sliceHeightPx / layout.width);
    const pdfPage = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    pdfPage.drawImage(image, { x: 0, y: A4_HEIGHT_PT - drawHeight, width: A4_WIDTH_PT, height: drawHeight });
  }
}

// Renders the full report page in a headless browser, force-refreshed and
// switched into export mode via ?export=1, and paginates the report card
// and its disclaimer page across as many standard A4 pages as each needs
// (same algorithm as the interactive "Export PDF" button).
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
    if (hasDisclaimer) await addPaginatedNodeToPdf(page, pdfDoc, '[data-export-node="disclaimer"]');

    const pdfBytes = await pdfDoc.save();
    return { buffer: Buffer.from(pdfBytes), filenamePrefix: config.filenamePrefix, title: config.title };
  } finally {
    await browser.close();
  }
}
