import { NavLink } from "react-router-dom";
import { Newspaper, Sunrise, Sunset, CloudSun, CloudMoon, CalendarClock, Layers, Images, Megaphone, Workflow, FileText, FileStack, LogOut } from "lucide-react";
import { useSocialLinksReadOnly, socialHref, socialDisplay, SOCIAL_META, type SocialLinks } from "../pages/Premarket/useSocialLinks";
import { cn } from "../lib/utils";

export const NAV_ITEMS = [
  { to: "/news", label: "Finedge", icon: Newspaper },
  { to: "/premarket", label: "Premarket Report", icon: Sunrise },
  { to: "/postmarket", label: "Post Market Report", icon: Sunset },
  { to: "/ramki-premarket", label: "RAMKI Premarket", icon: CloudSun },
  { to: "/ramki-postmarket", label: "RAMKI Post Market", icon: CloudMoon },
  { to: "/corporate-actions", label: "Corporate Actions", icon: CalendarClock },
  { to: "/market-internals", label: "Market Internals", icon: Layers },
  { to: "/posters", label: "Posters", icon: Images },
  { to: "/marketing-posters", label: "Marketing Posters", icon: Megaphone },
  { to: "/flowchart", label: "Flowchart", icon: Workflow },
  { to: "/report-maker", label: "Report Maker", icon: FileText },
  { to: "/one-pager", label: "One Pager", icon: FileStack },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-[var(--ease-out-expo)]",
    isActive ? "bg-accent-bg text-accent" : "text-muted-foreground hover:bg-hover hover:text-foreground",
  );
}

function FollowUsLinks({ links }: { links: SocialLinks }) {
  const entries = (Object.keys(links) as (keyof SocialLinks)[]).filter((k) => links[k].trim());
  if (entries.length === 0) return null;

  return (
    <div className="flex shrink-0 flex-col gap-0.5 border-t border-border px-3 py-3">
      {entries.map((k) => {
        const { icon: Icon } = SOCIAL_META[k];
        return (
          <a
            key={k}
            href={socialHref(k, links[k])}
            target="_blank"
            rel="noreferrer"
            className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground"
          >
            <Icon size={18} className="shrink-0" />
            <span className="hidden truncate whitespace-nowrap group-hover:inline">{socialDisplay(k, links[k])}</span>
          </a>
        );
      })}
    </div>
  );
}

export function NavRail() {
  const socialLinks = useSocialLinksReadOnly();

  return (
    <nav className="group fixed left-0 top-0 z-40 hidden h-full w-16 flex-col overflow-hidden border-r border-border bg-surface shadow-sm transition-[width] duration-300 ease-[var(--ease-out-expo)] hover:w-72 lg:flex">
      {/* Logo */}
      <NavLink to="/" className="focus-ring flex shrink-0 items-center gap-3 px-4 py-5">
        <img src="/logo.png" alt="Finedge" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />
        <div className="hidden whitespace-nowrap group-hover:block">
          <img src="/logo.png" alt="Finedge" className="h-6 w-auto" />
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-subtle-foreground">
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

      <FollowUsLinks links={socialLinks} />

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
