import { forwardRef } from "react";
import { ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import type { DisclaimerSettings } from "../Disclosure/useDisclaimerSettings";

// Page 2 of the exported Premarket Report PDF — same content as the
// standalone Disclosure & Disclaimer page, restyled to match the report's
// letterhead so it reads as a continuation of the same document rather than
// a bolted-on page. Content comes from useDisclaimerSettings (editable via
// DisclaimerSettingsEditor) rather than the static defaults directly, so an
// edit made from any report shows up on every report's disclaimer page.
export const DisclaimerReportPage = forwardRef<HTMLDivElement, { settings: DisclaimerSettings }>(
  ({ settings }, ref) => {
  return (
    <div ref={ref} className="bg-surface p-6">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">
            Disclosure &amp; Disclaimer<span className="text-accent">.</span>
          </h2>
          <span className="text-xs text-subtle-foreground">Page 2</span>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-border bg-app p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-bg">
          <ShieldCheck size={18} className="text-accent" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">{settings.analystName}</div>
          <div className="text-xs text-muted-foreground">{settings.registration}</div>
          <div className="text-xs text-muted-foreground">{settings.title}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {settings.paragraphs.map((p, i) => (
          <p key={i} className="text-[13px] leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-1.5 rounded-xl border border-border bg-app p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
          For further queries
        </div>
        <div className="text-sm font-semibold text-foreground">
          {settings.analystName} · {settings.regLine}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Mail size={13} className="shrink-0" /> {settings.email}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone size={13} className="shrink-0" /> {settings.phone}
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin size={13} className="mt-0.5 shrink-0" />
          <span>{settings.address}</span>
        </div>
      </div>

      <p className="mt-4 text-xs italic leading-relaxed text-subtle-foreground">{settings.closingNote}</p>
    </div>
  );
});
DisclaimerReportPage.displayName = "DisclaimerReportPage";
