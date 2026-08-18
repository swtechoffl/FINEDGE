export type PaginationStyleId = "dots" | "bars" | "fraction" | "none";

export interface PaginationStyleOption {
  id: PaginationStyleId;
  label: string;
}

export const PAGINATION_STYLES: PaginationStyleOption[] = [
  { id: "dots", label: "Dots" },
  { id: "bars", label: "Bars" },
  { id: "fraction", label: "Fraction" },
  { id: "none", label: "None" },
];
