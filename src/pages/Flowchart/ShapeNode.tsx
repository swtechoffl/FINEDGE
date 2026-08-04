import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import type { ShapeKind, ShapeNodeData } from "./types";

// A visible source dot on each side lets a user start a connection from any
// edge. A single target handle spans the whole shape underneath them (see
// .flowchart-handle--target-full) so a connection can be dropped anywhere on
// the shape, not just precisely onto one of the small dots — matching the
// "connect from any side, drop anywhere" feel of Miro/FigJam.
const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

// Resize floor per shape — matches each shape's own CSS min-width/min-height
// (flowchart.css) so a drag-resize can never shrink a shape smaller than it
// already renders at by default.
const MIN_SIZE: Record<ShapeKind, { width: number; height: number }> = {
  rectangle: { width: 150, height: 64 },
  ellipse: { width: 160, height: 90 },
  diamond: { width: 170, height: 130 },
  note: { width: 160, height: 60 },
  text: { width: 60, height: 28 },
};

function ShapeNodeComponent({ id, data, selected, width, height }: NodeProps) {
  const { label, shape, color, fontSize, bold } = data as unknown as ShapeNodeData;
  const { setNodes, deleteElements } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textStyle: CSSProperties = { fontSize: fontSize ?? 14, fontWeight: bold === false ? 500 : 700 };
  // Only pins an explicit size once the shape has actually been drag-resized
  // (node.width/height start out unset) — until then it keeps auto-sizing
  // to its content via the CSS min-width/min-height rules, unchanged.
  const sizeStyle: CSSProperties = width != null && height != null ? { width, height } : {};
  const minSize = MIN_SIZE[shape] ?? MIN_SIZE.rectangle;

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  function commitLabel(value: string) {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: value.trim() || "Untitled" } } : n)),
    );
  }

  return (
    <>
      {/* A sibling of the shape div, not a child — diamond's clip-path and
          note's slight rotation would otherwise chop the resize handles off
          since they'd inherit that clipping/transform. */}
      <NodeResizer
        isVisible={selected}
        minWidth={minSize.width}
        minHeight={minSize.height}
        lineClassName="nodrag"
        handleClassName="flowchart-resize-handle nodrag"
      />
      <div
        className={`flowchart-shape flowchart-shape--${shape}${selected ? " flowchart-shape--selected" : ""}`}
        style={{ "--shape-color": color, ...sizeStyle } as CSSProperties}
        onDoubleClick={() => setEditing(true)}
      >
        <Handle
          id="drop"
          type="target"
          position={Position.Top}
          className="flowchart-handle flowchart-handle--target-full"
          isConnectableStart={false}
        />
        {SIDES.map((pos) => (
          <Handle key={`source-${pos}`} id={pos} type="source" position={pos} className="flowchart-handle" />
        ))}

        <div className="flowchart-shape__body">
          {editing ? (
            <textarea
              ref={inputRef}
              defaultValue={label}
              rows={2}
              style={textStyle}
              className="flowchart-shape__input nodrag nowheel"
              onBlur={(e) => {
                commitLabel(e.target.value);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                } else if (e.key === "Escape") {
                  setEditing(false);
                }
              }}
            />
          ) : (
            <span className="flowchart-shape__label" style={textStyle}>
              {label}
            </span>
          )}
        </div>

        {selected && (
          <button
            type="button"
            className="flowchart-shape__delete nodrag"
            title="Delete shape"
            onClick={() => deleteElements({ nodes: [{ id }] })}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </>
  );
}

export const ShapeNode = memo(ShapeNodeComponent);
