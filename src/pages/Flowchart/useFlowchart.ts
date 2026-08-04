import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEdge,
  MarkerType,
  Position,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { boardStorageKey } from "./boards";
import {
  DEFAULT_FONT_SIZE,
  LINE_STYLE_EDGE_TYPE,
  DEFAULT_LINE_STYLE,
  SHAPE_LABELS,
  type ShapeKind,
  type ShapeNodeData,
} from "./types";

export type FlowNode = Node<ShapeNodeData>;

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

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
          "Double-click a shape to rename it. Drag from its edge to connect. Click-drag on empty canvas to box-select. Right-click-drag (or middle-click-drag) to pan. Ctrl/Cmd+C and Ctrl/Cmd+V to copy-paste.",
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

type Snapshot = { nodes: FlowNode[]; edges: Edge[] };
const MAX_HISTORY = 50;
const HISTORY_DEBOUNCE_MS = 400;

// How far off in each direction a shape spawned via spawnConnectedShape
// lands from the node it was spawned off of.
const SPAWN_OFFSET: Record<Position, { dx: number; dy: number }> = {
  [Position.Top]: { dx: 0, dy: -180 },
  [Position.Right]: { dx: 240, dy: 0 },
  [Position.Bottom]: { dx: 0, dy: 180 },
  [Position.Left]: { dx: -240, dy: 0 },
};

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

  // Undo/redo: rather than hooking every action site individually, a
  // checkpoint is captured from whatever `nodes`/`edges` looked like right
  // before a burst of changes that's been quiet for HISTORY_DEBOUNCE_MS —
  // this groups an entire drag (which fires onNodesChange continuously) or a
  // rapid multi-click into a single undo step instead of one per pixel.
  const lastCommittedRef = useRef<Snapshot>({ nodes: initial.nodes, edges: initial.edges });
  const historyRef = useRef<Snapshot[]>([]);
  const redoStackRef = useRef<Snapshot[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setHistoryTick] = useState(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const before = lastCommittedRef.current;
      if (before.nodes !== nodes || before.edges !== edges) {
        historyRef.current.push(before);
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
        redoStackRef.current = [];
        lastCommittedRef.current = { nodes, edges };
        setHistoryTick((t) => t + 1);
      }
    }, HISTORY_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Flush any not-yet-committed burst first, so undo steps back to right
    // before it rather than skipping past it.
    if (lastCommittedRef.current.nodes !== nodes || lastCommittedRef.current.edges !== edges) {
      historyRef.current.push(lastCommittedRef.current);
      lastCommittedRef.current = { nodes, edges };
    }
    const prev = historyRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(lastCommittedRef.current);
    lastCommittedRef.current = prev;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistoryTick((t) => t + 1);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const next = redoStackRef.current.pop();
    if (!next) return;
    historyRef.current.push(lastCommittedRef.current);
    lastCommittedRef.current = next;
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryTick((t) => t + 1);
  }, [setNodes, setEdges]);

  // Re-read on every render — `setHistoryTick` above only exists to trigger
  // that render when the underlying ref-based stacks change.
  const canUndo = historyRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  // Tracks the connector style new connections should use — a ref so
  // changing it (via the toolbar) doesn't need to recreate onConnect.
  const defaultEdgeTypeRef = useRef<string>(LINE_STYLE_EDGE_TYPE[DEFAULT_LINE_STYLE]);
  const setDefaultEdgeType = useCallback((edgeType: string) => {
    defaultEdgeTypeRef.current = edgeType;
  }, []);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: defaultEdgeTypeRef.current,
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const restyleSelectedEdges = useCallback(
    (edgeType: string) => {
      setEdges((eds) => eds.map((e) => (e.selected ? { ...e, type: edgeType } : e)));
    },
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
      const id = makeId("node");
      const newNode: FlowNode = { id, type: "shape", position, data: { label, shape, color, fontSize, bold } };
      setNodes((nds) => nds.concat(newNode));
      return id;
    },
    [setNodes],
  );

  // Splits an existing edge in two through a freshly created node — used by
  // the "+" button rendered at an edge's midpoint (see FlowchartEdges.tsx).
  // The new edges inherit the original edge's style/type/marker so the
  // connector look doesn't change, just its route.
  const insertNodeOnEdge = useCallback(
    (
      edgeId: string,
      position: { x: number; y: number },
      shape: ShapeKind,
      color: string,
      label: string,
      fontSize: number,
      bold: boolean,
    ) => {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return null;
      const nodeId = makeId("node");
      const newNode: FlowNode = { id: nodeId, type: "shape", position, data: { label, shape, color, fontSize, bold } };
      const edgeToNew: Edge = { ...edge, id: makeId("edge"), target: nodeId, targetHandle: undefined };
      const edgeFromNew: Edge = { ...edge, id: makeId("edge"), source: nodeId, sourceHandle: undefined };
      setNodes((nds) => nds.concat(newNode));
      setEdges((eds) => eds.filter((e) => e.id !== edgeId).concat(edgeToNew, edgeFromNew));
      return nodeId;
    },
    [edges, setNodes, setEdges],
  );

  // A drag started from a source dot and released back over its own node
  // (see FlowchartCanvas.tsx's onConnectEnd) reads as "clicked the dot" —
  // spawns a fresh copy of that same shape a step off in the handle's
  // direction and wires them together, instead of requiring a drag onto an
  // existing shape every time.
  const spawnConnectedShape = useCallback(
    (sourceNodeId: string, sourceHandlePosition: Position) => {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return null;
      const { shape, color, fontSize, bold } = sourceNode.data;
      const { dx, dy } = SPAWN_OFFSET[sourceHandlePosition];
      const nodeId = makeId("node");
      const label = shape === "text" ? "Text" : SHAPE_LABELS[shape];
      const newNode: FlowNode = {
        id: nodeId,
        type: "shape",
        position: { x: sourceNode.position.x + dx, y: sourceNode.position.y + dy },
        data: { label, shape, color, fontSize, bold },
      };
      const newEdge: Edge = {
        id: makeId("edge"),
        source: sourceNodeId,
        sourceHandle: sourceHandlePosition,
        target: nodeId,
        type: defaultEdgeTypeRef.current,
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
      };
      setNodes((nds) => nds.concat(newNode));
      setEdges((eds) => eds.concat(newEdge));
      return nodeId;
    },
    [nodes, setNodes, setEdges],
  );

  // Pastes a previously copied set of nodes (+ any edges between them) as
  // fresh copies, offset so repeated pastes cascade instead of stacking.
  const pasteNodes = useCallback(
    (copiedNodes: FlowNode[], copiedEdges: Edge[], offset: number) => {
      const idMap = new Map<string, string>();
      const newNodes: FlowNode[] = copiedNodes.map((n) => {
        const id = makeId("node");
        idMap.set(n.id, id);
        return {
          ...n,
          id,
          position: { x: n.position.x + offset, y: n.position.y + offset },
          selected: true,
          data: { ...n.data },
        };
      });
      const newEdges: Edge[] = copiedEdges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e) => ({ ...e, id: makeId("edge"), source: idMap.get(e.source)!, target: idMap.get(e.target)! }));

      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);
    },
    [setNodes, setEdges],
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
    insertNodeOnEdge,
    spawnConnectedShape,
    pasteNodes,
    selectNode,
    updateSelected,
    setDefaultEdgeType,
    restyleSelectedEdges,
    clearCanvas,
    replaceState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
