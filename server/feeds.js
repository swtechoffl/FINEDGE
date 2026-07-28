// Mirrors src/pages/Sources/data.ts — kept as plain JS so the server doesn't need a TS toolchain.
export const PUBLISHER_GROUPS = [
  {
    name: "Mint",
    feeds: [
      { label: "Companies", url: "https://www.livemint.com/rss/companies", status: "confirmed" },
      { label: "Markets", url: "https://www.livemint.com/rss/markets", status: "confirmed" },
    ],
  },
  {
    name: "News18",
    feeds: [
      {
        label: "Business",
        url: "https://www.news18.com/commonfeeds/v1/eng/rss/business.xml",
        status: "confirmed",
      },
    ],
  },
  {
    name: "CNBC-TV18",
    feeds: [
      { label: "Market", url: "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/market.xml", status: "confirmed" },
      { label: "World", url: "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/world.xml", status: "confirmed" },
      { label: "Business", url: "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/business.xml", status: "watch" },
    ],
  },
  {
    name: "The Hindu Business Line",
    feeds: [
      {
        label: "Companies",
        url: "https://www.thehindubusinessline.com/companies/feeder/default.rss",
        status: "confirmed",
      },
      {
        label: "Markets (general)",
        url: "https://www.thehindubusinessline.com/markets/feeder/default.rss",
        status: "confirmed",
      },
      {
        label: "Stock Markets",
        url: "https://www.thehindubusinessline.com/markets/stock-markets/feeder/default.rss",
        status: "confirmed",
      },
    ],
  },
  {
    name: "The Hindu",
    feeds: [
      { label: "Markets", url: "https://www.thehindu.com/business/markets/feeder/default.rss", status: "confirmed" },
    ],
  },
  {
    name: "NDTV Profit",
    // www.ndtvprofit.com/feed returns HTTP 403 even with a browser User-Agent
    // (WAF/IP block). The FeedBurner mirror works — confirmed live.
    feeds: [{ label: "Latest", url: "https://feeds.feedburner.com/ndtvprofit-latest", status: "confirmed" }],
  },
  {
    name: "ETNow",
    feeds: [
      { label: "Markets", url: "https://www.etnownews.com/feeds/gns-etn-markets.xml", status: "confirmed" },
      { label: "Companies", url: "https://www.etnownews.com/feeds/gns-etn-companies.xml", status: "confirmed" },
      {
        label: "Mutual Funds",
        url: "https://www.etnownews.com/feeds/gns-etn-mutual-funds.xml",
        status: "confirmed",
      },
    ],
  },
  {
    name: "Economic Times",
    feeds: [
      {
        label: "Stocks",
        url: "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
        status: "confirmed",
      },
      {
        label: "Markets (general)",
        url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        status: "confirmed",
      },
      {
        label: "Company",
        url: "https://economictimes.indiatimes.com/news/company/rssfeeds/2143429.cms",
        status: "confirmed",
      },
    ],
  },
];

export function allFeeds() {
  return PUBLISHER_GROUPS.flatMap((group) =>
    group.feeds.map((feed) => ({ source: group.name, ...feed })),
  );
}
