# Project TODO

- [x] Replace the starter home page with the OptiVid VideoForge dashboard shell
- [x] Add frontend-only API client using `VITE_API_BASE` with direct port 8000 requests
- [x] Add drag-and-drop upload flow posting multipart fields `file`, `preset`, `platform`, and `settings_override` to `/api/v1/jobs`
- [x] Add preset selector with `viral`, `cinematic`, `clean`, and `podcast`
- [x] Add platform selector with `tiktok`, `youtube`, `instagram`, and `generic`
- [x] Add active job cards with polling every 3 seconds, progress, elapsed time, and exact status labels `queued`, `running`, `passed`, and `failed`
- [x] Add SSE log stream support with polling fallback and visible API/CORS errors
- [x] Add job history from `/api/v1/jobs`
- [x] Add completed-job output browser with exact filenames `final_13min_spoken.mp4`, `pexels_ids.json`, `diversity_check.json`, and `scene_manifest_linear_fixed.json`
- [x] Add in-app video preview and format download links
- [x] Add settings view for API base URL, ElevenLabs API key, default voice, and default model preferences without sending secrets to any server other than the configured API
- [ ] Add `.env.example` with `VITE_API_BASE=http://91.99.162.143:8000`
- [x] Add README instructions for `npm install && npm run dev`
- [ ] Add Vitest coverage for API URL construction, upload payload, status handling, and CORS error messaging
- [x] Verify responsive layout, type checking, tests, and production build

## Attached instruction updates

- [x] Preserve production lock: do not access SSH, production site, port 8081, backend port 8000, nginx, or server files
- [x] Add the exact hero label `OptiVid / VideoForge - Proven 13min Pipeline`
- [x] Add upload file name, size, and validation feedback
- [x] Support backend status wording `queued`, `processing`, `completed`, and `failed` while retaining requested UI badge semantics where applicable
- [x] Add paginated history request using `/api/v1/jobs?limit=50`
- [x] Document local HTTP use of `http://91.99.162.143:8000` and production mixed-content limitation without attempting a backend fix
- [x] Keep delivery local/Manus preview only; do not deploy to the existing production domain

## Verification gap fixes

- [x] Add an elapsed time counter to active job cards and/or the job detail drawer, updating while jobs are queued/running
- [x] Poll `GET /api/v1/jobs/{job_id}/logs` on an interval when SSE is unavailable or disconnects, and merge new log lines into the live log viewer
- [x] Add an API base URL field to the Settings page, persist it locally, and wire the frontend client to use the saved override safely
