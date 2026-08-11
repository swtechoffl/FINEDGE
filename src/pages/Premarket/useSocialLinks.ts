import { useEffect, useState, type ComponentType } from "react";
import { Globe } from "lucide-react";
import { InstagramIcon, XIcon, TelegramIcon, YoutubeIcon } from "../../components/icons/SocialIcons";

const STORAGE_KEY = "stoqtrade-report-social-links";
// Same-tab instances (e.g. the poster editor and the nav rail) don't see each
// other's writes via the native `storage` event, which only fires cross-tab —
// so writers also broadcast this custom event for local listeners to pick up.
const SYNC_EVENT = "stoqtrade-social-links-sync";

export interface SocialLinks {
  instagram: string;
  twitter: string;
  telegram: string;
  youtube: string;
  website: string;
}

type SocialIcon = ComponentType<{ size?: number; className?: string }>;

export const SOCIAL_META: Record<keyof SocialLinks, { icon: SocialIcon }> = {
  instagram: { icon: InstagramIcon },
  twitter: { icon: XIcon },
  telegram: { icon: TelegramIcon },
  youtube: { icon: YoutubeIcon },
  website: { icon: Globe },
};

const EMPTY: SocialLinks = { instagram: "", twitter: "", telegram: "", youtube: "", website: "" };

// Sharewealth's own official handles — shown by default on every poster/
// report export until an analyst explicitly edits or clears them via the
// Follow-Us Links editor. Only applies when nothing's been saved yet; once
// a user's own choice (including a deliberate blank) is persisted, that's
// what wins from then on.
const DEFAULT_LINKS: SocialLinks = {
  ...EMPTY,
  instagram: "sharewealthhq",
  youtube: "sharewealthgrp",
  website: "www.sharewealthindia.com",
};

function readInitial(): SocialLinks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_LINKS, ...JSON.parse(raw) } : DEFAULT_LINKS;
  } catch {
    return DEFAULT_LINKS;
  }
}

// Accepts either a bare handle ("@name" / "name") or a full URL and turns it
// into a clickable link per platform — so users can paste whichever they have.
export function socialHref(platform: keyof SocialLinks, value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "twitter":
      return `https://x.com/${handle}`;
    case "telegram":
      return `https://t.me/${handle}`;
    case "youtube":
      return `https://youtube.com/@${handle}`;
    case "website":
      return `https://${v}`;
  }
}

export function socialDisplay(platform: keyof SocialLinks, value: string): string {
  const v = value.trim();
  if (platform === "website") return v.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (/^https?:\/\//i.test(v)) return v.replace(/^https?:\/\/(www\.)?/i, "");
  return v.startsWith("@") ? v : `@${v}`;
}

export function useSocialLinks() {
  const [links, setLinks] = useState<SocialLinks>(readInitial);

  useEffect(() => {
    try {
      const hasAny = Object.values(links).some(Boolean);
      if (hasAny) localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — links just won't persist
    }
    window.dispatchEvent(new CustomEvent<SocialLinks>(SYNC_EVENT, { detail: links }));
  }, [links]);

  function setField(field: keyof SocialLinks, value: string) {
    setLinks((l) => ({ ...l, [field]: value }));
  }

  function clear() {
    setLinks(EMPTY);
  }

  return { links, setField, clear };
}

// Read-only variant for components that just display the configured links
// (e.g. the nav rail) without owning an editor — never writes back, so it
// can safely listen for the sync event without risking a dispatch loop.
export function useSocialLinksReadOnly(): SocialLinks {
  const [links, setLinks] = useState<SocialLinks>(readInitial);

  useEffect(() => {
    function onSync(e: Event) {
      const detail = (e as CustomEvent<SocialLinks>).detail;
      if (detail) setLinks(detail);
    }
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  return links;
}
