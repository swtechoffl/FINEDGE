export type ShapeKind = "rectangle" | "diamond" | "ellipse" | "note";

export interface ShapeNodeData extends Record<string, unknown> {
  label: string;
  shape: ShapeKind;
  color: string;
}

export const SHAPE_COLORS = ["#059669", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#475569"];

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rectangle: "Process",
  diamond: "Decision",
  ellipse: "Start / End",
  note: "Sticky note",
};
