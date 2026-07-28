# Indian Financial News RSS Feeds — Source Reference

Reverse-engineered from tradl.in/news. These are the underlying RSS feeds behind
their "GENERAL_NEWS / EARNINGS / RISK_EVENT..." pipeline. Confirmed feeds are
tested and known-live; unconfirmed ones follow the publisher's known URL
pattern but haven't been independently checked.

Last compiled: July 27, 2026

🔭 **WATCH** — marks entries that are either (a) pattern-inferred and not yet
independently checked, or (b) checked and currently blocked (WAF/IP-level
403s etc.) rather than a bad URL. Either way, don't treat a WATCH row as a
working feed in production until it's re-verified.

---

## Mint (livemint.com)

| Feed | URL |
|---|---|
| Companies | `https://www.livemint.com/rss/companies` |
| Markets | `https://www.livemint.com/rss/markets` |

## News18 (news18.com)

| Feed | URL | Status |
|---|---|---|
| Business | `https://www.news18.com/commonfeeds/v1/eng/rss/business.xml` | Confirmed (requires a browser-like User-Agent — a generic bot UA gets an Akamai "Access Denied") |

## CNBC-TV18 (cnbctv18.com)

Pattern: `/commonfeeds/v1/cne/rss/{section}.xml`

| Feed | URL | Status |
|---|---|---|
| Market | `https://www.cnbctv18.com/commonfeeds/v1/cne/rss/market.xml` | Confirmed |
| World | `https://www.cnbctv18.com/commonfeeds/v1/cne/rss/world.xml` | Confirmed |
| Business | `https://www.cnbctv18.com/commonfeeds/v1/cne/rss/business.xml` | 🔭 WATCH — pattern-inferred |

## The Hindu Business Line (thehindubusinessline.com)

| Feed | URL |
|---|---|
| Companies | `https://www.thehindubusinessline.com/companies/feeder/default.rss` |
| Markets (general) | `https://www.thehindubusinessline.com/markets/feeder/default.rss` |
| Stock Markets | `https://www.thehindubusinessline.com/markets/stock-markets/feeder/default.rss` |

## The Hindu (thehindu.com)

| Feed | URL |
|---|---|
| Markets | `https://www.thehindu.com/business/markets/feeder/default.rss` |

## NDTV Profit (ndtvprofit.com)

| Feed | URL | Status |
|---|---|---|
| Main feed | `https://www.ndtvprofit.com/feed` | 🔭 WATCH — returns HTTP 403 even with a browser User-Agent; likely blocks the fetching IP/WAF fingerprint outright |
| Latest (FeedBurner mirror) | `https://feeds.feedburner.com/ndtvprofit-latest` | Confirmed — use this one instead of the direct feed above |

## ETNow (etnownews.com)

| Feed | URL |
|---|---|
| Markets | `https://www.etnownews.com/feeds/gns-etn-markets.xml` |
| Companies | `https://www.etnownews.com/feeds/gns-etn-companies.xml` |
| Mutual Funds | `https://www.etnownews.com/feeds/gns-etn-mutual-funds.xml` |

## Economic Times (economictimes.indiatimes.com)

| Feed | URL |
|---|---|
| Stocks | `https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms` |
| Markets (general) | `https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms` |
| Company | `https://economictimes.indiatimes.com/news/company/rssfeeds/2143429.cms` |

## Not independently confirmed 🔭 WATCH

- **News18** (news18.com) — no clean feed URL found; check `view-source` on the
  homepage for `<link rel="alternate" type="application/rss+xml">` tags.
- **ETNow** (etnownews.com) — same as above; likely `/rss` or `/feed`.

---

## Notes on the tradl.in pipeline (for context)

- All 8 sources are domestic, English-language only — no regional language or
  international wires.
- Articles are deduplicated/clustered: the same event covered by 5 outlets
  produces one record with all 5 source URLs attached, not 5 duplicates.
- A poller runs roughly every 2–5 minutes (observed gap between `published_at`
  and `created_at` in their API), followed by an LLM enrichment pass that adds
  sentiment, ticker extraction, industry classification, and a 1–10 relevance
  score.
- Storage is MongoDB (UUID `_id` fields), not a relational DB.
