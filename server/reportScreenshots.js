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

// Captures the report card and its disclaimer page as PNGs straight off the
// live page (same [data-export-node] markers the interactive "Export PDF"
// button's DOM refs point at), then assembles them into a 2-page PDF with
// pdf-lib — the same library src/lib/exportPdf.ts uses client-side, just
// driven server-side since there's no browser here to run html-to-image in.
export async function captureReportPdf(origin, reportKey) {
  const config = REPORT_CAPTURE_CONFIG[reportKey];
  if (!config) throw new Error(`Unknown report "${reportKey}"`);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // Tall enough that the report card never exceeds the viewport — if it
    // did, Puppeteer's elementHandle.screenshot() would need to internally
    // resize/re-layout the page to capture the full element, and the page's
    // `position: sticky` header ends up bleeding into that capture (verified
    // live) since it's re-anchored to the top of the taller viewport.
    await page.setViewport({ width: 1400, height: 6000, deviceScaleFactor: 2 });
    await page.goto(`${origin}${config.path}?export=1`, { waitUntil: "networkidle0", timeout: 60_000 });

    // The page only adds this marker once its forced data refresh has
    // actually landed and export mode is active — see isExportCapture in
    // the page component. Waiting for it (rather than just "some content
    // exists") avoids screenshotting the pre-refresh, possibly-stale first
    // paint.
    await page.waitForSelector('[data-export-ready="1"]', { timeout: 45_000 });

    const reportHandle = await page.$('[data-export-node="report"]');
    if (!reportHandle) throw new Error(`report content not found for "${reportKey}"`);
    const reportPng = await reportHandle.screenshot({ type: "png" });

    const disclaimerHandle = await page.$('[data-export-node="disclaimer"]');
    const disclaimerPng = disclaimerHandle ? await disclaimerHandle.screenshot({ type: "png" }) : null;

    const pdfDoc = await PDFDocument.create();
    for (const png of [reportPng, disclaimerPng]) {
      if (!png) continue;
      const image = await pdfDoc.embedPng(png);
      const pdfPage = pdfDoc.addPage([image.width, image.height]);
      pdfPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
    const pdfBytes = await pdfDoc.save();

    return { buffer: Buffer.from(pdfBytes), filenamePrefix: config.filenamePrefix, title: config.title };
  } finally {
    await browser.close();
  }
}
