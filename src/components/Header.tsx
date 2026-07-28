import { Search, Bell, Sun, Moon, X } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import type { ReactNode } from "react";
import { Button } from "./ui/Button";

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

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-app/85 px-6 py-4 backdrop-blur-md">
      <div className="flex shrink-0 items-center gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">
          {title}
          <span className="text-accent">.</span>
        </h1>
        {meta && <span className="text-xs font-medium text-subtle-foreground">{meta}</span>}
      </div>

      <div className="mx-auto flex max-w-xl flex-1 items-center">
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

      <div className="flex shrink-0 items-center gap-2">
        {extra}
        <Button variant="outline" size="icon" className="text-muted-foreground">
          <Bell size={16} />
        </Button>
        <Button variant="outline" size="icon" onClick={toggleTheme} className="text-muted-foreground">
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </Button>
      </div>
    </header>
  );
}
