import { useMemo, useState } from "react";
import { Clock, AlertCircle, Loader2 } from "lucide-react";
import { Header } from "../../components/Header";
import { BreakingTicker } from "./BreakingTicker";
import { FilterPanel } from "./FilterPanel";
import { NewsCard } from "./NewsCard";
import { NewsDrawer } from "./NewsDrawer";
import { FeedHealth } from "./FeedHealth";
import { IndicesBar } from "./IndicesBar";
import { ShareSheet } from "./ShareSheet";
import { useNewsFeed } from "./useNewsFeed";
import { isToday, relativeTime } from "../../data/mock";
import type { NewsItem } from "../../types";
import { DEFAULT_FILTERS, IMPACT_LEVELS, TIMELINE_HOURS } from "./types";

export function MarketBuzzPage() {
  const { items, feedStatus, fetchedAt, loading, error } = useNewsFeed();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [sharing, setSharing] = useState<NewsItem | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const cutoff = Date.now() - TIMELINE_HOURS[filters.timeline] * 60 * 60 * 1000;
    const query = search.trim().toLowerCase();
    return items.filter((n) => {
      if (+new Date(n.timestamp) < cutoff) return false;
      if (filters.signal !== "all" && n.signal !== filters.signal) return false;
      if (IMPACT_LEVELS.indexOf(n.impact) < filters.minImpactIndex) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(n.category)) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(n.source)) return false;
      if (filters.stocks.length > 0 && !n.tickers.some((t) => filters.stocks.includes(t.symbol)))
        return false;
      // playgroundOnly has no real watchlist backing yet — treated as a no-op pass-through
      if (query) {
        const haystack = [
          n.headline,
          n.summary,
          n.source,
          n.category,
          n.sector,
          ...n.tickers.map((t) => t.symbol),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [items, filters, search]);

  const breaking = useMemo(() => items.filter((n) => n.impact === "high").slice(0, 8), [items]);

  const todayItems = filtered.filter((n) => isToday(n.timestamp));
  const earlierItems = filtered.filter((n) => !isToday(n.timestamp));

  const meta = fetchedAt
    ? `Live · updated ${relativeTime(new Date(fetchedAt).toISOString())} · ${items.length} articles`
    : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="market pulse"
        meta={meta}
        extra={<FeedHealth feedStatus={feedStatus} />}
        searchValue={search}
        onSearchChange={setSearch}
      />
      <IndicesBar />
      <BreakingTicker items={breaking} />

      <div className="flex flex-1">
        <FilterPanel filters={filters} setFilters={setFilters} allNews={filtered} />

        <main className="min-w-0 flex-1 px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
              <Loader2 size={24} className="animate-spin text-accent" />
              <p className="text-sm font-medium text-muted-foreground">Fetching live news from RSS sources…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
              <AlertCircle size={24} className="text-bearish" />
              <p className="text-sm font-semibold text-foreground">Couldn't load the news feed</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {error}. Make sure the API server is running —{" "}
                <code className="rounded bg-chip px-1 py-0.5 text-xs">npm run server</code> (or just{" "}
                <code className="rounded bg-chip px-1 py-0.5 text-xs">npm run dev</code>, which starts both).
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-32 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {search.trim()
                  ? `No news matches "${search.trim()}".`
                  : "No news matches the selected filters."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {todayItems.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-subtle-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">Today</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex flex-col gap-3">
                    {todayItems.map((item) => (
                      <NewsCard
                        key={item.id}
                        item={item}
                        onClick={() => setSelected(item)}
                        onShare={setSharing}
                      />
                    ))}
                  </div>
                </section>
              )}

              {earlierItems.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-subtle-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">Earlier</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex flex-col gap-3">
                    {earlierItems.map((item) => (
                      <NewsCard
                        key={item.id}
                        item={item}
                        onClick={() => setSelected(item)}
                        onShare={setSharing}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {selected && <NewsDrawer item={selected} onClose={() => setSelected(null)} onShare={setSharing} />}
      {sharing && <ShareSheet item={sharing} onClose={() => setSharing(null)} />}
    </div>
  );
}
