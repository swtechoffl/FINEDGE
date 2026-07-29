# Data Sources Reference

Every live data point in stoqtrade.ai, where it actually comes from, and how often it refreshes. This is a reference for the running code (`server/*.js`), not a wishlist — every endpoint below has been verified against the live source directly.

None of these need an API key. Two access patterns are used:

- **Yahoo Finance** (`query1.finance.yahoo.com`) — public, unauthenticated, called directly.
- **NSE India** (`nseindia.com`) — needs a session cookie first (a plain GET to the homepage, then reuse the `Set-Cookie` on the actual API call — same as a browser would get just by loading the site first). Implemented once in `server/nse.js` (`fetchNseJson`) and reused everywhere. A few NSE datasets are static daily CSV files on `nsearchives.nseindia.com` instead, which need no cookie at all.

---

## Market Pulse (news feed)

17 RSS feeds across 8 publishers, refreshed every 3 min (`server/index.js`, `CACHE_TTL_MS`). Defined in `server/feeds.js`; full detail (status, watch notes) in `docs/rss-feeds-reference.md`.

| Publisher | Feed | URL |
|---|---|---|
| Mint | Companies | `https://www.livemint.com/rss/companies` |
| Mint | Markets | `https://www.livemint.com/rss/markets` |
| News18 | Business | `https://www.news18.com/commonfeeds/v1/eng/rss/business.xml` |
| CNBC-TV18 | Market | `https://www.cnbctv18.com/commonfeeds/v1/cne/rss/market.xml` |
| CNBC-TV18 | World | `https://www.cnbctv18.com/commonfeeds/v1/cne/rss/world.xml` |
| CNBC-TV18 | Business (watch) | `https://www.cnbctv18.com/commonfeeds/v1/cne/rss/business.xml` |
| The Hindu Business Line | Companies | `https://www.thehindubusinessline.com/companies/feeder/default.rss` |
| The Hindu Business Line | Markets (general) | `https://www.thehindubusinessline.com/markets/feeder/default.rss` |
| The Hindu Business Line | Stock Markets | `https://www.thehindubusinessline.com/markets/stock-markets/feeder/default.rss` |
| The Hindu | Markets | `https://www.thehindu.com/business/markets/feeder/default.rss` |
| NDTV Profit | Latest (FeedBurner mirror) | `https://feeds.feedburner.com/ndtvprofit-latest` |
| ETNow | Markets | `https://www.etnownews.com/feeds/gns-etn-markets.xml` |
| ETNow | Companies | `https://www.etnownews.com/feeds/gns-etn-companies.xml` |
| ETNow | Mutual Funds | `https://www.etnownews.com/feeds/gns-etn-mutual-funds.xml` |
| Economic Times | Stocks | `https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms` |
| Economic Times | Markets (general) | `https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms` |
| Economic Times | Company | `https://economictimes.indiatimes.com/news/company/rssfeeds/2143429.cms` |

**Only NDTV Profit's direct feed (`ndtvprofit.com/feed`) doesn't work** — 403s even with a browser User-Agent (WAF/IP block); the FeedBurner mirror above is the working substitute. Everything else in the table is confirmed live except the CNBC-TV18 Business row, which is pattern-inferred and unverified.

| Data | Source | Notes |
|---|---|---|
| Signal / impact / category | Heuristic keyword classifier — no LLM call | `server/classify.js`. Bullish/bearish word lists, ticker matching against the 109-stock universe, and a relevance gate (trusted finance-desk feed sections vs. keyword/ticker match for generic sections) that assigns `impact: "none"` to off-topic stories. |
| Ticker price/change shown per article | Yahoo Finance (see Prices below) | Cross-referenced by matched ticker symbol. |

## Prices (stock + index universe)

| Data | Source | Endpoint | Refresh |
|---|---|---|---|
| 109 tracked stocks (33 NSE sector categories) | Yahoo Finance | `GET /v8/finance/chart/{SYMBOL}.NS` | 15 min (`server/prices.js`) |
| NIFTY 50 / SENSEX / NIFTY BANK | Yahoo Finance | `GET /v8/finance/chart/^NSEI`, `^BSESN`, `^NSEBANK` | 15 min |
| 52-week high/low per stock | Yahoo Finance | Same chart endpoint — `meta.fiftyTwoWeekHigh` / `meta.fiftyTwoWeekLow` | 15 min (piggybacks on the price poll) |

## Premarket Report

