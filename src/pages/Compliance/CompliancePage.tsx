import { useMemo, useState } from "react";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Filter,
  Link2,
  RefreshCw,
  Rss,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Header } from "../../components/Header";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/utils";

type Source = "All" | "NSE" | "BSE" | "SEBI" | "CDSL" | "MCX";
type Priority = "Critical" | "High" | "Medium";

const sources = [
  { name: "NSE", kind: "Exchange", color: "#2563eb", status: "RSS live", cadence: "Real-time", url: "https://www.nseindia.com/static/rss-feed", feed: "NSE circulars RSS" },
  { name: "BSE", kind: "Exchange", color: "#7c3aed", status: "XML live", cadence: "~35 notices/day", url: "https://beta.bseindia.com/data/xml/notices.xml", feed: "BSE notices XML" },
  { name: "SEBI", kind: "Regulator", color: "#dc2626", status: "RSS live", cadence: "As published", url: "https://www.sebi.gov.in/rss.html", feed: "sebirss.xml" },
  { name: "CDSL", kind: "Depository", color: "#0891b2", status: "Web monitor", cadence: "As published", url: "https://www.cdslindia.com/Downloads/Legal/SEBI-Circulars", feed: "Circulars hub" },
  { name: "MCX", kind: "Commodity", color: "#ea580c", status: "Web monitor", cadence: "As published", url: "https://www.mcxindia.com/circulars/general", feed: "All circulars" },
];

