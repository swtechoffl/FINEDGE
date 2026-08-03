import { useCallback, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
  getViewportForBounds,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
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
} from "lucide-react";
import type { ChangeEvent } from "react";
import { Button } from "../../components/ui/Button";
import { downloadFile } from "../../lib/shareImage";
import { useTheme } from "../../theme/ThemeContext";
import { ShapeNode } from "./ShapeNode";
import { useFlowchart, type FlowNode } from "./useFlowchart";
import { SHAPE_COLORS, SHAPE_LABELS, type ShapeKind } from "./types";
import "./flowchart.css";

const nodeTypes: NodeTypes = { shape: ShapeNode };

const SHAPE_BUTTONS: { shape: ShapeKind; icon: typeof Square }[] = [
  { shape: "rectangle", icon: Square },
  { shape: "diamond", icon: Diamond },
  { shape: "ellipse", icon: Circle },
  { shape: "note", icon: StickyNote },
];

export function FlowchartCanvas() {
  const { theme } = useTheme();
  const {
    nodes,
    edges,
    saveStatus,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addShape,
    selectNode,
    recolorSelected,
    clearCanvas,
    replaceState,
  } = useFlowchart();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<FlowNode> | null>(null);
  const [activeColor, setActiveColor] = useState(SHAPE_COLORS[0]);
  // Cascades successive additions like Miro/FigJam so new shapes don't land
  // stacked exactly on top of the last one.
  const addCountRef = useRef(0);

  const hasSelection = useMemo(() => nodes.some((n) => n.selected), [nodes]);

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
      const id = addShape(shape, position, activeColor, SHAPE_LABELS[shape]);
      selectNode(id);
    },
    [rfInstance, addShape, selectNode, activeColor],
  );

  const handleColorPick = useCallback(
    (color: string) => {
      setActiveColor(color);
      if (hasSelection) recolorSelected(color);
    },
    [hasSelection, recolorSelected],
  );

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

  // Exports the current selection if anything is selected, otherwise the
  // whole board — matching the common "export selection" convention.
  const prepareCapture = useCallback(() => {
    if (!rfInstance) return null;
    const all = rfInstance.getNodes();
    if (all.length === 0) return null;
    const selected = all.filter((n) => n.selected);
    const targets = selected.length > 0 ? selected : all;

    const bounds = rfInstance.getNodesBounds(targets);
    const width = Math.max(bounds.width + 160, 640);
    const height = Math.max(bounds.height + 160, 480);
    const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, 0.15);
    const viewportEl = wrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewportEl) return null;

    return {
      viewportEl,
      toBlobOptions: {
        backgroundColor: theme === "dark" ? "#09090b" : "#ffffff",
        width,
        height,
        pixelRatio: 2,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      },
    };
  }, [rfInstance, theme]);

  const handleExportPng = useCallback(async () => {
    const prepared = prepareCapture();
    if (!prepared) return;
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(prepared.viewportEl, prepared.toBlobOptions);
    if (!blob) return;
    downloadFile(new File([blob], "flowchart.png", { type: "image/png" }));
  }, [prepareCapture]);

  const handleExportPdf = useCallback(async () => {
    const prepared = prepareCapture();
    if (!prepared) return;
    const { exportNodeToPdf } = await import("../../lib/exportPdf");
    await exportNodeToPdf(prepared.viewportEl, "flowchart.pdf", prepared.toBlobOptions);
  }, [prepareCapture]);

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
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} className="flowchart-bg" />
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

        <div className="flex gap-1 border-t border-border pt-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSaveToFile}
            title="Save board as a .json file"
          >
            <Save size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={handleOpenClick} title="Open a saved .json file">
            <FolderOpen size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={handleClear} title="Clear canvas">
            <Trash2 size={16} />
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileSelected} />
        </div>

        <div className="flex gap-1 border-t border-border pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPng}
            title={hasSelection ? "Export selection as PNG" : "Export board as PNG"}
          >
            <Download size={14} />
            <span>PNG</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            title={hasSelection ? "Export selection as PDF" : "Export board as PDF"}
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
