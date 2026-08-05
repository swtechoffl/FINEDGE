import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";
import { NAV_ITEMS } from "./NavRail";

// Short enough to sit under a small icon in a ~60px-wide tab without
// wrapping on the smallest common phone widths (~360px / 6 tabs).
const SHORT_LABELS: Record<string, string> = {
  "/news": "Finedge",
  "/premarket": "Pre-Mkt",
  "/postmarket": "Post-Mkt",
  "/ramki-premarket": "RK Pre",
  "/ramki-postmarket": "RK Post",
  "/corporate-actions": "Actions",
  "/market-internals": "Internals",
  "/posters": "Posters",
  "/flowchart": "Flowchart",
  "/report-maker": "Report Maker",
  "/one-pager": "One Pager",
};

// Modern-app bottom tab bar — the mobile/tablet equivalent of NavRail
// (which hides itself below the `lg` breakpoint). Fixed to the viewport
// bottom, icon + short label per tab, safe-area padding for notched phones.
export function BottomTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ to, icon: Icon }) => (
        <NavLink key={to} to={to} className="focus-ring flex flex-1 flex-col items-center justify-center gap-0.5 py-2">
          {({ isActive }) => (
            <>
              <div className={cn("rounded-full px-3.5 py-0.5 transition-colors", isActive && "bg-accent-bg")}>
                <Icon size={20} className={isActive ? "text-accent" : "text-subtle-foreground"} />
              </div>
              <span className={cn("text-[10px] font-medium", isActive ? "text-accent" : "text-subtle-foreground")}>
                {SHORT_LABELS[to]}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
