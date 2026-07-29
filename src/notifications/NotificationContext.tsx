import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { NewsItem } from "../types";

const SEEN_IDS_KEY = "stoqtrade_seen_news_ids";
const MAX_SEEN_IDS = 500;
const MAX_NOTIFICATIONS = 30;
const POLL_INTERVAL_MS = 3 * 60 * 1000;
const TOAST_DURATION_MS = 8000;

export interface NotificationEntry {
  id: string;
  item: NewsItem;
  read: boolean;
  receivedAt: number;
}

interface NotificationContextValue {
  notifications: NotificationEntry[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  toast: NewsItem | null;
  toastExtraCount: number;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(Array.from(ids).slice(-MAX_SEEN_IDS)));
  } catch {
    // localStorage unavailable/full — notifications just won't persist across reloads
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [toast, setToast] = useState<NewsItem | null>(null);
  const [toastExtraCount, setToastExtraCount] = useState(0);
  const seenIdsRef = useRef<Set<string>>(loadSeenIds());
  const isFirstLoadRef = useRef(true);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) return;
        const data: { items: NewsItem[] } = await res.json();
        if (cancelled) return;

        const seen = seenIdsRef.current;
        const isFirst = isFirstLoadRef.current;
        isFirstLoadRef.current = false;

        const freshItems = data.items.filter((n) => !seen.has(n.id));
        for (const n of data.items) seen.add(n.id);
        saveSeenIds(seen);

        // First load just establishes the baseline — otherwise every item
        // already in the feed would fire as a "new" notification at once.
        if (isFirst || freshItems.length === 0) return;

        const notifyWorthy = freshItems.filter((n) => n.impact === "high");
        if (notifyWorthy.length === 0) return;

        setNotifications((prev) => {
          const entries: NotificationEntry[] = notifyWorthy.map((item) => ({
            id: item.id,
            item,
            read: false,
            receivedAt: Date.now(),
          }));
          return [...entries, ...prev].slice(0, MAX_NOTIFICATIONS);
        });

        setToast(notifyWorthy[0]);
        setToastExtraCount(notifyWorthy.length - 1);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
      } catch {
        // notifications are supplementary — fail silently, retry next interval
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }
  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }
  function dismissToast() {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, toast, toastExtraCount, dismissToast }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
