export type ShapeKind = "rectangle" | "diamond" | "ellipse" | "note" | "text";

export interface ShapeNodeData extends Record<string, unknown> {
  label: string;
  shape: ShapeKind;
  color: string;
  fontSize: number;
  bold: boolean;
}

export const SHAPE_COLORS = ["#059669", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#475569"];

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rectangle: "Process",
  diamond: "Decision",
  ellipse: "Start / End",
  note: "Sticky note",
  text: "Text",
};

export const FONT_SIZES = [12, 14, 18, 24] as const;
export const DEFAULT_FONT_SIZE = 14;
