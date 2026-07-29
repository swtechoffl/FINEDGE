import { useEffect, useState } from "react";

const STORAGE_KEY = "stoqtrade-report-social-links";

export interface SocialLinks {
  instagram: string;
  twitter: string;
  telegram: string;
  website: string;
}

const EMPTY: SocialLinks = { instagram: "", twitter: "", telegram: "", website: "" };

function readInitial(): SocialLinks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
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
  }, [links]);

  function setField(field: keyof SocialLinks, value: string) {
    setLinks((l) => ({ ...l, [field]: value }));
  }

  function clear() {
    setLinks(EMPTY);
  }

  return { links, setField, clear };
}
