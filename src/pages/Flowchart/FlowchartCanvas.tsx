import { useCallback, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  getViewportForBounds,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Diamond, Download, Square, StickyNote, Trash2, Circle } from "lucide-react";
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
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addShape, selectNode, recolorSelected, clearCanvas } =
    useFlowchart();
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  const handleExport = useCallback(async () => {
    if (!rfInstance) return;
    const all = rfInstance.getNodes();
    if (all.length === 0) return;
    const bounds = rfInstance.getNodesBounds(all);
    const width = Math.max(bounds.width + 160, 640);
    const height = Math.max(bounds.height + 160, 480);
    const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, 0.15);
    const viewportEl = wrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewportEl) return;

    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(viewportEl, {
      backgroundColor: theme === "dark" ? "#09090b" : "#ffffff",
      width,
      height,
      pixelRatio: 2,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    });
    if (!blob) return;
    downloadFile(new File([blob], "flowchart.png", { type: "image/png" }));
  }, [rfInstance, theme]);

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
          <Button variant="outline" size="sm" onClick={handleExport} title="Export as PNG">
            <Download size={14} />
            <span>Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} title="Clear canvas">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
