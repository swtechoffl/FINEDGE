import { useCallback, useEffect, useRef } from "react";
import {
  addEdge,
  MarkerType,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { ShapeKind, ShapeNodeData } from "./types";

const STORAGE_KEY = "stoqtrade-flowchart-v1";

export type FlowNode = Node<ShapeNodeData>;

const DEFAULT_NODES: FlowNode[] = [
  {
    id: "start",
    type: "shape",
    position: { x: 80, y: 160 },
    data: { label: "Start", shape: "ellipse", color: "#059669" },
  },
  {
    id: "hint",
    type: "shape",
    position: { x: 340, y: 60 },
    data: {
      label: "Double-click a shape to rename it. Drag from its edge to connect. Use the toolbar to add more shapes.",
      shape: "note",
      color: "#d97706",
    },
  },
];

const DEFAULT_EDGES: Edge[] = [];

function loadInitial(): { nodes: FlowNode[]; edges: Edge[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) return parsed;
    }
  } catch {
    // fall through to defaults
  }
  return { nodes: DEFAULT_NODES, edges: DEFAULT_EDGES };
}

export function useFlowchart() {
  const initial = useRef(loadInitial()).current;
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
    }, 300);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...connection, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 } },
          eds,
        ),
      ),
    [setEdges],
  );

  const addShape = useCallback(
    (shape: ShapeKind, position: { x: number; y: number }, color: string, label: string) => {
      const id = `node-${Date.now()}-${Math.round(Math.random() * 1000)}`;
      const newNode: FlowNode = { id, type: "shape", position, data: { label, shape, color } };
      setNodes((nds) => nds.concat(newNode));
      return id;
    },
    [setNodes],
  );

  const selectNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })));
    },
    [setNodes],
  );

  const recolorSelected = useCallback(
    (color: string) => {
      setNodes((nds) => nds.map((n) => (n.selected ? { ...n, data: { ...n.data, color } } : n)));
    },
    [setNodes],
  );

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addShape,
    selectNode,
    recolorSelected,
    clearCanvas,
  };
}
