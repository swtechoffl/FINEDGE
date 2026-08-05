import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

// A trailing final page shorter than this fraction of a full page looks
// broken (mostly blank with one stray item), so paginate() rebalances it
// against the page before it rather than leaving it this sparse.
const MIN_TRAILING_PAGE_RATIO = 0.3;

// Walks down the content in target increments of `pageHeight`, snapping
// each cut to the latest safe break (a card/section/paragraph edge) at or
// before that target — unless doing so would leave a page mostly empty (no
// safe break within SLACK of the target), in which case it falls back to
// the nearest text-line boundary (layout.lineBreaks) so it still never cuts
// through the middle of a line, and only cuts at the raw target if even
// that isn't available. The final page always runs straight to the true
// end of the content rather than snapping to an earlier safe break, so a
// small tail (e.g. a disclaimer's closing note) doesn't get split into its
// own near-empty extra page — but when the true remainder still doesn't
// fill a whole page on its own (the content just doesn't divide evenly),
// the last two pages are rebalanced to split their combined content near
// the midpoint instead of leaving a nearly-blank final page.
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

  if (slices.length >= 2) {
    const last = slices[slices.length - 1];
    const lastHeight = last[1] - last[0];
    if (lastHeight < pageHeight * MIN_TRAILING_PAGE_RATIO) {
      const prev = slices[slices.length - 2];
      const combinedStart = prev[0];
      const combinedEnd = last[1];
      const midpoint = combinedStart + (combinedEnd - combinedStart) / 2;
      const closestTo = (arr) =>
        arr.length > 0 ? arr.reduce((best, y) => (Math.abs(y - midpoint) < Math.abs(best - midpoint) ? y : best)) : null;
      const nearbySafe = safeBreaks.filter((y) => y > combinedStart + 1 && y < combinedEnd - 1);
      const nearbyLine = lineBreaks.filter((y) => y > combinedStart + 1 && y < combinedEnd - 1);
      const newCut = closestTo(nearbySafe) ?? closestTo(nearbyLine) ?? midpoint;
      slices[slices.length - 2] = [combinedStart, newCut];
      slices[slices.length - 1] = [newCut, combinedEnd];
    }
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

      // True if `el` sits inside another .grid before reaching root — i.e.
      // it's a card's own internal multi-column body, not the outer
      // page-level bento layout. Only the outermost grid's direct children
      // (whole cards) are safe to break between; an inner grid's own
      // children are typically a header alongside a body, or side-by-side
      // columns of a single card, so treating their tops as page breaks
      // would split a card's own header from its body.
      const hasAncestorGrid = (el) => {
        let cur = el.parentElement;
        while (cur && cur !== root) {
          if (cur.matches(".grid")) return true;
          cur = cur.parentElement;
        }
        return false;
      };
      root.querySelectorAll(".grid").forEach((grid) => {
        if (hasAncestorGrid(grid)) return;
        Array.from(grid.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rect.top));
      });

      // A grid's side-by-side lists (e.g. OI Buildup's four columns, IPO
      // Watch's "Currently Open"/"Recently Closed") only get their own
      // per-row candidates when every list sharing that grid has the SAME
      // item count — i.e. the rows are actually aligned across columns.
      // When column lengths differ (2-item "Currently Open" vs 5-item
      // "Recently Closed"), a row boundary in the longer column doesn't
      // correspond to any boundary in the shorter one, so breaking there
      // would still slice through the shorter column's row — so those are
      // left to the coarser card-level candidate above instead.
      const gridScopedLists = new Set();
      root.querySelectorAll(".grid").forEach((grid) => {
        const columnLists = Array.from(grid.children)
          .map((cell) => (cell.matches(".flex.flex-col") ? cell : cell.querySelector(".flex.flex-col")))
          .filter((list) => list && list.children.length > 0);
        columnLists.forEach((list) => gridScopedLists.add(list));
        if (columnLists.length < 2) return;
        const firstCount = columnLists[0].children.length;
        const rowAligned = columnLists.every((list) => list.children.length === firstCount);
        if (!rowAligned) return;
        columnLists.forEach((list) => {
          if (list.children.length < minListItems) return;
          Array.from(list.children).forEach((el) => candidates.add(el.getBoundingClientRect().top - rect.top));
        });
      });
      root.querySelectorAll(".flex.flex-col").forEach((list) => {
        if (gridScopedLists.has(list)) return;
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

// Screenshots `selector` as a single image and places it on exactly one PDF
// page sized to the content's own height (at the standard A4 width) —
// mirrors the "fit" mode in src/lib/exportPdf.ts. Used for the disclaimer,
// which should never split across pages or leave a page mostly blank; the
// page grows/shrinks to the content instead of shrinking the content to
// fit a fixed A4 height.
async function addFitNodeToPdf(page, pdfDoc, selector) {
  const layout = await measureLayout(page, selector);
  if (!layout) return;

  const clipBuffer = await page.screenshot({
    type: "png",
    clip: { x: layout.x, y: layout.y, width: layout.width, height: layout.height },
  });
  const image = await pdfDoc.embedPng(clipBuffer);
  const drawWidth = USABLE_WIDTH_PT;
  const drawHeight = USABLE_WIDTH_PT * (layout.height / layout.width);
  const pdfPage = pdfDoc.addPage([A4_WIDTH_PT, drawHeight + PAGE_MARGIN_PT * 2]);
  pdfPage.drawImage(image, { x: PAGE_MARGIN_PT, y: PAGE_MARGIN_PT, width: drawWidth, height: drawHeight });
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

// Stamps "Page X of Y" centered in the bottom margin of every page already
// added to pdfDoc — done as a final pass over the whole document (after
// both the report's and the disclaimer's pages are in) so numbering is
// continuous across the two rather than resetting per section.
async function drawPageNumbers(pdfDoc) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const total = pages.length;
  const fontSize = 8;
  const color = rgb(0.55, 0.55, 0.58);
  pages.forEach((page, i) => {
    const text = `Page ${i + 1} of ${total}`;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: (A4_WIDTH_PT - textWidth) / 2,
      y: PAGE_MARGIN_PT / 2 - fontSize / 2,
      size: fontSize,
      font,
      color,
    });
  });
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
    if (hasDisclaimer) await addFitNodeToPdf(page, pdfDoc, '[data-export-node="disclaimer"]');

    await drawPageNumbers(pdfDoc);

    const pdfBytes = await pdfDoc.save();
    return { buffer: Buffer.from(pdfBytes), filenamePrefix: config.filenamePrefix, title: config.title };
  } finally {
    await browser.close();
  }
}
