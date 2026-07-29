import { useState } from "react";
import { Search, Bell, Sun, Moon, X } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import type { ReactNode } from "react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { signalColor } from "./SignalGauge";
import { relativeTime } from "../data/mock";
import { useNotifications } from "../notifications/NotificationContext";

function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        className="relative text-muted-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bearish px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-scale-in fixed inset-x-3 top-16 z-50 mx-auto max-h-[70vh] w-auto max-w-96 origin-top-right overflow-y-auto rounded-xl border border-border bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
              <span className="text-sm font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="focus-ring text-xs font-semibold text-accent hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No new high-impact updates yet — this fills in as breaking stories come through.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {notifications.map((n) => {
                  const color = signalColor(n.item.signal);
                  return (
                    <a
                      key={n.id}
                      href={n.item.articleUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markRead(n.id)}
                      className="focus-ring flex gap-2.5 px-4 py-3 transition-colors hover:bg-hover"
                      style={{ borderLeft: `3px solid ${color}` }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge size="sm">{n.item.category}</Badge>
                          <span className="text-[10px] text-subtle-foreground">{n.item.source}</span>
                        </div>
                        <div className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                          {n.item.headline}
                        </div>
                        <div className="mt-1 text-[10px] text-subtle-foreground">
                          {relativeTime(new Date(n.receivedAt).toISOString())}
                        </div>
                      </div>
                      {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function Header({
  title,
  meta,
  extra,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search headlines, tickers, sources...",
}: {
  title: string;
  meta?: string;
  extra?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const { theme, toggleTheme } = useTheme();

  const themeToggle = (
    <Button variant="outline" size="icon" onClick={toggleTheme} className="shrink-0 text-muted-foreground">
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
    </Button>
  );

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-app/85 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground sm:text-[26px]">
            {title}
            <span className="text-accent">.</span>
          </h1>
          {meta && <span className="hidden shrink-0 text-xs font-medium text-subtle-foreground sm:inline">{meta}</span>}
        </div>

        {/* Actions inline with the title on mobile; moved to the far right at lg+ */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          {extra}
          <NotificationBell />
          {themeToggle}
        </div>
      </div>

      <div className="flex items-center lg:order-2 lg:mx-auto lg:max-w-xl lg:flex-1">
        <div className="focus-within:ring-ring/50 flex w-full items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 shadow-xs transition-shadow duration-150 focus-within:ring-4">
          <Search size={16} className="shrink-0 text-subtle-foreground" />
          <input
            type="text"
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange?.("")}
              className="focus-ring shrink-0 rounded-full p-0.5 text-subtle-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 lg:order-3 lg:flex">
        {extra}
        <NotificationBell />
        {themeToggle}
      </div>
    </header>
  );
}