| Data | Source | Endpoint | Refresh |
|---|---|---|---|
| GIFT Nifty (price, change, implied gap) | giftcitynifty.com (third-party aggregator, **not** an exchange feed) | Scrapes `schema.org`/JSON-LD `PropertyValue` fields from `/gift-nifty-dashboard/` | 5 min (`server/premarket.js`) |
| India VIX | Yahoo Finance | `^INDIAVIX` | 5 min |
| Gold / Silver / Crude (WTI) | Yahoo Finance | `GC=F`, `SI=F`, `CL=F` | 5 min |
| USD/INR, GBP/INR | Yahoo Finance | `USDINR=X`, `GBPINR=X` | 5 min |
| US markets (Dow, S&P 500, Nasdaq, Russell 2000) | Yahoo Finance | `^DJI`, `^GSPC`, `^IXIC`, `^RUT` | 5 min |
| Europe (FTSE 100, CAC 40, DAX) | Yahoo Finance | `^FTSE`, `^FCHI`, `^GDAXI` | 5 min |
| Asia (Nikkei 225, Hang Seng, Shanghai Composite, KOSPI) | Yahoo Finance | `^N225`, `^HSI`, `000001.SS`, `^KS11` | 5 min |
| FII/DII activity | NSE (official) | `GET /api/fiidiiTradeReact` | 5 min |
| NIFTY pivot levels (R3-R1, Pivot, S1-S3) | Computed — standard floor-trader formula from the previous session's real OHLC | Yahoo Finance daily bar for `^NSEI` (`range=10d&interval=1d`, last bar with a non-null close) | 5 min |
| Market Barometer (Positive/Flat/Negative opening) | Computed — weighted blend of GIFT Nifty (45%), US markets (30%), Europe+Asia (15%), commodities (10%) | Derived from the rows above, no separate fetch | 5 min |
| High Impact News | Market Pulse feed, filtered to `impact: "high"` | — | 3 min (news cache cadence) |
| 52-week high/low watch, Corporate Actions, Earnings Calendar | Same as Post Market Report below (shared `/api/market-movers` cache) | — | 10 min |

## Post Market Report / Market Movers

All from NSE, cached together in `server/marketMovers.js`, refreshed every 10 min.

| Data | Endpoint | Notes |
|---|---|---|
| Top Gainers / Losers | `GET /api/live-analysis-variations?index=gainers` / `?index=loosers` | NSE's own param really is misspelled "loosers" — the correct spelling returns nothing usable, verified live. Filtered to the "FOSec" (F&O Securities) universe, not "allSec" (which includes thin penny-stock movers). |
| Most Active Equities (by value) | `GET /api/live-analysis-most-active-securities?index=value` | Traded value converted from rupees to ₹ crore. |
| Index Futures OI change (NIFTY/BANKNIFTY/FINNIFTY/NIFTYNXT50) | `GET /api/live-analysis-oi-spurts-underlyings` | Same feed as the stock-level OI buildup below — index rows are filtered out from the per-stock classification and shown separately. |
| OI Buildup (Long Buildup / Short Buildup / Short Covering / Long Unwinding) | Same OI Spurts feed, cross-referenced with our own price cache | Computed classification: price direction × OI direction for the same stock (`server/marketMovers.js`, `classifyBuildup`). Not an NSE-provided category — NSE only reports raw OI change; the long/short labeling is done here. |
| 52-week High/Low Watch | Computed from the Yahoo price cache (see Prices) | Stocks within 3% of their 52-week high or low. |
| Upcoming Corporate Actions | `GET /api/corporates-corporateActions?index=equities&from_date=...&to_date=...` | **Must** pass an explicit `from_date`/`to_date` (30-day window) — NSE's own default (no date params) only returns a ~20-item window covering the next 1-2 days market-wide, confirmed live. |
| Upcoming Earnings/Results Calendar | `GET /api/event-calendar` | NSE's board-meeting calendar; filtered to `purpose` containing "Financial Results" (the same feed also carries Dividend/Buyback/Fund-Raising board meetings, which are excluded here). |

## Market Internals

Cached together in `server/marketInternals.js`, refreshed every 15 min.

| Data | Source | Notes |
|---|---|---|
| Participant-wise Open Interest (FII/DII/Pro/Client) | `https://nsearchives.nseindia.com/content/nsccl/fao_participant_oi_DDMMYYYY.csv` | Static daily CSV, **no cookie handshake needed** (unlike the dynamic `/api/*` endpoints). Fetches the 2 most recent trading-day files to compute day-over-day net OI change; walks backward day-by-day to skip weekends/holidays. |
| Participant-wise Trading Volume | `https://nsearchives.nseindia.com/content/nsccl/fao_participant_vol_DDMMYYYY.csv` | Same format/technique as OI above. |
| Bulk Deals | `GET /api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=...&to=...` | 10-day lookback window. |
| Block Deals | Same endpoint, `optionType=block_deals` | |
| Short Selling | Same endpoint, `optionType=short_selling` | Aggregated by symbol across the lookback window and ranked by quantity (the raw feed is just symbol+qty per day, no per-row price). |
| Index Option Chain — PCR, Max Pain, strike-wise OI (NIFTY & BANKNIFTY) | `GET /api/option-chain-contract-info?symbol=X` (expiry list) then `GET /api/option-chain-v3?type=Indices&symbol=X&expiry=...` | **`option-chain-v3` is the current endpoint** — the older, more commonly documented `option-chain-indices` has been retired by NSE (confirmed: returns 404). PCR and Max Pain are both computed here from the raw strike-wise Call/Put OI, not provided directly by NSE. |

