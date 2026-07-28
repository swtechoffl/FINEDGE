import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { MarketBuzzPage } from "./pages/MarketBuzz/MarketBuzzPage";
import { PremarketPage } from "./pages/Premarket/PremarketPage";
import { DisclosurePage } from "./pages/Disclosure/DisclosurePage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/news" replace />} />
        <Route path="/news" element={<MarketBuzzPage />} />
        <Route path="/premarket" element={<PremarketPage />} />
        <Route path="/disclosure" element={<DisclosurePage />} />
        <Route path="*" element={<Navigate to="/news" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
