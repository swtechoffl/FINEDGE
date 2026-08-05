import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./theme/ThemeContext";

// This app deploys often, and several pages (Report Maker, One Pager,
// Flowchart export) load code via dynamic `import()` — e.g. exportPdf,
// html-to-image, react-markdown. A tab left open across a deploy still has
// the old index.html, which points at asset hashes a new build has already
// replaced, so any of those lazy imports fail with "Failed to fetch
// dynamically imported module". Vite fires `vite:preloadError` for exactly
// this case; reloading once picks up the current build's hashes. Guarded by
// a sessionStorage flag so a genuinely broken deploy reloads once and then
// surfaces the real error instead of loop-reloading forever.
const PRELOAD_ERROR_KEY = "stoqtrade-reloaded-after-preload-error";
window.addEventListener("vite:preloadError", () => {
  if (sessionStorage.getItem(PRELOAD_ERROR_KEY)) return;
  sessionStorage.setItem(PRELOAD_ERROR_KEY, "1");
  window.location.reload();
});
// This load succeeded, so the guard above has done its job — clear it so a
// later deploy during the same long-lived tab can still trigger one more
// auto-reload instead of staying permanently disarmed for the rest of the
// browser session.
sessionStorage.removeItem(PRELOAD_ERROR_KEY);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
