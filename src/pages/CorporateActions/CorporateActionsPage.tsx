import { useMemo, useState } from "react";
import { Loader2, CalendarClock } from "lucide-react";
import { Header } from "../../components/Header";
import { Card } from "../../components/ui/Card";
import { relativeTime } from "../../data/mock";
import { usePostMarket } from "../PostMarket/usePostMarket";
import type { CorporateAction } from "../PostMarket/usePostMarket";

function groupByDate(actions: CorporateAction[]) {
  const groups = new Map<string, CorporateAction[]>();
  for (const action of actions) {
    const list = groups.get(action.exDate) ?? [];
    list.push(action);
    groups.set(action.exDate, list);
  }
  return Array.from(groups.entries());
}

export function CorporateActionsPage() {
  const { data, loading } = usePostMarket();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.corporateActionsAll;
    return data.corporateActionsAll.filter((a) =>
      [a.symbol, a.company, a.subject].join(" ").toLowerCase().includes(query),
    );
  }, [data.corporateActionsAll, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const meta = data.fetchedAt > 0 ? `Updated ${relativeTime(new Date(data.fetchedAt).toISOString())}` : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="corporate actions"
        meta={meta}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search company, symbol, or action…"
      />

      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        {loading && data.corporateActionsAll.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
            <Loader2 size={24} className="animate-spin text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Fetching corporate actions from NSE…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-32 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {search.trim() ? `No actions match "${search.trim()}".` : "No upcoming corporate actions found."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map(([date, actions]) => (
              <section key={date} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CalendarClock size={14} className="text-subtle-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">{date}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Card className="divide-y divide-border overflow-hidden p-0">
                  {actions.map((a) => (
                    <div key={`${a.symbol}-${a.subject}`} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{a.company}</div>
                        <div className="text-xs text-subtle-foreground">{a.subject}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-chip px-2 py-0.5 text-xs font-semibold text-foreground">
                        {a.symbol}
                      </span>
                    </div>
                  ))}
                </Card>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
