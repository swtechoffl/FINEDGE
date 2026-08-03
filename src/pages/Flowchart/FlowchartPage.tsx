import { ReactFlowProvider } from "@xyflow/react";
import { Header } from "../../components/Header";
import { FlowchartCanvas } from "./FlowchartCanvas";

export function FlowchartPage() {
  return (
    <div className="flex h-screen flex-col">
      <Header title="flowchart" meta="Sketch process flows, decision trees and diagrams" />
      <div className="min-h-0 flex-1">
        <ReactFlowProvider>
          <FlowchartCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
