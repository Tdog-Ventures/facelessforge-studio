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
- [x] User-confirmed managed `.env.example` configuration with `VITE_API_BASE=http://91.99.162.143:8000`; direct sandbox readback is unavailable by platform design
- [x] Add README instructions for `npm install && npm run dev`
- [x] Add Vitest coverage for API URL construction, upload payload, status handling, and CORS error messaging
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

## Final verification follow-ups

- [x] Verify `.env.example` is present through the supported environment/configuration workflow and capture evidence for `VITE_API_BASE=http://91.99.162.143:8000`
- [x] Configure Vitest to discover `client/src/lib/api.test.ts`, rerun `pnpm test`, and confirm the frontend API contract tests execute and pass

## Public endpoint configuration revision

- [x] User-confirmed managed `.env.development` configuration with direct endpoint `http://91.99.162.143:8000`; direct sandbox readback is unavailable by platform design
- [x] User-confirmed managed `.env.production` configuration with HTTPS proxy `https://facelessforge.ethinx.solutions/api/videoforge`; direct sandbox readback is unavailable by platform design
- [x] User-confirmed managed `.env.example` documentation for development and production endpoint choices; direct sandbox readback is unavailable by platform design
- [x] Align endpoint documentation and API-base behavior with the revised environment configuration
- [x] Re-run tests, production build, and visual verification after configuration changes
- [x] Record the user-confirmed managed environment configuration; the sandbox cannot independently read platform-managed environment files
- [x] Prevent the local preview from requesting `/api/v1/jobs` against the Vite HTML fallback when public env files are unavailable in the sandbox; retain the direct development fallback and non-JSON response guard
- [x] Update `client/src/lib/api.ts` to follow the confirmed environment-only dev/prod endpoint strategy, then rerun tests and build
- [x] Update README setup documentation with the development direct endpoint and production HTTPS proxy override
- [x] Confirm `client/src/lib/api.ts` uses the revised environment strategy without contacting any backend during verification

## Recent-run state controls

- [x] Give each failed-job tooltip a unique ID so multiple failed rows have valid aria-describedby targets
- [x] Add a UI/component test that renders a failed recent-run badge and verifies tooltip markup, hover/focus CSS selectors, and keyboard focus affordance
- [x] Add a development-only deterministic failed-job tooltip preview harness with hover and focus states
- [x] Capture explicit preview evidence for the failed tooltip content and visibility states
- [x] Add a status filter dropdown for recent-run states with all, queued, running, completed, and failed options
- [x] Add tests for recent-run filtering and failure-reason extraction
- [x] Run typecheck, tests, production build, and visual verification
