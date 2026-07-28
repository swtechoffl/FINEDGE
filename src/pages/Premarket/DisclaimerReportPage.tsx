import { forwardRef } from "react";
import { ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { ANALYST, CONTACT, CLOSING_NOTE, DISCLAIMER_PARAGRAPHS } from "../Disclosure/disclaimerContent";

// Page 2 of the exported Premarket Report PDF — same content as the
// standalone Disclosure & Disclaimer page, restyled to match the report's
// letterhead so it reads as a continuation of the same document rather than
// a bolted-on page.
export const DisclaimerReportPage = forwardRef<HTMLDivElement>((_props, ref) => {
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
          <div className="text-sm font-bold text-foreground">{ANALYST.name}</div>
          <div className="text-xs text-muted-foreground">{ANALYST.registration}</div>
          <div className="text-xs text-muted-foreground">{ANALYST.title}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {DISCLAIMER_PARAGRAPHS.map((p, i) => (
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
          {ANALYST.name} · {ANALYST.regLine}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Mail size={13} className="shrink-0" /> {CONTACT.email}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone size={13} className="shrink-0" /> {CONTACT.phone}
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin size={13} className="mt-0.5 shrink-0" />
          <span>{CONTACT.address}</span>
        </div>
      </div>

      <p className="mt-4 text-xs italic leading-relaxed text-subtle-foreground">{CLOSING_NOTE}</p>
    </div>
  );
});
DisclaimerReportPage.displayName = "DisclaimerReportPage";
