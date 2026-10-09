# ⚒️ SkillForge
Interactive career roadmap generator for Data, Analytics and AI/ML/GenAI professionals. Tap the skills you have; Gemini recommends what to learn next.

## Stack
Vanilla HTML/CSS/ES6 JS · PWA (manifest + service worker) · Cloudflare Worker (`worker.js`) proxying the Gemini API · no build step.

## Deploy (GitHub → Cloudflare Workers)
1. Push this folder's contents to the root of the GitHub repo.
2. Cloudflare → Workers & Pages → `skill-forge` → Settings → **Variables and Secrets** → Add:
   - Type: **Secret**, Name: `GEMINI_API_KEY`, Value: your Google AI Studio key.
3. Deploy (`wrangler.jsonc` configures the Worker and static assets automatically).

The key never appears in client code or the repo. The browser calls `POST /api/generate`; the Worker builds the prompt and calls Gemini.

## Files
`index.html` `styles.css` `app.js` `manifest.json` `sw.js` `worker.js` `wrangler.jsonc` `.assetsignore` plus `icon.svg`, `icon-192.png`, `icon-512.png`, `preview.png`.

Built by Suva · Powered by Gemini Flash
