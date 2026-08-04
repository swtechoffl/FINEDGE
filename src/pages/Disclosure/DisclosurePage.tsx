import { ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { Header } from "../../components/Header";
import { Card } from "../../components/ui/Card";
import { useDisclaimerSettings } from "./useDisclaimerSettings";
import { DisclaimerSettingsEditor } from "./DisclaimerSettingsEditor";

export function DisclosurePage() {
  const disclaimerSettings = useDisclaimerSettings();
  const { settings } = disclaimerSettings;

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="disclosure & disclaimer" extra={<DisclaimerSettingsEditor {...disclaimerSettings} />} />

      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <Card className="p-6">
          <div className="mb-5 flex items-start gap-3 border-b border-border pb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-bg">
              <ShieldCheck size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">{settings.analystName}</h2>
              <p className="text-xs text-muted-foreground">{settings.registration}</p>
              <p className="text-xs text-muted-foreground">{settings.title}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {settings.paragraphs.map((p, i) => (
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
              {settings.analystName} · {settings.regLine}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="shrink-0" /> {settings.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={14} className="shrink-0" /> {settings.phone}
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span>{settings.address}</span>
            </div>
          </div>

          <p className="mt-5 text-xs italic leading-relaxed text-subtle-foreground">{settings.closingNote}</p>
        </Card>
      </div>
    </div>
  );
}
