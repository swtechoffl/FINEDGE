import puppeteer from "puppeteer-core";

// The 5 "pre-market context" posters from GlobalMarketPosters.tsx, in the
// order they should appear in the Telegram album. Deliberately excludes
// index-option-chain and market-breadth from that same component — those
// read as intraday/prior-session data rather than a pre-market briefing.
const TELEGRAM_POSTER_IDS = [
  "gift-nifty-vix-currency",
  "global-indices",
  "commodities",
  "nifty-pivot-levels",
  "fii-dii-activity",
];

// Windows/macOS/Linux default Chrome install locations, checked in order —
// used only for local dev; production always goes through @sparticuz/chromium.
const LOCAL_CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
];

export async function launchBrowser() {
  if (process.env.VERCEL) {
    // @sparticuz/chromium ships a Lambda/Vercel-function-compatible Chromium
    // build inside the deployed package — Vercel Functions now support up to
    // 5GB of package size, which is what makes bundling it directly (instead
    // of fetching a binary at cold-start) practical.
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const fs = await import("node:fs");
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || LOCAL_CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!executablePath) {
    throw new Error(
      "No local Chrome install found for poster screenshots — set PUPPETEER_EXECUTABLE_PATH to your Chrome/Edge binary.",
    );
  }
  return puppeteer.launch({ executablePath, headless: true });
}

// Screenshots the "Classic 5" pre-market posters straight off the live
// /posters page — same DOM and Tailwind styles the Share/Save buttons
// capture with html-to-image, just captured by a real browser engine
// instead of html-to-image's SVG-rasterizing approach (that library exists
// only because an ordinary webpage can't call a native screenshot API on
// itself; a headless browser driving the page can).
export async function capturePremarketPosters(origin) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // Wide enough that every poster card in the (max-w-5xl-constrained)
    // horizontal carousel lays out without needing to scroll any into view
    // — see the style override below for why that matters.
    await page.setViewport({ width: 2600, height: 1600, deviceScaleFactor: 3 });
    await page.goto(`${origin}/posters`, { waitUntil: "networkidle0", timeout: 45_000 });

    // Two fixes for how these cards are captured vs. how they're designed
    // to display on-page:
    // 1. Each PosterFrame ([data-poster]) sits inside a
    //    "overflow-hidden rounded-2xl" wrapper for on-page display.
    //    elementHandle.screenshot() captures composited pixels, so without
    //    this override every exported poster would have the wrapper's
    //    rounded corners baked in as a page-background bleed.
    // 2. The poster row is a "snap-x overflow-x-auto" carousel — cards past
    //    the first few require scrolling into view, which Puppeteer does
    //    automatically before an element screenshot. That scroll can still
    //    be mid-animation when the capture fires, cutting the poster in
    //    half. Disabling the scroll container (now redundant given the wide
    //    viewport above) removes the scroll entirely instead of racing it.
    await page.addStyleTag({
      content: `
        .rounded-2xl { border-radius: 0 !important; }
        .overflow-x-auto { overflow: visible !important; }
        .snap-x { scroll-snap-type: none !important; }
      `,
    });

    // Data loads client-side after mount; if nothing showed up by the time
    // the network settled, waiting longer won't help — bail with a clear
    // error instead of screenshotting a loading spinner or error state.
    await page.waitForSelector('[data-poster="gift-nifty-vix-currency"], [data-poster="global-indices"]', {
      timeout: 15_000,
    });

    const results = [];
    for (const posterId of TELEGRAM_POSTER_IDS) {
      const handle = await page.$(`[data-poster="${posterId}"]`);
      if (!handle) continue; // that poster's source data wasn't available today — skip it, don't fail the whole run
      results.push({ posterId, buffer: await handle.screenshot({ type: "png" }) });
    }
    return results;
  } finally {
    await browser.close();
  }
}
