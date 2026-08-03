import { useCallback, useEffect, useState } from "react";

const INDEX_KEY = "stoqtrade-flowchart-boards";
const CURRENT_KEY = "stoqtrade-flowchart-current-board";
const LEGACY_SINGLE_BOARD_KEY = "stoqtrade-flowchart-v1";

export function boardStorageKey(boardId: string) {
  return `stoqtrade-flowchart-board-${boardId}`;
}

export interface BoardMeta {
  id: string;
  name: string;
  updatedAt: number;
}

function makeId() {
  return `board-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function readIndex(): BoardMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through
  }
  return [];
}

function writeIndex(boards: BoardMeta[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(boards));
}

// First-run migration: a single board used to live under one fixed
// localStorage key (no boards list existed yet). Wrap that data into "Board
// 1" so existing users don't lose their work when this ships.
function ensureInitialized(): { boards: BoardMeta[]; currentId: string } {
  let boards = readIndex();
  if (boards.length === 0) {
    const legacy = localStorage.getItem(LEGACY_SINGLE_BOARD_KEY);
    const id = makeId();
    if (legacy) {
      localStorage.setItem(boardStorageKey(id), legacy);
      localStorage.removeItem(LEGACY_SINGLE_BOARD_KEY);
    }
    boards = [{ id, name: "Board 1", updatedAt: Date.now() }];
    writeIndex(boards);
    localStorage.setItem(CURRENT_KEY, id);
  }
  const storedCurrent = localStorage.getItem(CURRENT_KEY);
  const currentId = boards.some((b) => b.id === storedCurrent) ? storedCurrent! : boards[0].id;
  return { boards, currentId };
}

export function useBoards() {
  const [{ boards, currentId }, setState] = useState(ensureInitialized);

  useEffect(() => {
    localStorage.setItem(CURRENT_KEY, currentId);
  }, [currentId]);

  const switchBoard = useCallback((id: string) => {
    setState((s) => (s.boards.some((b) => b.id === id) ? { ...s, currentId: id } : s));
  }, []);

  const createBoard = useCallback((name: string) => {
    const id = makeId();
    const meta: BoardMeta = { id, name: name.trim() || "Untitled board", updatedAt: Date.now() };
    setState((s) => {
      const boards = [...s.boards, meta];
      writeIndex(boards);
      return { boards, currentId: id };
    });
    return id;
  }, []);

  const renameBoard = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => {
      const boards = s.boards.map((b) => (b.id === id ? { ...b, name: trimmed } : b));
      writeIndex(boards);
      return { ...s, boards };
    });
  }, []);

  const touchBoard = useCallback((id: string) => {
    setState((s) => {
      const boards = s.boards.map((b) => (b.id === id ? { ...b, updatedAt: Date.now() } : b));
      writeIndex(boards);
      return { ...s, boards };
    });
  }, []);

  const deleteBoard = useCallback((id: string) => {
    setState((s) => {
      if (s.boards.length <= 1) return s; // always keep at least one board
      const boards = s.boards.filter((b) => b.id !== id);
      writeIndex(boards);
      localStorage.removeItem(boardStorageKey(id));
      const currentId = s.currentId === id ? boards[0].id : s.currentId;
      return { boards, currentId };
    });
  }, []);

  return { boards, currentId, switchBoard, createBoard, renameBoard, touchBoard, deleteBoard };
}
