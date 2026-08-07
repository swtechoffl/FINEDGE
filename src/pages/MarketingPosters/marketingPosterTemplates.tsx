export interface MarketingPosterTemplate {
  id: string;
  color: string;
  kicker: string;
  heroText: string;
  heroSize: number;
  heroSub: string;
  features: string[];
  cta: string;
}

// Static product-marketing copy, not live market data — the broking-
// platform cross-sell products a distributor typically promotes. Each
// leads with one real, well-known industry figure (₹0 delivery brokerage,
// ₹500 SIP minimum, the Section 80CCD(1B) NPS deduction, etc.) rather than
// a generic feature list, the way an actual print/social ad would.
export const MARKETING_POSTER_TEMPLATES: MarketingPosterTemplate[] = [
  {
    id: "demat-trading-account",
    color: "#1447e6",
    kicker: "Demat & Trading Account",
    heroText: "₹0",
    heroSize: 62,
    heroSub: "Brokerage on equity delivery, for life",
    features: [
      "Paperless KYC in under 5 minutes",
      "Free expert research & advisory",
      "Trade equity, F&O, currency & commodities",
    ],
    cta: "Open Your Account",
  },
  {
    id: "mutual-fund-sip",
    color: "#15803d",
    kicker: "Mutual Fund SIP",
    heroText: "₹500",
    heroSize: 50,
    heroSub: "Is all it takes to start your SIP",
    features: [
      "1,000+ mutual fund schemes to choose from",
      "Goal-based investment planning",
      "Auto-debit — invest without lifting a finger",
    ],
    cta: "Start Your SIP",
  },
  {
    id: "health-term-insurance",
    color: "#0e7490",
    kicker: "Health & Term Insurance",
    heroText: "1 Cr+",
    heroSize: 50,
    heroSub: "Life cover to protect what matters most",
    features: [
      "Health & term plans from leading insurers",
      "Affordable premiums, comprehensive cover",
      "Dedicated support when you file a claim",
    ],
    cta: "Get Insured",
  },
  {
    id: "loan-against-securities",
    color: "#c2410c",
    kicker: "Loan Against Securities",
    heroText: "24 Hrs",
    heroSize: 44,
    heroSub: "Instant liquidity without selling your portfolio",
    features: [
      "Loan against shares & mutual funds",
      "Competitive interest rates",
      "Your investments keep growing, untouched",
    ],
    cta: "Apply for LAS",
  },
  {
    id: "nps-retirement",
    color: "#7e22ce",
    kicker: "National Pension System",
    heroText: "₹50,000",
    heroSize: 34,
    heroSub: "Extra tax deduction under Section 80CCD(1B)",
    features: [
      "Market-linked, long-term retirement corpus",
      "Flexible contribution amount & frequency",
      "Additional deduction beyond Section 80C",
    ],
    cta: "Start Your NPS",
  },
];
