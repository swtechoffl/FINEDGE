import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { MarketBuzzPage } from "./pages/MarketBuzz/MarketBuzzPage";
import { PremarketPage } from "./pages/Premarket/PremarketPage";
import { PostMarketPage } from "./pages/PostMarket/PostMarketPage";
import { RamkiPremarketPage } from "./pages/RamkiPremarket/RamkiPremarketPage";
import { RamkiPostMarketPage } from "./pages/RamkiPostMarket/RamkiPostMarketPage";
import { CorporateActionsPage } from "./pages/CorporateActions/CorporateActionsPage";
import { MarketInternalsPage } from "./pages/MarketInternals/MarketInternalsPage";
import { PostersPage } from "./pages/Posters/PostersPage";
import { MarketingPostersPage } from "./pages/MarketingPosters/MarketingPostersPage";
import { FlowchartPage } from "./pages/Flowchart/FlowchartPage";
import { StockDetailPage } from "./pages/StockDetail/StockDetailPage";
import { DisclosurePage } from "./pages/Disclosure/DisclosurePage";
import { ReportMakerPage } from "./pages/ReportMaker/ReportMakerPage";
import { OnePagerPage } from "./pages/OnePager/OnePagerPage";
import { ResearchTrackerPage } from "./pages/ResearchTracker/ResearchTrackerPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/news" replace />} />
        <Route path="/news" element={<MarketBuzzPage />} />
        <Route path="/premarket" element={<PremarketPage />} />
        <Route path="/postmarket" element={<PostMarketPage />} />
        <Route path="/ramki-premarket" element={<RamkiPremarketPage />} />
        <Route path="/ramki-postmarket" element={<RamkiPostMarketPage />} />
        <Route path="/corporate-actions" element={<CorporateActionsPage />} />
        <Route path="/market-internals" element={<MarketInternalsPage />} />
        <Route path="/posters" element={<PostersPage />} />
        <Route path="/marketing-posters" element={<MarketingPostersPage />} />
        <Route path="/flowchart" element={<FlowchartPage />} />
        <Route path="/report-maker" element={<ReportMakerPage />} />
        <Route path="/one-pager" element={<OnePagerPage />} />
        <Route path="/research-tracker" element={<ResearchTrackerPage />} />
        <Route path="/stock/:symbol" element={<StockDetailPage />} />
        <Route path="/disclosure" element={<DisclosurePage />} />
        <Route path="*" element={<Navigate to="/news" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
