import { createElement, type ReactNode } from "react";
import { Rocket, CalendarClock, CalendarCheck2, Building2, BarChart2, type LucideIcon } from "lucide-react";
import { StockRow, EarningsPosterRow, ActionChip, IpoPosterRow, VolumeGainerPosterRow } from "./posterRows";
import type { RowDensity } from "./posterShared";

export interface PosterMakerColumn {
  key: string;
  label: string;
  required: boolean;
  type?: "number"; // unlabeled = free text; "symbol" columns are auto-uppercased regardless
  placeholder: string;
}

export interface PosterMakerTemplate {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  defaultTitle: string;
  defaultSubtitle: string;
  posterIdPrefix: string;
  // One example line per column, joined with the same delimiter parsePosterMakerText
  // expects — shown as the textarea's placeholder so the paste format is
  // self-explanatory instead of needing separate instructions.
  columns: PosterMakerColumn[];
  exampleLine: string;
  renderRow: (row: Record<string, string>, density: RowDensity) => ReactNode;
}

export const POSTER_MAKER_TEMPLATES: PosterMakerTemplate[] = [
  {
    id: "stocks-to-watch",
    label: "Stocks to Watch",
    icon: Rocket,
    gradient: "linear-gradient(160deg, #0f5132 0%, #06110c 70%)",
    defaultTitle: "Stocks to Watch",
    defaultSubtitle: "Near 52-Week High",
    posterIdPrefix: "poster-maker-stocks-to-watch",
    columns: [{ key: "symbol", label: "Symbol", required: true, placeholder: "RELIANCE" }],
    exampleLine: "RELIANCE",
    renderRow: (row, density) => createElement(StockRow, { symbol: row.symbol, density }),
  },
  {
    id: "upcoming-earnings",
    label: "Upcoming Earnings",
    icon: CalendarClock,
    gradient: "linear-gradient(160deg, #1e3a8a 0%, #070a14 70%)",
    defaultTitle: "Upcoming Earnings",
    defaultSubtitle: "Results Calendar",
    posterIdPrefix: "poster-maker-upcoming-earnings",
    columns: [
      { key: "symbol", label: "Symbol", required: true, placeholder: "RELIANCE" },
      { key: "date", label: "Date", required: true, placeholder: "15-Aug" },
    ],
    exampleLine: "RELIANCE, 15-Aug",
    renderRow: (row, density) => createElement(EarningsPosterRow, { symbol: row.symbol, date: row.date, density }),
  },
  {
    id: "corporate-actions",
    label: "Corporate Actions",
    icon: CalendarCheck2,
    gradient: "linear-gradient(160deg, #92400e 0%, #0e0a06 70%)",
    defaultTitle: "Corporate Actions",
    defaultSubtitle: "Dividends, Splits & More",
    posterIdPrefix: "poster-maker-corporate-actions",
    columns: [
      { key: "symbol", label: "Symbol", required: true, placeholder: "RELIANCE" },
      { key: "exDate", label: "Ex-Date", required: true, placeholder: "20-Aug" },
    ],
    exampleLine: "RELIANCE, 20-Aug",
    renderRow: (row, density) => createElement(ActionChip, { symbol: row.symbol, exDate: row.exDate, density }),
  },
  {
    id: "ipo-watch",
    label: "IPO Watch",
    icon: Building2,
    gradient: "linear-gradient(160deg, #9d174d 0%, #0e0509 70%)",
    defaultTitle: "IPO Watch",
    defaultSubtitle: "Current & Upcoming",
    posterIdPrefix: "poster-maker-ipo-watch",
    columns: [
      { key: "symbol", label: "Symbol", required: true, placeholder: "ABCIND" },
      { key: "company", label: "Company", required: true, placeholder: "ABC Industries Ltd" },
      { key: "sub", label: "Sub-label (optional)", required: false, placeholder: "Open till 25-Aug" },
      { key: "isSme", label: "SME? yes/no (optional)", required: false, placeholder: "no" },
    ],
    exampleLine: "ABCIND, ABC Industries Ltd, Open till 25-Aug, no",
    renderRow: (row, density) =>
      createElement(IpoPosterRow, {
        symbol: row.symbol,
        company: row.company ?? "",
        sub: row.sub ?? "",
        isSme: /^(yes|y|true|sme)$/i.test((row.isSme ?? "").trim()),
        density,
      }),
  },
  {
    id: "volume-gainers",
    label: "Volume Gainers",
    icon: BarChart2,
    gradient: "linear-gradient(160deg, #065f46 0%, #06110c 70%)",
    defaultTitle: "Volume Gainers",
    defaultSubtitle: "Unusual Activity Today",
    posterIdPrefix: "poster-maker-volume-gainers",
    columns: [
      { key: "symbol", label: "Symbol", required: true, placeholder: "RELIANCE" },
      { key: "changePct", label: "% Change", required: true, type: "number", placeholder: "4.2" },
    ],
    exampleLine: "RELIANCE, 4.2",
    renderRow: (row, density) =>
      createElement(VolumeGainerPosterRow, { symbol: row.symbol, changePct: Number(row.changePct), density }),
  },
];
