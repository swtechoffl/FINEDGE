# CLAUDE.md

This file gives Claude Code context for working in this repository.

## What this project is

A Node.js pipeline that classifies Indian financial news headlines using a
free LLM (Gemini 2.5 Flash) and attaches verified NSE stock tickers to
company mentions. Built for Sharewealth Securities' market report tooling —
it's the backend that would feed things like the pre/post-market brief
generator and the `market-desk.html` live news terminal.

## Core architecture

```
RSS article {title, summary}
        |
        v
classifyArticle() tries providers in order:
  1. Gemini 2.5 Flash   (primary — best free-tier Indian-entity grounding)
  2. OpenRouter          (fallback — only tried if Gemini throws)
        |
        v  both return the same shape:
{sentiment, category, industry, llm_summary, relevance_score, company_names[]}
        |
        v
Fuzzy-match each company_name against NSE's real symbol master
        |
        v
Verified output: ticker attached only above confidence threshold,
                  otherwise symbol: null. Output also tags
                  classified_by: "gemini" | "openrouter" for observability.
```

## Provider fallback rules

- `buildPrompt()` is shared between providers — there is exactly one prompt,
  not one per provider. If the prompt needs to change, change it once; do
  not fork it per provider.
- `callGemini()` and `callOpenRouter()` must keep returning the identical
  JSON shape (`sentiment`, `category`, `industry`, `company_names`,
  `llm_summary`, `relevance_score`). Nothing downstream should ever need to
  know which provider answered.
- Provider order in `classifyArticle()`'s `providers` array is Gemini-first
  by design (better Indian-entity recognition observed on the free tier).
  Don't reorder this without a reason — OpenRouter's free Llama slot is the
  fallback specifically because it's the weaker of the two on Indian
  company/ticker context, not because of availability.
- A provider is silently skipped if its API key isn't set — this means the
  script works fine with only `GEMINI_API_KEY`, only `OPENROUTER_API_KEY`,
  or both. Don't add a hard requirement on either key individually.
- `extractJson()` strips markdown fences before parsing because OpenRouter's
  free models are less consistent than Gemini about honoring
  "no markdown fences" in the prompt. Keep this on the shared path — don't
  special-case it as Gemini-only just because Gemini rarely needs it.

## The one rule that matters most in this codebase

**Never let the LLM output a ticker directly. Never trust an LLM-recalled
ticker.** Gemini (and every other general-purpose LLM) is reliable at
reading "Tata 1mg" out of a headline. It is NOT reliable at recalling
whether Tata 1mg is separately listed, or which exact symbol a similarly
named group company uses. The original motivating bug: a competitor's
pipeline tagged "Tata 1mg" with `TATACAP` (Tata Capital's ticker) because
the LLM pattern-matched on "Tata" + financial news context.

The fix, and the reason `index.mjs` is structured the way it is:
- `classifyArticle()` asks Gemini for plain company **names** only.
- `matchTicker()` is the only function allowed to produce a symbol, and it
  only does so by fuzzy-matching against `EQUITY_L.csv` (NSE's own
  published list), never from LLM memory.
- Below `MATCH_THRESHOLD`, the correct behavior is `symbol: null`, not a
  best-effort guess. A missing ticker is a far smaller problem than a wrong
  one appearing in SEBI-regulated client-facing output.

If asked to change how tickers are resolved, preserve this separation. Do
not add a code path where Gemini's output is used as a ticker without
going through `matchTicker()`.

## Files

- `index.mjs` — the whole pipeline. Single file, no external npm
  dependencies (Levenshtein and CSV parsing are hand-rolled deliberately,
  to keep this runnable anywhere with zero `npm install` friction).
- `sample-articles.json` — fixture input, `{title, summary}` shape. Includes
  the Tata 1mg case as a regression check — it should always resolve to
  `symbol: null`, never `TATACAP`.
- `.env.example` — copy to `.env`, needs `GEMINI_API_KEY` (free, no card,
  from https://aistudio.google.com).
- `README.md` — user-facing setup/usage docs.
- `.cache/nse-symbols.json` — gitignored. Auto-generated cache of the NSE
  symbol master, refreshed every 24h. Safe to delete; it'll refetch.

## Commands

```bash
node index.mjs --check                # verify configured provider API key(s) actually work
node index.mjs sample-articles.json   # run against the fixture
node index.mjs path/to/real-feed.json # run against real RSS-derived input
```

Every provider failure — from `--check` or from real classification — is
tagged with an error code (`NO_KEY`, `NETWORK`, `AUTH`, `RATE_LIMIT`,
`BAD_REQUEST`, `SERVER`, `SAFETY_BLOCKED`, `EMPTY_RESPONSE`, `PARSE_ERROR`;
see README for the full table) via the `ProviderError` class, instead of a
single generic failure message. Note: Gemini returns invalid-key errors as
**HTTP 400** with reason `API_KEY_INVALID`, not 401/403 like most REST
APIs — this was verified directly against a real bad key, and `classifyHttpStatus()`
checks the response body for that case specifically so it isn't mislabeled
`BAD_REQUEST`. If adding more error handling, keep using `ProviderError` with
a code rather than throwing bare `Error`s — callers rely on `.code` to
report specifics, not just "it failed."

There is no build step, no test runner configured yet, and no linter
configured yet. If adding any of these, keep the zero-dependency philosophy
in mind — this script's portability (drop it anywhere with Node 18+ and a
Gemini key, no `npm install` required) is a deliberate design choice, not
an oversight.

## Known constraints / things not to "fix" without asking

- **NSE only, not BSE.** Deliberate scope limit — NSE covers the large
  majority of tickers in mainstream Indian financial press. Extending to
  BSE's scrip master is a known future step (see README), not a bug.
- **Sequential 1-request/second pacing** in `main()`. This is intentional
  free-tier-friendly throttling for Gemini, not an oversight to be
  "optimized" with `Promise.all`.
- **CSV parsing via `.split(',')`** rather than a real CSV parser. This
  works because NSE's `SYMBOL` and `NAME OF COMPANY` columns don't contain
  embedded commas in practice. If NSE ever changes their export format,
  this is the first thing to check.
- **`MATCH_THRESHOLD = 0.6`** is a tuned default, not arbitrary. See README
  for the tradeoff (raise toward 0.8 for fully automated output with no
  human review, lower toward 0.5 if a human is checking results anyway).

## Related project context

This pipeline mirrors the architecture reverse-engineered from tradl.in's
news API (RSS ingestion -> LLM enrichment -> structured metadata), adapted
for Sharewealth's own use and fixing the ticker-hallucination issue observed
in that reference implementation. See `sharewealth-rss-feeds.md` (sibling
project) for the underlying RSS feed source list this is meant to consume.
