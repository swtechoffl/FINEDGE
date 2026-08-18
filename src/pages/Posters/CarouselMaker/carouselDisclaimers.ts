export interface DisclaimerPreset {
  id: string;
  label: string;
  text: string;
}

// Short compliance snippets for the slide fine-print — wording matches what
// the app's other posters already use (PostMarketSummaryPoster.tsx,
// ResearchExitPoster.tsx, Disclosure/disclaimerContent.ts) so the same
// disclosure reads identically wherever it shows up. Presets append to the
// field rather than replace it, so more than one can be combined.
export const DISCLAIMER_PRESETS: DisclaimerPreset[] = [
  {
    id: "market-risk",
    label: "Market Risk",
    text: "Investments in securities market are subject to market risks. Read all related documents carefully.",
  },
  {
    id: "mutual-fund",
    label: "Mutual Fund",
    text: "Mutual fund investments are subject to market risks. Read all scheme related documents carefully.",
  },
  {
    id: "ra-registration",
    label: "RA Registration",
    text: "SEBI Research Analyst Registration No. INH000010496.",
  },
  {
    id: "illustrative",
    label: "Illustrative",
    text: "For illustrative purposes only. Not investment advice.",
  },
  {
    id: "source",
    label: "Source",
    text: "Source: NSE/BSE.",
  },
];
