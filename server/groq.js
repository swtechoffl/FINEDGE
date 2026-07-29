// Real AI interpretation, via Groq's free tier (no card required) —
// https://console.groq.com/keys. Llama 3.3 70B: strong quality, fast, and
// well within the free-tier rate limits at this app's call volume (only
// high-impact news + periodic report summaries get a real AI call; see the
// callers for the caching that keeps volume low).
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

async function callGroq(systemPrompt, userPrompt, maxTokens) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq API HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty response from Groq");
  return text;
}

const NEWS_ANALYSIS_SYSTEM_PROMPT =
  "You are a concise financial analyst covering Indian stock markets. In exactly 1-2 short sentences, " +
  "explain why this specific news matters for Indian equity investors right now — the concrete market " +
  "implication, not a restatement of the headline. Be direct and specific. No disclaimers, no hedging " +
  'language like "could" or "may" stacked on top of each other, no "As an AI" preamble.';

export async function generateNewsAnalysis(headline, summary) {
  const text = await callGroq(NEWS_ANALYSIS_SYSTEM_PROMPT, `Headline: ${headline}\nSummary: ${summary}`, 120);
  return text;
}

const REPORT_SUMMARY_SYSTEM_PROMPT =
  "You are a concise financial analyst writing the opening paragraph of a same-day market briefing for " +
  "Indian equity investors. Using only the data given, write 2-3 sentences that synthesize what it means " +
  "for today's session — reference the actual numbers, don't just list them back. No disclaimers, no " +
  '"As an AI" preamble, no generic filler like "markets may be volatile."';

export async function generateReportSummary(dataDescription) {
  return callGroq(REPORT_SUMMARY_SYSTEM_PROMPT, dataDescription, 180);
}
