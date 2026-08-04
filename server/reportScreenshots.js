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
// each cut to the latest safe break (a card/section/paragraph edge) at or
// before that target — unless doing so would leave a page mostly empty (no
// safe break within SLACK of the target), in which case it falls back to
// the nearest text-line boundary (layout.lineBreaks) so it still never cuts
// through the middle of a line, and only cuts at the raw target if even
// that isn't available. The final page always runs straight to the true
// end of the content rather than snapping to an earlier safe break, so a
// small tail (e.g. a disclaimer's closing note) doesn't get split into its
// own near-empty extra page.
function paginate(safeBreaks, lineBreaks, contentHeight, pageHeight) {
  const SLACK = pageHeight * 0.35;
  const slices = [];
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

// A flex-column container only counts as a "list" worth breaking inside —
// as opposed to a small, cohesive box (the analyst-info card, the "for
// further queries" contact card) that should always stay intact — once it
// has at least this many rows.
const MIN_LIST_ITEMS_FOR_SAFE_BREAK = 5;

async function measureLayout(page, selector) {
  return page.evaluate(
    (sel, minListItems) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      const rect = root.getBoundingClientRect();
      const candidates = new Set();
      Array.from(root.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rect.top));
      root.querySelectorAll(".grid").forEach((grid) => {
        Array.from(grid.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rect.top));
      });
      root.querySelectorAll(".flex.flex-col").forEach((list) => {
        if (list.children.length < minListItems) return;
        Array.from(list.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rect.top));
      });
      const safeBreaks = Array.from(candidates)
        .filter((y) => y > 0)
        .sort((a, b) => a - b);

      // Fallback candidates for when no card/row-level safe break above is
      // close enough to a page target — the top of every individual
      // wrapped text line in root (one rect per visual line via
      // Range.getClientRects(), not per DOM node). Free-text blocks like a
      // manually typed commentary paragraph aren't broken into per-item
      // safe breaks, so without this a long one could force a raw,
      // unsnapped cut that lands mid-line and slices letters in half.
      const lineCandidates = new Set();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => (node.textContent && node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
      });
      const range = document.createRange();
      let node;
      while ((node = walker.nextNode())) {
        range.selectNodeContents(node);
        Array.from(range.getClientRects()).forEach((r) => lineCandidates.add(r.top - rect.top));
      }
      const lineBreaks = Array.from(lineCandidates)
        .filter((y) => y > 0)
        .sort((a, b) => a - b);

      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, safeBreaks, lineBreaks };
    },
    selector,
    MIN_LIST_ITEMS_FOR_SAFE_BREAK,
  );
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
  const slices = paginate(layout.safeBreaks, layout.lineBreaks, layout.height, pageHeightPx);

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

// Renders the full report page in a headless browser, force-refreshed and
// switched into export mode via ?export=1, and paginates both the report
// card and its disclaimer page across as many standard A4 pages as each
// needs — same algorithm as the interactive "Export PDF" button.
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
