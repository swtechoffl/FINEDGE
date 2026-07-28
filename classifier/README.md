# Sharewealth News Classifier

Classifies Indian financial news headlines with a free LLM (Gemini 2.5
Flash, falling back to OpenRouter) and attaches **verified** NSE tickers to
company mentions — never an LLM-guessed ticker. Built for Sharewealth
Securities' market report tooling (pre/post-market briefs, the
`market-desk.html` live news terminal).

Zero npm dependencies. Runs anywhere with Node 18+ (needs global `fetch`).

## Why tickers are matched, not asked for

Every general-purpose LLM is good at reading a company name out of a
headline and bad at recalling its exact listed ticker — especially for
group companies with several separately-listed entities. The motivating
bug: a competitor's pipeline tagged "Tata 1mg" with `TATACAP` (Tata
Capital's ticker) purely from "Tata" + financial-news pattern-matching.
Tata 1mg is not listed on NSE at all.

So this pipeline never lets the LLM output a symbol. It asks for plain
**company names** only, then fuzzy-matches each name against NSE's own
published symbol master (`EQUITY_L.csv`). If nothing clears the confidence
threshold, the ticker is `null` — a missing ticker is a far smaller problem
than a wrong one in SEBI-regulated client-facing output.

`sample-articles.json` includes the Tata 1mg case specifically as a
regression check: run it and confirm that article's `companies` array
never contains `TATACAP` (it should resolve to `symbol: null`).

## Setup

```bash
cp .env.example .env
# then edit .env and set GEMINI_API_KEY and/or OPENROUTER_API_KEY
```

- **Gemini** (primary): free, no card, from https://aistudio.google.com
- **OpenRouter** (fallback, only tried if Gemini throws): free tier at
  https://openrouter.ai/keys

Only one of the two keys is required — the other is silently skipped if
unset. Gemini is tried first by design (better free-tier grounding on
Indian entities); OpenRouter's free Llama slot is the fallback specifically
because it's the weaker of the two on Indian company/ticker context.

## Usage

```bash
node index.mjs --check                  # verify your API key(s) actually work — no input file needed
node index.mjs sample-articles.json     # run against the fixture
node index.mjs path/to/real-feed.json   # run against real RSS-derived input
```

### Checking whether your keys work: `--check`

Run this any time after editing `.env` — it fires one real, minimal request
at each *configured* provider (skipping any provider with no key set) and
reports a specific pass/fail per provider, without touching an input file:

```
$ node index.mjs --check
Provider check:
  ✓ gemini: OK (responded in 812ms, sentiment=bullish)
  – openrouter: SKIPPED (no API key configured for this provider)

At least one provider is working — classifyArticle() will succeed.
```

A failing provider looks like this — note the specific error code, not just
"it didn't work":

```
$ GEMINI_API_KEY=invalid-key node index.mjs --check
Provider check:
  ✗ gemini: FAILED [AUTH] — API key rejected — invalid or unauthorized
      Gemini API error 400 [AUTH]: {"error":{"code":400,"message":"API key not valid...
```

Exit code is `0` if at least one configured provider is OK, `1` otherwise —
safe to use in a script/CI step before running the real pipeline.

### Error codes

Every provider failure — during `--check` or during real article
classification — is tagged with one of these codes, both in the printed
message and in `error_code` on any article result that failed:

| Code | Meaning |
|---|---|
| `NO_KEY` | That provider's API key isn't set (not a failure — provider is just skipped) |
| `NETWORK` | Couldn't reach the provider at all (DNS/timeout/connection) |
| `AUTH` | API key rejected. Note: Gemini returns this as **HTTP 400** with `API_KEY_INVALID`, not 401/403 like most APIs — tested directly, and specifically checked for so it isn't mislabeled as a generic bad request |
| `RATE_LIMIT` | HTTP 429 — you've hit the provider's rate/quota limit |
| `BAD_REQUEST` | HTTP 400 for a reason *other* than an invalid key (e.g. malformed request body) |
| `SERVER` | HTTP 5xx — the provider's own outage/error, not yours |
| `SAFETY_BLOCKED` | The model refused to answer under its own safety filters |
| `EMPTY_RESPONSE` | The provider returned HTTP 200 but no usable text |
| `PARSE_ERROR` | The model's text response wasn't valid JSON in the expected shape |

### Normal run output

Input is a JSON array of `{ "title": "...", "summary": "..." }` objects.
Output (on stdout) is a JSON array, one entry per input article:

