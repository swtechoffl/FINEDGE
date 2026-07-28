import type { Sector } from "../types";

export const CATEGORIES = [
  "Business Expansion",
  "Corporate Action",
  "Earnings",
  "General News",
  "Macro Sector",
  "Regulatory",
  "Management Change",
  "Merger & Acquisition",
];

// Matches the `source` (publisher) field the API emits — see server/feeds.js.
export const SOURCES = ["Mint", "CNBC-TV18", "The Hindu Business Line", "The Hindu", "NDTV Profit", "Economic Times"];

// Real NSE industry-classification categories (as used by the Sector Heat
// Map), mirroring server/sectors.js exactly so client-side stock filters
// and the server's live ticker-matching agree on the same taxonomy. See
// that file's header comment for the ticker-verification notes (a few
// mismatches — Tata Motors as TMCV, GMDC as GMDCLTD, Firstsource as FSL,
// LTIMindtree dropped entirely — were caught by checking against the real
// NSE symbol master before this list was written).
export const SECTORS: Sector[] = [
  {
    name: "Integrated Power Utilities",
    stocks: [
      { symbol: "NTPC", name: "NTPC Limited" },
      { symbol: "TATAPOWER", name: "Tata Power Company Limited" },
      { symbol: "ADANIPOWER", name: "Adani Power Limited" },
      { symbol: "JSWENERGY", name: "JSW Energy Limited" },
      { symbol: "TORNTPOWER", name: "Torrent Power Limited" },
    ],
  },
  {
    name: "Pharmaceuticals",
    stocks: [
      { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Limited" },
      { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories Limited" },
      { symbol: "CIPLA", name: "Cipla Limited" },
      { symbol: "DIVISLAB", name: "Divi's Laboratories Limited" },
      { symbol: "LUPIN", name: "Lupin Limited" },
      { symbol: "AUROPHARMA", name: "Aurobindo Pharma Limited" },
    ],
  },
  {
    name: "Computers - Software & Consulting",
    stocks: [
      { symbol: "TCS", name: "Tata Consultancy Services Limited" },
      { symbol: "INFY", name: "Infosys Limited" },
      { symbol: "WIPRO", name: "Wipro Limited" },
      { symbol: "HCLTECH", name: "HCL Technologies Limited" },
      { symbol: "TECHM", name: "Tech Mahindra Limited" },
    ],
  },
  {
    name: "Telecom - Cellular & Fixed Line Services",
    stocks: [
      { symbol: "BHARTIARTL", name: "Bharti Airtel Limited" },
      { symbol: "IDEA", name: "Vodafone Idea Limited" },
      { symbol: "TATACOMM", name: "Tata Communications Limited" },
    ],
  },
  {
    name: "Other Industrial Products",
    stocks: [
      { symbol: "CUMMINSIND", name: "Cummins India Limited" },
      { symbol: "SCHAEFFLER", name: "Schaeffler India Limited" },
      { symbol: "SKFINDIA", name: "SKF India Limited" },
    ],
  },
  {
    name: "Non-Banking Financial Company (NBFC)",
    stocks: [
      { symbol: "BAJFINANCE", name: "Bajaj Finance Limited" },
      { symbol: "BAJAJFINSV", name: "Bajaj Finserv Limited" },
      { symbol: "CHOLAFIN", name: "Cholamandalam Investment and Finance Company Limited" },
      { symbol: "SHRIRAMFIN", name: "Shriram Finance Limited" },
      { symbol: "MUTHOOTFIN", name: "Muthoot Finance Limited" },
    ],
  },
  {
    name: "Civil Construction",
    stocks: [
      { symbol: "LT", name: "Larsen & Toubro Limited" },
      { symbol: "NBCC", name: "NBCC (India) Limited" },
      { symbol: "IRB", name: "IRB Infrastructure Developers Limited" },
      { symbol: "KNRCON", name: "KNR Constructions Limited" },
      { symbol: "PNCINFRA", name: "PNC Infratech Limited" },
    ],
  },
  {
    name: "Other Textile Products",
    stocks: [
      { symbol: "PAGEIND", name: "Page Industries Limited" },
      { symbol: "TRIDENT", name: "Trident Limited" },
      { symbol: "WELSPUNLIV", name: "Welspun Living Limited" },
      { symbol: "KPRMILL", name: "K.P.R. Mill Limited" },
      { symbol: "GOKEX", name: "Gokaldas Exports Limited" },
    ],
  },
  {
    name: "Tea & Coffee",
    stocks: [
      { symbol: "TATACONSUM", name: "TATA CONSUMER PRODUCTS LIMITED" },
      { symbol: "CCL", name: "CCL Products (India) Limited" },
      { symbol: "MCLEODRUSS", name: "Mcleod Russel India Limited" },
    ],
  },
  {
    name: "General",
    stocks: [
      { symbol: "RELIANCE", name: "Reliance Industries Limited" },
      { symbol: "ITC", name: "ITC Limited" },
    ],
  },
  {
    name: "Commercial Vehicles",
    stocks: [
      { symbol: "TMCV", name: "Tata Motors Limited" },
      { symbol: "ASHOKLEY", name: "Ashok Leyland Limited" },
    ],
  },
  {
    name: "Other Financial Services",
    stocks: [
      { symbol: "SBICARD", name: "SBI Cards and Payment Services Limited" },
      { symbol: "IIFL", name: "IIFL Finance Limited" },
    ],
  },
  {
    name: "Financial Technology (Fintech)",
    stocks: [
      { symbol: "PAYTM", name: "One 97 Communications Limited" },
      { symbol: "POLICYBZR", name: "PB Fintech Limited" },
    ],
  },
  {
    name: "Power Generation",
    stocks: [
      { symbol: "NHPC", name: "NHPC Limited" },
      { symbol: "SJVN", name: "SJVN Limited" },
    ],
  },
  {
    name: "Other Electrical Equipment",
    stocks: [
      { symbol: "HAVELLS", name: "Havells India Limited" },
      { symbol: "VGUARD", name: "V-Guard Industries Limited" },
    ],
  },
  {
    name: "Exchange and Data Platform",
    stocks: [
      { symbol: "BSE", name: "BSE Limited" },
      { symbol: "MCX", name: "Multi Commodity Exchange of India Limited" },
      { symbol: "CDSL", name: "Central Depository Services (India) Limited" },
    ],
  },
  {
    name: "Trading - Minerals",
    stocks: [
      { symbol: "MMTC", name: "MMTC Limited" },
      { symbol: "GMDCLTD", name: "Gujarat Mineral Development Corporation Limited" },
    ],
  },
  {
    name: "Private Sector Bank",
    stocks: [
      { symbol: "HDFCBANK", name: "HDFC Bank Limited" },
      { symbol: "ICICIBANK", name: "ICICI Bank Limited" },
      { symbol: "AXISBANK", name: "Axis Bank Limited" },
      { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Limited" },
      { symbol: "INDUSINDBK", name: "IndusInd Bank Limited" },
    ],
  },
  {
    name: "Cement & Cement Products",
    stocks: [
      { symbol: "ULTRACEMCO", name: "UltraTech Cement Limited" },
      { symbol: "SHREECEM", name: "SHREE CEMENT LIMITED" },
      { symbol: "AMBUJACEM", name: "Ambuja Cements Limited" },
      { symbol: "ACC", name: "ACC Limited" },
      { symbol: "DALBHARAT", name: "Dalmia Bharat Limited" },
    ],
  },
  {
    name: "Commodity Chemicals",
    stocks: [
      { symbol: "TATACHEM", name: "Tata Chemicals Limited" },
      { symbol: "GNFC", name: "Gujarat Narmada Valley Fertilizers and Chemicals Limited" },
      { symbol: "DEEPAKNTR", name: "Deepak Nitrite Limited" },
    ],
  },
  {
    name: "Other Food Products",
    stocks: [
      { symbol: "BRITANNIA", name: "Britannia Industries Limited" },
      { symbol: "NESTLEIND", name: "Nestle India Limited" },
    ],
  },
  {
    name: "Coal",
    stocks: [
      { symbol: "COALINDIA", name: "Coal India Limited" },
      { symbol: "NLCINDIA", name: "NLC India Limited" },
    ],
  },
  {
    name: "Digital Entertainment",
    stocks: [
      { symbol: "ZEEL", name: "Zee Entertainment Enterprises Limited" },
      { symbol: "PVRINOX", name: "PVR INOX Limited" },
      { symbol: "NAZARA", name: "Nazara Technologies Limited" },
    ],
  },
  {
    name: "Financial Institution",
    stocks: [
      { symbol: "PFC", name: "Power Finance Corporation Limited" },
      { symbol: "RECLTD", name: "REC Limited" },
      { symbol: "IRFC", name: "Indian Railway Finance Corporation Limited" },
    ],
  },
  {
    name: "Public Sector Bank",
    stocks: [
      { symbol: "SBIN", name: "State Bank of India" },
      { symbol: "BANKBARODA", name: "Bank of Baroda" },
      { symbol: "PNB", name: "Punjab National Bank" },
      { symbol: "CANBK", name: "Canara Bank" },
      { symbol: "UNIONBANK", name: "Union Bank of India" },
    ],
  },
  {
    name: "Iron & Steel Products",
    stocks: [
      { symbol: "TATASTEEL", name: "Tata Steel Limited" },
      { symbol: "JSWSTEEL", name: "JSW Steel Limited" },
      { symbol: "JINDALSTEL", name: "JINDAL STEEL LIMITED" },
      { symbol: "SAIL", name: "Steel Authority of India Limited" },
    ],
  },
  {
    name: "Residential, Commercial Projects",
    stocks: [
      { symbol: "DLF", name: "DLF Limited" },
      { symbol: "GODREJPROP", name: "Godrej Properties Limited" },
      { symbol: "OBEROIRLTY", name: "Oberoi Realty Limited" },
      { symbol: "PRESTIGE", name: "Prestige Estates Projects Limited" },
      { symbol: "SOBHA", name: "Sobha Limited" },
    ],
  },
  {
    name: "Industrial Minerals",
    stocks: [{ symbol: "20MICRONS", name: "20 Microns Limited" }],
  },
  {
    name: "Heavy Electrical Equipment",
    stocks: [
      { symbol: "BHEL", name: "Bharat Heavy Electricals Limited" },
      { symbol: "SIEMENS", name: "Siemens Limited" },
      { symbol: "ABB", name: "ABB India Limited" },
    ],
  },
  {
    name: "Cables - Electricals",
    stocks: [
      { symbol: "POLYCAB", name: "Polycab India Limited" },
      { symbol: "KEI", name: "KEI Industries Limited" },
      { symbol: "FINCABLES", name: "Finolex Cables Limited" },
    ],
  },
  {
    name: "Aerospace & Defense",
    stocks: [
      { symbol: "HAL", name: "Hindustan Aeronautics Limited" },
      { symbol: "BEL", name: "Bharat Electronics Limited" },
      { symbol: "MAZDOCK", name: "Mazagon Dock Shipbuilders Limited" },
    ],
  },
  {
    name: "General Insurance",
    stocks: [
      { symbol: "ICICIGI", name: "ICICI Lombard General Insurance Company Limited" },
      { symbol: "NIACL", name: "The New India Assurance Company Limited" },
      { symbol: "STARHEALTH", name: "Star Health and Allied Insurance Company Limited" },
    ],
  },
  {
    name: "IT Enabled Services",
    stocks: [
      { symbol: "FSL", name: "Firstsource Solutions Limited" },
      { symbol: "NUCLEUS", name: "Nucleus Software Exports Limited" },
    ],
  },
];

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - +new Date(iso);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
