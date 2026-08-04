import { useState } from "react";
import { ShieldCheck, X, Plus, Trash2, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/utils";
import type { DisclaimerSettings } from "./useDisclaimerSettings";

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function DisclaimerSettingsEditor({
  settings,
  update,
  updateParagraph,
  addParagraph,
  removeParagraph,
  reset,
}: {
  settings: DisclaimerSettings;
  update: <K extends keyof DisclaimerSettings>(key: K, value: DisclaimerSettings[K]) => void;
  updateParagraph: (index: number, text: string) => void;
  addParagraph: () => void;
  removeParagraph: (index: number) => void;
  reset: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ShieldCheck size={14} />
        <span className="hidden sm:inline">Edit Disclaimer</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="animate-scale-in flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="text-sm font-bold text-foreground">Disclosure &amp; Disclaimer Settings</span>
              <button
                onClick={() => setOpen(false)}
                className="focus-ring rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Analyst name" value={settings.analystName} onChange={(v) => update("analystName", v)} />
                <Field label="Title" value={settings.title} onChange={(v) => update("title", v)} />
                <Field
                  label="Registration line (full)"
                  value={settings.registration}
                  onChange={(v) => update("registration", v)}
                  className="sm:col-span-2"
                />
                <Field
                  label="Registration line (short)"
                  value={settings.regLine}
                  onChange={(v) => update("regLine", v)}
                  className="sm:col-span-2"
                />
                <Field label="Email" value={settings.email} onChange={(v) => update("email", v)} />
                <Field label="Phone" value={settings.phone} onChange={(v) => update("phone", v)} />
                <Field
                  label="Address"
                  value={settings.address}
                  onChange={(v) => update("address", v)}
                  className="sm:col-span-2"
                />
              </div>

              <div className="mb-5">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Closing note</label>
                <textarea
                  value={settings.closingNote}
                  onChange={(e) => update("closingNote", e.target.value)}
                  rows={2}
                  className="focus-ring w-full resize-y rounded-lg border border-border bg-app px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                    Disclaimer paragraphs
                  </span>
                  <Button variant="outline" size="sm" onClick={addParagraph}>
                    <Plus size={13} /> Add paragraph
                  </Button>
                </div>
                <div className="flex flex-col gap-2.5">
                  {settings.paragraphs.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <textarea
                        value={p}
                        onChange={(e) => updateParagraph(i, e.target.value)}
                        rows={3}
                        className="focus-ring flex-1 resize-y rounded-lg border border-border bg-app px-3 py-2 text-xs leading-relaxed text-foreground"
                      />
                      <button
                        onClick={() => removeParagraph(i)}
                        title="Remove paragraph"
                        className="focus-ring shrink-0 self-start rounded-full p-1.5 text-subtle-foreground hover:bg-hover hover:text-bearish"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {settings.paragraphs.length === 0 && (
                    <p className="text-xs text-subtle-foreground">No paragraphs — use "Add paragraph" above.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
              <button
                onClick={reset}
                className={cn(
                  "focus-ring flex items-center gap-1.5 text-xs font-medium text-subtle-foreground hover:text-bearish",
                )}
              >
                <RotateCcw size={12} /> Reset to default
              </button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
