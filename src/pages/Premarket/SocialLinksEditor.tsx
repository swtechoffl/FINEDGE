import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AtSign, X } from "lucide-react";
import { SOCIAL_META, type SocialLinks } from "./useSocialLinks";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

const FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { key: "twitter", label: "X / Twitter", placeholder: "@yourhandle" },
  { key: "telegram", label: "Telegram", placeholder: "@yourchannel" },
  { key: "youtube", label: "YouTube", placeholder: "@yourchannel" },
  { key: "website", label: "Website", placeholder: "yourdomain.com" },
];

const PANEL_WIDTH = 320; // matches the old w-80

export function SocialLinksEditor({
  links,
  setField,
  clear,
}: {
  links: SocialLinks;
  setField: (field: keyof SocialLinks, value: string) => void;
  clear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasAny = Object.values(links).some(Boolean);

  function updatePosition() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8));
    setCoords({ top: rect.bottom + 8, left });
  }

  function handleToggle() {
    if (!open) updatePosition();
    setOpen((o) => !o);
  }

  // The poster sections this renders inside use `overflow-hidden` for their
  // horizontal scrolling carousel, which was clipping this dropdown (cutting
  // off its right side, including the Done button) — a portal renders it
  // straight to <body>, positioned from the trigger button's own coordinates,
  // so it's never subject to an ancestor's overflow/clip context.
  useEffect(() => {
    if (!open) return;
    function reposition() {
      updatePosition();
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  return (
    <div className="relative">
      <Button ref={buttonRef} variant="outline" size="sm" onClick={handleToggle}>
        <AtSign size={14} />
        <span className="hidden sm:inline">{hasAny ? "Edit Follow-Us Links" : "Add Follow-Us Links"}</span>
      </Button>

      {open &&
        coords &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="animate-scale-in fixed z-50 max-w-[calc(100vw-2.5rem)] origin-top rounded-xl border border-border bg-surface p-4 shadow-lg"
              style={{ top: coords.top, left: coords.left, width: PANEL_WIDTH }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Follow-Us Links</span>
                <button
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-foreground"
                >
                  <X size={15} />
                </button>
              </div>

              <p className="mb-3 text-xs text-subtle-foreground">
                Shown on the bottom of your poster exports so viewers can follow you.
              </p>

              <div className="flex flex-col gap-3">
                {FIELDS.map((f) => {
                  const Icon = SOCIAL_META[f.key].icon;
                  return (
                    <div key={f.key}>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
                      <div className="relative">
                        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
                        <Input
                          value={links[f.key]}
                          onChange={(e) => setField(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    clear();
                    setOpen(false);
                  }}
                  className="focus-ring text-xs font-medium text-subtle-foreground hover:text-bearish"
                >
                  Remove all
                </button>
                <Button size="sm" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
