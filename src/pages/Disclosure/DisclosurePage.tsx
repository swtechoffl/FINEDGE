import { ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { Header } from "../../components/Header";
import { Card } from "../../components/ui/Card";
import { ANALYST, CONTACT, CLOSING_NOTE, DISCLAIMER_PARAGRAPHS } from "./disclaimerContent";

export function DisclosurePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header title="disclosure & disclaimer" />

      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <Card className="p-6">
          <div className="mb-5 flex items-start gap-3 border-b border-border pb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-bg">
              <ShieldCheck size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">{ANALYST.name}</h2>
              <p className="text-xs text-muted-foreground">{ANALYST.registration}</p>
              <p className="text-xs text-muted-foreground">{ANALYST.title}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {DISCLAIMER_PARAGRAPHS.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 rounded-xl border border-border bg-app p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              For further queries
            </div>
            <div className="text-sm font-semibold text-foreground">
              {ANALYST.name} · {ANALYST.regLine}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="shrink-0" /> {CONTACT.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={14} className="shrink-0" /> {CONTACT.phone}
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span>{CONTACT.address}</span>
            </div>
          </div>

          <p className="mt-5 text-xs italic leading-relaxed text-subtle-foreground">{CLOSING_NOTE}</p>
        </Card>
      </div>
    </div>
  );
}
