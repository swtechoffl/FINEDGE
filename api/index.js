// Vercel auto-detects files under /api as serverless functions. This just
// re-exports the existing Express app (server/index.js) so all /api/* routes
// keep working unchanged — see vercel.json for the rewrite that sends every
// /api/* request here while preserving the original path.
export { default } from "../server/index.js";
