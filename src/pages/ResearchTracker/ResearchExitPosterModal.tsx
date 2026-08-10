import { useRef } from "react";
import { X } from "lucide-react";
import { PosterActions } from "../Premarket/posterShared";
import { ResearchExitPoster, POSTER_WIDTH } from "./ResearchExitPoster";
import type { ResearchCall } from "./researchTrackerTypes";
import type { HistoryPoint } from "./useResearchQuotes";

export function ResearchExitPosterModal({
  call,
  history,
  onClose,
}: {
  call: ResearchCall;
  history: HistoryPoint[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dateStr = call.exitDate ?? new Date().toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div className="animate-scale-in flex flex-col items-center gap-2 py-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ width: POSTER_WIDTH }}>
          <span className="text-sm font-bold text-white">Exit Poster</span>
          <button
            onClick={onClose}
            className="focus-ring rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl shadow-lg">
          <ResearchExitPoster ref={ref} call={call} history={history} />
        </div>
        <PosterActions
          nodeRef={ref}
          filename={`stoqtrade-${call.symbol.toLowerCase()}-exit-${dateStr}.png`}
          shareTitle={`${call.symbol} — Trade Closed`}
          width={POSTER_WIDTH}
          pixelRatio={3}
        />
      </div>
    </div>
  );
}
