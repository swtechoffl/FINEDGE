import { NavLink } from "react-router-dom";
import { Newspaper, Sunrise, Sunset, CalendarClock, Layers, LogOut } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { to: "/news", label: "Market Pulse", icon: Newspaper },
  { to: "/premarket", label: "Premarket Report", icon: Sunrise },
  { to: "/postmarket", label: "Post Market Report", icon: Sunset },
  { to: "/corporate-actions", label: "Corporate Actions", icon: CalendarClock },
  { to: "/market-internals", label: "Market Internals", icon: Layers },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-[var(--ease-out-expo)]",
    isActive ? "bg-accent-bg text-accent" : "text-muted-foreground hover:bg-hover hover:text-foreground",
  );
}

export function NavRail() {
  return (
    <nav className="group fixed left-0 top-0 z-40 flex h-full w-16 flex-col overflow-hidden border-r border-border bg-surface shadow-sm transition-[width] duration-300 ease-[var(--ease-out-expo)] hover:w-72">
      {/* Logo */}
      <NavLink to="/" className="focus-ring flex shrink-0 items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover text-accent-foreground shadow-sm">
          <BrandMark className="h-[18px] w-[18px]" />
        </div>
        <div className="hidden whitespace-nowrap group-hover:block">
          <div className="text-[15px] font-bold leading-tight tracking-tight text-foreground">
            stoqtrade<span className="text-accent">.ai</span>
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
            AI Trading Intelligence
          </div>
        </div>
      </NavLink>

      {/* Primary nav */}
      <div className="flex shrink-0 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon size={18} className="shrink-0" />
            <span className="hidden whitespace-nowrap group-hover:inline">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex-1" />

      {/* Bottom utility links */}
      <div className="flex shrink-0 flex-col gap-0.5 border-t border-border px-3 py-3">
        <button className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
          <LogOut size={18} className="shrink-0" />
          <span className="hidden whitespace-nowrap group-hover:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
}
