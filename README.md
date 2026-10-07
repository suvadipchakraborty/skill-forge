# ⚒️ SkillForge
Interactive career roadmap generator. Tap the skills you have; Gemini recommends what to learn next.

## Stack
Vanilla HTML/CSS/ES6 JS · PWA (manifest + service worker) · Gemini API · zero build step.

## Deploy (GitHub → Cloudflare)
1. Push this folder's contents to the root of a GitHub repo.
2. Cloudflare → Workers & Pages → connect the repo. Build command: *(none)*. Output directory: `/`.

## Configure
Edit the `CONFIG` object at the top of `app.js` (API key, model).
> ⚠️ The key is visible in client-side code. Restrict it by HTTP referrer in Google AI Studio / Cloud Console, or proxy calls through a Worker.

## Files
`index.html` `styles.css` `app.js` `manifest.json` `sw.js` plus `icon.svg`, `icon-192.png`, `icon-512.png`, `preview.png` (social share image, 1200×630).

Built by Suva · Powered by Gemini 2.5 Flash
