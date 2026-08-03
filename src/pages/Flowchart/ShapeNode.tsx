import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import type { ShapeNodeData } from "./types";

// A visible source dot on each side lets a user start a connection from any
// edge. A single target handle spans the whole shape underneath them (see
// .flowchart-handle--target-full) so a connection can be dropped anywhere on
// the shape, not just precisely onto one of the small dots — matching the
// "connect from any side, drop anywhere" feel of Miro/FigJam.
const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function ShapeNodeComponent({ id, data, selected }: NodeProps) {
  const { label, shape, color, fontSize, bold } = data as unknown as ShapeNodeData;
  const { setNodes, deleteElements } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textStyle: CSSProperties = { fontSize: fontSize ?? 14, fontWeight: bold === false ? 500 : 700 };

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
    <div
      className={`flowchart-shape flowchart-shape--${shape}${selected ? " flowchart-shape--selected" : ""}`}
      style={{ "--shape-color": color } as CSSProperties}
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
  );
}

export const ShapeNode = memo(ShapeNodeComponent);
