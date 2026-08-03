import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEdge,
  MarkerType,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { boardStorageKey } from "./boards";
import { DEFAULT_FONT_SIZE, type ShapeKind, type ShapeNodeData } from "./types";

export type FlowNode = Node<ShapeNodeData>;

function defaultNodesFor(): FlowNode[] {
  return [
    {
      id: "start",
      type: "shape",
      // Kept clear of the floating toolbar's top-left footprint so it's
      // never accidentally un-clickable on a fresh board.
      position: { x: 80, y: 480 },
      data: { label: "Start", shape: "ellipse", color: "#059669", fontSize: DEFAULT_FONT_SIZE, bold: true },
    },
    {
      id: "hint",
      type: "shape",
      position: { x: 340, y: 380 },
      data: {
        label:
          "Double-click a shape to rename it. Drag from its edge to connect. Click-drag on empty canvas to box-select. Right-click-drag (or middle-click-drag) to pan.",
        shape: "note",
        color: "#d97706",
        fontSize: DEFAULT_FONT_SIZE - 1,
        bold: false,
      },
    },
  ];
}

function loadBoard(boardId: string): { nodes: FlowNode[]; edges: Edge[] } {
  try {
    const raw = localStorage.getItem(boardStorageKey(boardId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) return parsed;
    }
  } catch {
    // fall through to defaults
  }
  return { nodes: defaultNodesFor(), edges: [] };
}

export function useFlowchart(boardId: string) {
  const initial = useRef(loadBoard(boardId)).current;
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  useEffect(() => {
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      localStorage.setItem(boardStorageKey(boardId), JSON.stringify({ nodes, edges }));
      setSaveStatus("saved");
    }, 300);
    return () => clearTimeout(timer);
  }, [boardId, nodes, edges]);

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
    (
      shape: ShapeKind,
      position: { x: number; y: number },
      color: string,
      label: string,
      fontSize: number,
      bold: boolean,
    ) => {
      const id = `node-${Date.now()}-${Math.round(Math.random() * 1000)}`;
      const newNode: FlowNode = { id, type: "shape", position, data: { label, shape, color, fontSize, bold } };
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

  // Merges a partial data patch into every selected shape — used for color,
  // font size, and bold so they all share one code path.
  const updateSelected = useCallback(
    (patch: Partial<ShapeNodeData>) => {
      setNodes((nds) => nds.map((n) => (n.selected ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [setNodes],
  );

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const replaceState = useCallback(
    (data: { nodes: FlowNode[]; edges: Edge[] }) => {
      setNodes(data.nodes);
      setEdges(data.edges);
    },
    [setNodes, setEdges],
  );

  return {
    nodes,
    edges,
    saveStatus,
    setNodes,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addShape,
    selectNode,
    updateSelected,
    clearCanvas,
    replaceState,
  };
}
