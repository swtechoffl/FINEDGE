import { ReactFlowProvider } from "@xyflow/react";
import { Header } from "../../components/Header";
import { BoardSwitcher } from "./BoardSwitcher";
import { useBoards } from "./boards";
import { FlowchartCanvas } from "./FlowchartCanvas";

export function FlowchartPage() {
  const { boards, currentId, switchBoard, createBoard, renameBoard, deleteBoard } = useBoards();

  function handleCreate() {
    const name = window.prompt("Name this board", `Board ${boards.length + 1}`);
    if (name !== null) createBoard(name);
  }

  function handleRename(id: string) {
    const board = boards.find((b) => b.id === id);
    const name = window.prompt("Rename board", board?.name ?? "");
    if (name !== null) renameBoard(id, name);
  }

  function handleDelete(id: string) {
    const board = boards.find((b) => b.id === id);
    if (window.confirm(`Delete "${board?.name}"? This can't be undone.`)) deleteBoard(id);
  }

  return (
    <div className="flex h-screen flex-col">
      <Header
        title="flowchart"
        meta="Sketch process flows, decision trees and diagrams"
        extra={
          <BoardSwitcher
            boards={boards}
            currentId={currentId}
            onSwitch={switchBoard}
            onCreate={handleCreate}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        }
      />
      <div className="min-h-0 flex-1">
        {/* Remounting on board switch keeps each board's canvas state fully
            isolated instead of trying to reconcile one hook across boards. */}
        <ReactFlowProvider key={currentId}>
          <FlowchartCanvas boardId={currentId} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