```json
{
  "title": "...",
  "sentiment": "bullish" | "neutral" | "bearish",
  "category": "Earnings" | "Regulatory" | "...",
  "industry": "...",
  "llm_summary": "...",
  "relevance_score": 1-10,
  "companies": [
    { "name": "Reliance Industries", "symbol": "RELIANCE", "matchedName": "Reliance Industries Limited", "score": 0.92 }
  ],
  "classified_by": "gemini" | "openrouter"
}
```

A failed article (both providers threw) looks like
`{ "title": "...", "error": "...", "error_code": "AUTH" }` instead — the
pipeline keeps going and classifies the rest rather than aborting the whole
batch over one bad article.

Progress, per-provider failures, and a final one-line summary
(`N via gemini, M via openrouter, K failed`) are logged to stderr, so stdout
stays clean JSON you can pipe elsewhere.

## How ticker matching works

1. NSE's symbol master (`EQUITY_L.csv`, ~2,400 listed equities) is fetched
   once, then cached at `.cache/nse-symbols.json` for 24h. Delete the cache
   file any time to force a refetch — it's gitignored and safe to remove.
2. Each LLM-extracted company name is normalized (lowercased, common
   suffixes like "Ltd"/"Limited"/"Pvt" stripped) and compared against every
   NSE company name using a **combined score**: `min(editDistanceSimilarity,
   tokenJaccardSimilarity)`. Comparison against the raw ticker *symbol* is
   exact-match-only, never fuzzy (see below).
3. The best-scoring match is kept only if its similarity clears
   `MATCH_THRESHOLD` (default **0.6**). Below that, the result is
   `{ symbol: null }`.

### Why the combined score, and why symbols are exact-match-only

Plain edit-distance alone isn't safe for Indian company names, because
conglomerates list many entities sharing a first word. Testing turned up
two real false positives before this shipped:

- `"Tata 1mg"` (unlisted) scored **0.625** against the ticker string
  `TATACOMM` on edit-distance alone — pure coincidental character overlap
  between two same-length strings, not a real match. Fix: symbol
  comparison is now exact-match-only.
- `"Reliance Jio"` and `"Reliance Retail"` (both unlisted) scored **0.60–0.64**
  against `RPOWER` ("Reliance Power Limited") on edit-distance alone, purely
  from sharing the "Reliance" prefix. Fix: combining with token-level
  Jaccard similarity means a shared corporate-family word can no longer
  carry a match on its own — the distinguishing word(s) have to overlap too.
  Both now correctly resolve to `symbol: null`.

The cost of that fix: `"Ola Electric"` (real ticker `OLAELEC`, full listed
name "Ola Electric Mobility Limited") scores **~0.57–0.59** combined —
just under the 0.6 default — because the query is a shortened form of the
full listed name, and the missing word ("Mobility") isn't a generic
suffix that gets stripped. It currently resolves to `null` rather than
`OLAELEC`. This is the real, concrete shape of the tradeoff described
below: the default favors missing a real match over risking a wrong one.

### Tuning `MATCH_THRESHOLD`

- **Raise toward 0.8** if output feeds something fully automated with no
  human review — fewer false positives, more `null`s.
- **Lower toward 0.5** if a human is already checking results before they
  go anywhere — recovers cases like "Ola Electric" above, at the cost of
  occasional wrong matches a reviewer would catch anyway.

## Known constraints (deliberate, not bugs)

- **NSE only, not BSE.** NSE covers the large majority of tickers that show
  up in mainstream Indian financial press. Extending to BSE's scrip master
  is a known future step, not an oversight.
- **Sequential, 1 request/second pacing** between articles in `main()`.
  This is intentional free-tier-friendly throttling for Gemini/OpenRouter,
  not something to "optimize" with `Promise.all` — that would just trip
  rate limits.
- **CSV parsing via `.split(',')`**, not a real CSV parser. This works
  because NSE's `SYMBOL` and `NAME OF COMPANY` columns don't contain
  embedded commas in practice. If NSE ever changes their export format,
  this is the first thing to check.
- **NSE's archive host blocks generic bot User-Agents.** The fetch uses a
  standard browser User-Agent string to get through — this is a normal
  browser identity, not spoofed automation evasion.

## Related project context

This pipeline mirrors the architecture reverse-engineered from tradl.in's
news API (RSS ingestion → LLM enrichment → structured metadata), adapted
for Sharewealth's own use and fixing the ticker-hallucination issue observed
in that reference implementation. It is currently standalone — not wired
into any live RSS feed or the stoqtrade.ai app — by design, until it's been
validated against a real API key.