const notices = [
  { source: "SEBI", date: "28 Oct 2026", priority: "Critical" as Priority, type: "Circular", title: "Cybersecurity and cyber resilience framework for regulated entities", ref: "SEBI/HO/ITD-1/ITD_VI/2026/114", due: "Due in 4 days", dueTone: "critical", summary: "Controls and incident reporting requirements need owner acknowledgement and implementation mapping.", url: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1" },
  { source: "NSE", date: "27 Oct 2026", priority: "High" as Priority, type: "Circular", title: "Revision to client-level trading and reporting obligations", ref: "NSE/INSP/2026/287", due: "Due in 9 days", dueTone: "warning", summary: "Review impacted workflows, update SOPs and retain evidence of member communication.", url: "https://www.nseindia.com/resources/exchange-communication-circulars" },
  { source: "BSE", date: "26 Oct 2026", priority: "High" as Priority, type: "Notice", title: "Enhanced Surveillance Measure (ESM)", ref: "20261026-41", due: "Due in 12 days", dueTone: "warning", summary: "Check affected scrips and align RMS / client communication controls before the effective date.", url: "https://www.bseindia.com/markets/MarketInfo/DispNewNoticesCirculars.aspx" },
  { source: "CDSL", date: "24 Oct 2026", priority: "Medium" as Priority, type: "Circular", title: "Participant operations: reporting and reconciliation reminder", ref: "CDSL/OPS/2026/19", due: "Due in 18 days", dueTone: "normal", summary: "Monthly reconciliation pack and exception sign-off should be completed by the operations owner.", url: "https://www.cdslindia.com/Downloads/Legal/SEBI-Circulars" },
  { source: "MCX", date: "22 Oct 2026", priority: "Medium" as Priority, type: "Circular", title: "Updated contract specifications and member reporting instructions", ref: "MCX/TECH/2026/74", due: "Due in 24 days", dueTone: "normal", summary: "Confirm contract master updates and downstream client-facing disclosures.", url: "https://www.mcxindia.com/circulars/general" },
];

const deadlines = [
  { day: "01", month: "NOV", title: "SEBI cyber resilience control mapping", owner: "Compliance + IT", source: "SEBI", tone: "critical", label: "4 days" },
  { day: "06", month: "NOV", title: "NSE client reporting workflow sign-off", owner: "Operations", source: "NSE", tone: "warning", label: "9 days" },
  { day: "09", month: "NOV", title: "BSE ESM readiness review", owner: "Risk + RMS", source: "BSE", tone: "warning", label: "12 days" },
  { day: "15", month: "NOV", title: "CDSL reconciliation evidence pack", owner: "Depository Ops", source: "CDSL", tone: "normal", label: "18 days" },
  { day: "21", month: "NOV", title: "MCX contract master update", owner: "Technology", source: "MCX", tone: "normal", label: "24 days" },
];

function sourceColor(source: string) {
  return sources.find((item) => item.name === source)?.color ?? "#64748b";
}

export function CompliancePage() {
  const [activeSource, setActiveSource] = useState<Source>("All");
  const [query, setQuery] = useState("");
  const [onlyActionable, setOnlyActionable] = useState(false);

  const filtered = useMemo(() => notices.filter((notice) => {
    const matchesSource = activeSource === "All" || notice.source === activeSource;
    const matchesQuery = `${notice.title} ${notice.source} ${notice.ref}`.toLowerCase().includes(query.toLowerCase());
    const matchesActionable = !onlyActionable || notice.priority !== "Medium";
    return matchesSource && matchesQuery && matchesActionable;
  }), [activeSource, onlyActionable, query]);

  return (
    <div className="min-h-screen bg-app">
      <Header title="Compliance Desk" meta="BROKING CONTROL ROOM" searchValue={query} onSearchChange={setQuery} searchPlaceholder="Search circulars, refs, obligations..." extra={<Button variant="outline" size="sm" onClick={() => setQuery("")}><RefreshCw size={14} /> Refresh</Button>} />
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-3xl border border-[#173d36] bg-[#0d201d] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
          <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2"><Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />Monitoring 5 authorities</Badge><span className="text-xs text-emerald-100/60">Last synced 28 Oct 2026 · 09:42 IST</span></div>
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">Every circular. Every deadline. <span className="text-emerald-300">One control room.</span></h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50/70 sm:text-base">A working view for broking compliance teams to catch exchange notices, assign the action, and submit before the circular becomes a breach.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button className="bg-emerald-300 text-[#0d201d] hover:bg-emerald-200" onClick={() => setOnlyActionable(true)}><BellRing size={15} /> View action queue</Button><a className="inline-flex items-center gap-2 rounded-lg border border-emerald-100/20 px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-white/10" href="https://www.nseindia.com/static/rss-feed" target="_blank" rel="noreferrer">Connect feeds <Link2 size={14} /></a></div>
          </div>
          <div className="relative mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:absolute sm:bottom-8 sm:right-8 sm:mt-0 sm:w-[360px] sm:grid-cols-2">
            {[{ label: "Open actions", value: "12", color: "text-amber-300" }, { label: "Due this week", value: "03", color: "text-rose-300" }, { label: "Sources live", value: "5/5", color: "text-emerald-300" }, { label: "Unread notices", value: "07", color: "text-sky-300" }].map((stat) => <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className={cn("text-2xl font-bold", stat.color)}>{stat.value}</div><div className="mt-1 text-xs text-white/50">{stat.label}</div></div>)}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {sources.map((source) => <a key={source.name} href={source.url} target="_blank" rel="noreferrer" className="group rounded-2xl border border-border bg-surface p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"><div className="flex items-start justify-between"><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: source.color }}>{source.name.slice(0, 1)}</span><div><div className="text-sm font-bold text-foreground">{source.name}</div><div className="text-[11px] text-muted-foreground">{source.kind}</div></div></div><ExternalLink size={14} className="text-subtle-foreground opacity-0 transition group-hover:opacity-100" /></div><div className="mt-4 flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{source.status}</span><span className="text-[11px] text-subtle-foreground">{source.cadence}</span></div><div className="mt-2 truncate text-[11px] text-subtle-foreground">{source.feed}</div></a>)}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
          <section className="rounded-2xl border border-border bg-surface shadow-xs">
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-accent" /><h3 className="text-lg font-bold text-foreground">Latest circulars & notifications</h3></div><p className="mt-1 text-xs text-muted-foreground">Official source links, triage priority, and the next action.</p></div><div className="flex items-center gap-2"><Button variant={onlyActionable ? "default" : "outline"} size="sm" onClick={() => setOnlyActionable((value) => !value)}><Filter size={14} /> Actionable</Button><Button variant="outline" size="icon"><SlidersHorizontal size={15} /></Button></div></div>
            <div className="flex gap-2 overflow-x-auto border-b border-border px-5 py-3">{(["All", ...sources.map((source) => source.name)] as Source[]).map((source) => <button key={source} onClick={() => setActiveSource(source)} className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition", activeSource === source ? "bg-foreground text-surface" : "bg-surface-2 text-muted-foreground hover:bg-hover hover:text-foreground")}>{source}</button>)}</div>
            <div className="divide-y divide-border">{filtered.map((notice) => <article key={notice.ref} className="group p-5 transition hover:bg-hover/40"><div className="flex gap-4"><div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex" style={{ backgroundColor: `${sourceColor(notice.source)}15`, color: sourceColor(notice.source) }}><span className="text-xs font-black">{notice.source}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold" style={{ color: sourceColor(notice.source) }}>{notice.source}</span><span className="text-[11px] text-subtle-foreground">{notice.date}</span><Badge size="sm" className={notice.priority === "Critical" ? "bg-red-100 text-red-700" : notice.priority === "High" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>{notice.priority}</Badge><span className="text-[11px] text-subtle-foreground">{notice.type}</span></div><a href={notice.url} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-bold leading-5 text-foreground hover:text-accent sm:text-[15px]">{notice.title}</a><div className="mt-1 text-[11px] font-medium text-subtle-foreground">{notice.ref}</div><p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">{notice.summary}</p></div><div className="flex shrink-0 flex-col items-end gap-2"><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", notice.dueTone === "critical" ? "bg-red-100 text-red-700" : notice.dueTone === "warning" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{notice.due}</span><a href={notice.url} target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-[11px] font-semibold text-accent sm:flex">Open <ChevronRight size={13} /></a></div></div></article>)}{filtered.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No circulars match this view.</div>}</div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><CalendarClock size={18} className="text-accent" /><h3 className="text-lg font-bold text-foreground">Submission timeline</h3></div><p className="mt-1 text-xs text-muted-foreground">Next deadlines inferred from circular effective dates.</p></div><button className="text-subtle-foreground hover:text-foreground" aria-label="Timeline options"><SlidersHorizontal size={15} /></button></div><div className="mt-5 space-y-1">{deadlines.map((deadline, index) => <div key={deadline.title} className="relative flex gap-3 pb-4 last:pb-0"><div className="flex w-10 shrink-0 flex-col items-center"><div className={cn("z-10 flex h-9 w-9 flex-col items-center justify-center rounded-xl border text-[9px] font-black leading-none", deadline.tone === "critical" ? "border-red-200 bg-red-50 text-red-600" : deadline.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-border bg-surface-2 text-muted-foreground")}><span className="text-xs">{deadline.day}</span><span>{deadline.month}</span></div>{index < deadlines.length - 1 && <div className="absolute top-9 h-full w-px bg-border" />}</div><div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-surface-2/40 px-3 py-2.5"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-foreground">{deadline.title}</span><span className={cn("shrink-0 text-[10px] font-bold", deadline.tone === "critical" ? "text-red-600" : deadline.tone === "warning" ? "text-amber-700" : "text-muted-foreground")}>{deadline.label}</span></div><div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground"><span>{deadline.source}</span><span>·</span><span>{deadline.owner}</span></div></div></div>)}</div><button className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-bold text-muted-foreground transition hover:bg-hover hover:text-foreground">Open compliance calendar <ChevronRight size={14} /></button></section>
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Rss size={17} className="text-accent" /><h3 className="text-base font-bold text-foreground">Feed connections</h3></div><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Healthy</span></div><div className="mt-4 space-y-3">{sources.map((source) => <div key={source.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: source.color }} /><span className="font-semibold text-foreground">{source.name}</span></div><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><CheckCircle2 size={12} className="text-emerald-500" /> {source.status}</span></div>)}</div><div className="mt-4 rounded-xl bg-accent-bg p-3 text-[11px] leading-4 text-muted-foreground"><CircleAlert size={13} className="mr-1 inline text-accent" /> CDSL and MCX are monitored via official circular hubs; use the source links above to subscribe where RSS is unavailable.</div></section>
          </aside>
        </div>
      </main>
    </div>
  );
}
