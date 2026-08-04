import type { RefObject } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps, EdgeTypes, Position } from "@xyflow/react";
import { Plus } from "lucide-react";

// The three built-in path shapes accept slightly different param shapes
// (getStraightPath doesn't take sourcePosition/targetPosition at all), but a
// superset object works for all of them — the extra fields are simply
// ignored by the ones that don't use them.
type PathParams = {
  sourceX: number;
  sourceY: number;
  sourcePosition?: Position;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
};
type PathFn = (params: PathParams) => [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number];

export type InsertOnEdgeHandler = (edgeId: string, x: number, y: number) => void;

// One "+" button rendered at the edge's midpoint that inserts a new shape
// (of whatever shape was last used) and splits the edge in two through it.
// Registered under xyflow's own "default"/"straight"/"smoothstep" type keys
// (see createShapeEdgeTypes below) so it fully replaces the built-in edge
// renderers rather than requiring every edge's `type` to change.
function makeShapeEdge(pathFn: PathFn, insertOnEdgeRef: RefObject<InsertOnEdgeHandler>) {
  function ShapeEdge({
    id,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    style,
    markerStart,
    markerEnd,
    selected,
  }: EdgeProps) {
    const [edgePath, labelX, labelY] = pathFn({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

    return (
      <>
        <BaseEdge id={id} path={edgePath} style={style} markerStart={markerStart} markerEnd={markerEnd} />
        <EdgeLabelRenderer>
          <button
            type="button"
            className={`flowchart-edge-add nodrag nopan${selected ? " flowchart-edge-add--visible" : ""}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            title="Insert a shape here"
            onClick={(e) => {
              e.stopPropagation();
              insertOnEdgeRef.current?.(id, labelX, labelY);
            }}
          >
            <Plus size={12} />
          </button>
        </EdgeLabelRenderer>
      </>
    );
  }
  return ShapeEdge;
}

export function createShapeEdgeTypes(insertOnEdgeRef: RefObject<InsertOnEdgeHandler>): EdgeTypes {
  return {
    default: makeShapeEdge(getBezierPath, insertOnEdgeRef),
    straight: makeShapeEdge(getStraightPath, insertOnEdgeRef),
    smoothstep: makeShapeEdge(getSmoothStepPath, insertOnEdgeRef),
  };
}
