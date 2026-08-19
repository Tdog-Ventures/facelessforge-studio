# OptiVid / VideoForge — Proven 13min Pipeline

VideoForge is an independent React/Vite frontend for the existing OptiVid FastAPI backend. It runs locally on `http://localhost:3000`, calls the configured API directly, and does not proxy, deploy, restart, SSH to, or modify the backend or production site.

## Environment configuration

The endpoint is public browser configuration, not a secret. For local development, use `.env.development` with a direct browser call to the existing FastAPI service:

```env
VITE_API_BASE=http://91.99.162.143:8000
```

For an HTTPS production build, use `.env.production` with the existing HTTPS proxy path to avoid mixed-content blocking:

```env
VITE_API_BASE=https://facelessforge.ethinx.solutions/api/videoforge
```

`.env.example` contains the local default and documents the production override. Vite injects the selected `VITE_API_BASE` value at build time; the client then calls `${VITE_API_BASE}/api/v1/...` directly from the browser.

## Local setup

Then run:

```bash
npm install
npm run dev
```

The interface calls endpoints under `${VITE_API_BASE}/api/v1/`, including job creation, status polling, logs, SSE progress, history, and output downloads. The frontend reports CORS and network failures visibly rather than attempting to alter the backend. Local development remains isolated and does not contact the production site; production configuration only selects the existing HTTPS proxy URL.

## Included workflows

The UI includes drag-and-drop video upload with file validation, preset and platform selectors, active job cards with three-second polling, an optional SSE stream, live logs, job history, completed-job output links, video preview, and local browser settings for voice/model preferences. Output names are presented exactly as `final_13min_spoken.mp4`, `pexels_ids.json`, `diversity_check.json`, and `scene_manifest_linear_fixed.json`.

This repository is frontend-only. Do not SSH to the backend host, touch the existing FacelessForge production site, modify port 8081 or port 8000, or deploy this UI to the production domain.
