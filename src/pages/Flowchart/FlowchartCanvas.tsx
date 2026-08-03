import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
  getViewportForBounds,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bold,
  Check,
  Diamond,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Save,
  Square,
  StickyNote,
  Trash2,
  Circle,
  Type,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { Button } from "../../components/ui/Button";
import { downloadFile } from "../../lib/shareImage";
import { useTheme } from "../../theme/ThemeContext";
import { ShapeNode } from "./ShapeNode";
import { useFlowchart, type FlowNode } from "./useFlowchart";
import { DEFAULT_FONT_SIZE, FONT_SIZES, SHAPE_COLORS, SHAPE_LABELS, type ShapeKind } from "./types";
import "./flowchart.css";

const nodeTypes: NodeTypes = { shape: ShapeNode };

const SHAPE_BUTTONS: { shape: ShapeKind; icon: typeof Square }[] = [
  { shape: "rectangle", icon: Square },
  { shape: "diamond", icon: Diamond },
  { shape: "ellipse", icon: Circle },
  { shape: "note", icon: StickyNote },
  { shape: "text", icon: Type },
];

const GRID_SIZE = 20;

export function FlowchartCanvas({ boardId }: { boardId: string }) {
  const { theme } = useTheme();
  const {
    nodes,
    edges,
    saveStatus,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addShape,
    pasteNodes,
    selectNode,
    updateSelected,
    clearCanvas,
    replaceState,
  } = useFlowchart(boardId);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<FlowNode> | null>(null);
  const [activeColor, setActiveColor] = useState(SHAPE_COLORS[0]);
  const [activeFontSize, setActiveFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [activeBold, setActiveBold] = useState(true);
  // Cascades successive additions like Miro/FigJam so new shapes don't land
  // stacked exactly on top of the last one.
  const addCountRef = useRef(0);

  const hasSelection = useMemo(() => nodes.some((n) => n.selected), [nodes]);

  // Copy/paste via Ctrl/Cmd+C and Ctrl/Cmd+V. Refs keep the window-level
  // listener (attached once) reading current nodes/edges without going
  // stale, and without re-attaching the listener on every keystroke.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  const clipboardRef = useRef<{ nodes: FlowNode[]; edges: Edge[] } | null>(null);
  const pasteCountRef = useRef(0);

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Renaming a shape uses a real textarea — let the browser's native
      // text copy/paste handle that instead of hijacking it here.
      if (isEditableTarget(e.target)) return;
      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key === "c" || e.key === "C") {
        const selected = nodesRef.current.filter((n) => n.selected);
        if (selected.length === 0) return;
        const selectedIds = new Set(selected.map((n) => n.id));
        const relatedEdges = edgesRef.current.filter((ed) => selectedIds.has(ed.source) && selectedIds.has(ed.target));
        clipboardRef.current = {
          nodes: selected.map((n) => ({ ...n, data: { ...n.data } })),
          edges: relatedEdges.map((ed) => ({ ...ed })),
        };
        pasteCountRef.current = 0;
      } else if (e.key === "v" || e.key === "V") {
        if (!clipboardRef.current) return;
        e.preventDefault();
        pasteCountRef.current += 1;
        pasteNodes(clipboardRef.current.nodes, clipboardRef.current.edges, pasteCountRef.current * 40);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pasteNodes]);

  const handleAddShape = useCallback(
    (shape: ShapeKind) => {
      if (!rfInstance || !wrapperRef.current) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      const step = addCountRef.current % 8;
      addCountRef.current += 1;
      // Offset in flow-space (not screen px) so the stagger stays consistent
      // regardless of the current zoom level.
      const cascade = step * 90;
      const center = rfInstance.screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
      const position = { x: center.x + cascade, y: center.y + cascade };
      const label = shape === "text" ? "Text" : SHAPE_LABELS[shape];
      const id = addShape(shape, position, activeColor, label, activeFontSize, activeBold);
      selectNode(id);
    },
    [rfInstance, addShape, selectNode, activeColor, activeFontSize, activeBold],
  );

  const handleColorPick = useCallback(
    (color: string) => {
      setActiveColor(color);
      if (hasSelection) updateSelected({ color });
    },
    [hasSelection, updateSelected],
  );

  const handleFontSizePick = useCallback(
    (fontSize: number) => {
      setActiveFontSize(fontSize);
      if (hasSelection) updateSelected({ fontSize });
    },
    [hasSelection, updateSelected],
  );

  const handleBoldToggle = useCallback(() => {
    const next = !activeBold;
    setActiveBold(next);
    if (hasSelection) updateSelected({ bold: next });
  }, [activeBold, hasSelection, updateSelected]);

  const handleClear = useCallback(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    if (window.confirm("Clear the whole canvas? This can't be undone.")) clearCanvas();
  }, [clearCanvas, nodes.length, edges.length]);

  // Board state already autosaves to this browser (see saveStatus below) —
  // this saves a portable .json file that can be reopened later or handed
  // to someone else, since localStorage doesn't leave the device.
  const handleSaveToFile = useCallback(() => {
    const json = JSON.stringify({ nodes, edges }, null, 2);
    downloadFile(new File([json], "flowchart.json", { type: "application/json" }));
  }, [nodes, edges]);

  const handleOpenClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error("Invalid file");
        if (window.confirm("Load this flowchart? It will replace what's currently on the canvas.")) {
          replaceState(parsed);
        }
      } catch {
        window.alert("Couldn't read that file — pick a flowchart .json file saved from this tool.");
      }
    },
    [replaceState],
  );

  // Exports only export a "selection" when 2+ shapes are deliberately
  // selected (e.g. via box-select) — a single selected shape is usually just
  // whatever was last clicked/added, not an intentional export target, and
  // scoping to it silently crops out everything else (including edges).
  const doExport = useCallback(
    async (kind: "png" | "pdf") => {
      if (!rfInstance) return;
      const all = rfInstance.getNodes();
      if (all.length === 0) return;
      const selectedIds = all.filter((n) => n.selected).map((n) => n.id);
      const targets = selectedIds.length > 1 ? all.filter((n) => selectedIds.includes(n.id)) : all;

      const bounds = rfInstance.getNodesBounds(targets);
      const width = Math.max(bounds.width + 160, 640);
      const height = Math.max(bounds.height + 160, 480);
      const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, 0.15);
      const viewportEl = wrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (!viewportEl) return;

      // Rasterizing the live viewport node directly is a race: html-to-image
      // reads computed styles from the *live* DOM over several async steps,
      // so toggling selection off on the real nodes and back on afterwards
      // can still leak the selection outline/handles/delete button into the
      // image if React restores them before html-to-image finishes reading.
      // A detached, hand-stripped clone has no live state to race against.
      const clone = viewportEl.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".flowchart-shape--selected").forEach((el) => el.classList.remove("flowchart-shape--selected"));
      clone.querySelectorAll(".flowchart-shape__delete").forEach((el) => el.remove());
      // Edge color/width come from CSS custom properties (e.g.
      // --xy-edge-stroke-default) scoped to the .react-flow class, which
      // this clone doesn't carry since we only cloned .react-flow__viewport
      // — without it, `stroke` falls back to its CSS-initial value of
      // `none` and every edge silently disappears. Carrying the class (and
      // "dark" alongside it) restores that variable scope.
      const liveContainer = viewportEl.closest(".react-flow");
      if (liveContainer) liveContainer.classList.forEach((c) => clone.classList.add(c));
      // The edge <svg> elements also get their *size* from `width/height:
      // 100%` cascading up through ancestors we didn't clone. Detached, that
      // collapses to 0×0 — and since an SVG's default overflow is hidden,
      // every edge path would be clipped away regardless of stroke color.
      // Force a large fixed canvas so nothing gets clipped; the outer
      // html-to-image capture frame still crops the final image correctly.
      clone.querySelectorAll("svg").forEach((svg) => {
        svg.setAttribute("width", "20000");
        svg.setAttribute("height", "20000");
        (svg as unknown as HTMLElement).style.overflow = "visible";
      });
      const holder = document.createElement("div");
      holder.style.cssText = "position:fixed; left:-99999px; top:0; pointer-events:none;";
      holder.appendChild(clone);
      document.body.appendChild(holder);

      // html-to-image doesn't reliably serialize SVG stroke/fill that only
      // come from a CSS class (as opposed to a presentation attribute or
      // inline style) — the edge path's color above resolves correctly via
      // getComputedStyle right here, yet still renders invisible once
      // rasterized. Baking the resolved values on as explicit attributes
      // sidesteps that entirely.
      clone.querySelectorAll(".react-flow__edges svg *").forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.stroke && cs.stroke !== "none") el.setAttribute("stroke", cs.stroke);
        if (cs.fill && cs.fill !== "none") el.setAttribute("fill", cs.fill);
        if (cs.strokeWidth) el.setAttribute("stroke-width", cs.strokeWidth);
      });

      const toBlobOptions = {
        backgroundColor: theme === "dark" ? "#09090b" : "#ffffff",
        width,
        height,
        pixelRatio: 2,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      };

      try {
        if (kind === "png") {
          const { toBlob } = await import("html-to-image");
          const blob = await toBlob(clone, toBlobOptions);
          if (blob) downloadFile(new File([blob], "flowchart.png", { type: "image/png" }));
        } else {
          const { exportNodeToPdf } = await import("../../lib/exportPdf");
          await exportNodeToPdf(clone, "flowchart.pdf", toBlobOptions);
        }
      } finally {
        holder.remove();
      }
    },
    [rfInstance, theme],
  );

  const exportScopeLabel = useMemo(() => {
    const selectedCount = nodes.filter((n) => n.selected).length;
    return selectedCount > 1 ? `${selectedCount} selected shapes` : "whole board";
  }, [nodes]);

  return (
    <div ref={wrapperRef} className="relative h-full w-full flowchart-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        nodeTypes={nodeTypes}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        colorMode={theme}
        proOptions={{ hideAttribution: true }}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        snapToGrid
        snapGrid={[GRID_SIZE, GRID_SIZE]}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={GRID_SIZE}
          lineWidth={1}
          color={theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}
          className="flowchart-bg"
        />
        <MiniMap pannable zoomable className="flowchart-minimap" />
        <Controls className="flowchart-controls" showInteractive={false} />
      </ReactFlow>

      {/* Floating shape/tool palette — the Miro-style toolbar */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-xl border border-border bg-surface/95 p-2 shadow-md backdrop-blur">
        <div className="flex gap-1">
          {SHAPE_BUTTONS.map(({ shape, icon: Icon }) => (
            <Button
              key={shape}
              variant="outline"
              size="icon"
              title={`Add ${SHAPE_LABELS[shape]}`}
              onClick={() => handleAddShape(shape)}
            >
              <Icon size={16} />
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1 border-t border-border pt-2">
          {SHAPE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={hasSelection ? "Recolor selected shape" : "Set color for new shapes"}
              onClick={() => handleColorPick(color)}
              className="h-6 w-6 shrink-0 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: color,
                borderColor: color === activeColor ? "var(--color-foreground)" : "transparent",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 border-t border-border pt-2">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              title={hasSelection ? `Set selected text to ${size}px` : `Set new-shape text to ${size}px`}
              onClick={() => handleFontSizePick(size)}
              className={`flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-[11px] font-semibold transition-colors ${
                size === activeFontSize
                  ? "border-accent bg-accent-bg text-accent"
                  : "border-border-strong text-muted-foreground hover:bg-hover"
              }`}
            >
              {size}
            </button>
          ))}
          <button
            type="button"
            title={hasSelection ? "Toggle bold on selection" : "Toggle bold for new shapes"}
            onClick={handleBoldToggle}
            className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
              activeBold
                ? "border-accent bg-accent-bg text-accent"
                : "border-border-strong text-muted-foreground hover:bg-hover"
            }`}
          >
            <Bold size={13} />
          </button>
        </div>

        <div className="flex gap-1 border-t border-border pt-2">
          <Button variant="outline" size="icon" onClick={handleSaveToFile} title="Save board as a .json file">
            <Save size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={handleOpenClick} title="Open a saved .json file">
            <FolderOpen size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={handleClear} title="Clear canvas">
            <Trash2 size={16} />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        <div className="flex gap-1 border-t border-border pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => doExport("png")}
            title={`Export ${exportScopeLabel} as PNG`}
          >
            <Download size={14} />
            <span>PNG</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => doExport("pdf")}
            title={`Export ${exportScopeLabel} as PDF`}
          >
            <FileText size={14} />
            <span>PDF</span>
          </Button>
        </div>

        <div className="flex items-center gap-1.5 border-t border-border pt-2 text-[11px] font-medium text-subtle-foreground">
          {saveStatus === "saving" ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Saving…</span>
            </>
          ) : (
            <>
              <Check size={12} className="text-bullish" />
              <span>Saved to this browser</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
