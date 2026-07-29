import { useState } from "react";
import { AtSign, X } from "lucide-react";
import { SOCIAL_META, type SocialLinks } from "./useSocialLinks";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

const FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { key: "twitter", label: "X / Twitter", placeholder: "@yourhandle" },
  { key: "telegram", label: "Telegram", placeholder: "@yourchannel" },
  { key: "website", label: "Website", placeholder: "yourdomain.com" },
];

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
  const hasAny = Object.values(links).some(Boolean);

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <AtSign size={14} />
        <span className="hidden sm:inline">{hasAny ? "Edit Follow-Us Links" : "Add Follow-Us Links"}</span>
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-scale-in absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2.5rem)] origin-top-left rounded-xl border border-border bg-surface p-4 shadow-lg">
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
        </>
      )}
    </div>
  );
}