## Stock Detail page (`/stock/:symbol`)

Combined per-request in `server/stockDetail.js`, 5-min in-memory cache per symbol.

| Data | Source | Notes |
|---|---|---|
| Live price / change | Our own price cache (Prices, above) if the stock is in the tracked 109-stock universe; otherwise a fresh single Yahoo Finance fetch | Covers stocks that show up in gainers/losers/most-active but aren't part of the curated universe. |
| 6-month price history (chart) | Yahoo Finance | `GET /v8/finance/chart/{SYMBOL}.NS?range=6mo&interval=1d` |
| Per-stock Option Chain (PCR, Max Pain, strike OI) | NSE, same `option-chain-v3` endpoint as the index chain above, with `type=Equity` instead of `type=Indices` | Returns `null` (not an error) for non-F&O-eligible stocks. |
| Trade Info (Open/Day Range/Prev Close/Volume/Delivery %/Market Cap/P/E/ISIN), real sector & industry classification | NSE — `GET /api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=N&series=EQ&symbol=X` | **This is the endpoint NSE's own website actually calls.** The older, commonly-documented `/api/quote-equity` is blocked by their Akamai edge protection (confirmed "Access Denied") even with the same cookie handshake that works everywhere else — this one isn't. Company name/sector/industry here overrides our curated list when available, since it's more precise. |

## Notifications

| Data | Source | Notes |
|---|---|---|
| New high-impact story alerts (toast + bell dropdown) | Same Market Pulse feed poll (`/api/news`), diffed client-side | No separate backend — `src/notifications/NotificationContext.tsx` tracks previously-seen article IDs in `localStorage` and treats only genuinely new `impact: "high"` items as notification-worthy. First page load establishes the baseline silently. |

---

## Known gaps / things that don't work

- **`/api/quote-equity`** — blocked by NSE's Akamai edge protection ("Access Denied") even with the same cookie handshake that works for every other endpoint above. Not used anywhere in the app; superseded by the working `NextApi/apiClient/GetQuoteApi` endpoint (see Stock Detail page above), which turned out to return richer data anyway.
- **VaR margins** — no working endpoint found; not implemented.
- Everything above was found by testing directly against the live NSE/Yahoo endpoints, not by trusting any third-party library's docs at face value — a few endpoint names differ from what's commonly documented (e.g. `option-chain-indices` → `option-chain-v3`, `losers` → `loosers`, corporate actions needing an explicit date range, `quote-equity` → `NextApi/apiClient/GetQuoteApi`).

---

## GitHub repos used as research references

None of these are dependencies of the app — it's a plain Node/Express + Vite/React app with no third-party NSE/market-data package installed. Each repo below was read (source code, not just docs) to find the real underlying NSE endpoint names and parameters, which were then re-implemented directly in `server/*.js` using this app's own fetch/cache patterns.

| Repo | Language | What it was used for |
|---|---|---|
| [RuchiTanmay/nselib](https://github.com/RuchiTanmay/nselib) | Python | Found the real endpoints for bulk/block/short-selling deals (`historicalOR/bulk-block-short-deals`), participant-wise OI/volume CSV archive paths, and the current option-chain endpoint name (`option-chain-v3`, not the more commonly documented `option-chain-indices`). |
| [ashok-kollipara/options-oi](https://github.com/ashok-kollipara/options-oi) | Python (Tkinter GUI) | Confirmed the general approach for strike-wise option-chain OI visualization (PCR/Max Pain style analysis) for NIFTY/BANKNIFTY — informed the Market Internals option chain card. |
| [jugaad-py/jugaad-data](https://github.com/jugaad-py/jugaad-data) | Python | Reviewed for historical/bhavcopy tooling; ultimately not used — it's built for offline backtesting, not a live dashboard, so nothing from it made it into the app. |
| [hi-imcodeman/stock-nse-india](https://github.com/hi-imcodeman/stock-nse-india) | Node/TypeScript | Feature-mapped for the Stock Detail page and Most Active Equities — same stack as this app. Its `quote-equity`-based methods are blocked the same way ours was; superseded here by the NextApi endpoint found via NseIndiaApi below. |
| [BennyThadikaran/NseIndiaApi](https://github.com/BennyThadikaran/NseIndiaApi) | Python | Source of the working `NextApi/apiClient/GetQuoteApi` endpoint for per-stock quotes/trade info/sector classification, and confirmed the `corporates-corporateActions` endpoint needs an explicit `from_date`/`to_date` range (NSE's own default window is nearly empty). |
| [vercel/vercel-plugin](https://github.com/vercel/vercel-plugin) | — | Installed via the `plugins` CLI (Vercel Labs) as a Claude Code marketplace plugin, unrelated to any in-app data source. |

The project's own repo: **[swtechoffl/FINEDGE](https://github.com/swtechoffl/FINEDGE)**.
