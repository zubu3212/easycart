// All /api/* requests are rewritten here (netlify.toml) and handled by the Express app in server/.
// It lives inside server/ so @prisma/client resolves from server/node_modules.
export { handler } from "../../netlify.js";
