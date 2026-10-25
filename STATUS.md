# AUREX — Build Status

Last updated: 2026-10-25

## Project rules
- Private, single-owner personal assistant; no public sign-up.
- Support Tamil, English, and Tanglish.
- Never claim an action succeeded without verification.
- Never put passwords, API keys, access tokens, or real secrets in Git.
- Work one milestone at a time; wait for owner confirmation before moving on.
- Ask before paid services or destructive actions.
- PC automation must stay permissioned and use the paired local companion.

## Current repository reality (verified from main)
- Repository: `abiabiabishek20-cmyk/aurex`
- Existing stack: Node.js + Express, PostgreSQL/Supabase, JWT authentication, and a WebSocket Desktop Agent.
- Existing features include a control dashboard, desktop pairing/commands, tasks/memory/research tools, and an optional local Ollama chat fallback.
- Render service currently targets the Node app (`npm install` / `npm start`); it is not the Python/FastAPI architecture described in the build brief.
- `.gitignore` includes `.env` patterns and `node_modules/`.
- The Render deployment checked on 2026-10-25 (deployment `dep-dbets8nb9u1s73auijng`) ended with status `update_failed`.
- The owner’s screenshot showed Desktop Agent online and System Info returned successfully, but the Aurex Brain chat showed “Aurex Assistant is temporarily unavailable.”
- Earlier deployment logs showed PostgreSQL authentication failure. Current root cause still needs verification; do not expose or request secrets in chat.

## Milestones

### M0 — Accounts and repository
Status: PARTIALLY VERIFIED
- [x] GitHub repository exists.
- [x] Render service exists.
- [x] Windows Desktop Agent has connected to Render in the owner’s screenshot.
- [x] `.gitignore` protects environment files.
- [ ] Confirm Supabase project and authentication configuration.
- [ ] Confirm LLM provider configuration without exposing secret values.
- [ ] Check repository for accidentally committed secrets.
- [x] Add this status tracker.

### M1 — Supabase
Status: NOT VERIFIED
- [ ] Confirm schema and required tables.
- [ ] Verify row-level security and owner-only access.
- [ ] Verify one-owner authentication/sign-up restrictions against the current application design.

### M2 — Backend, authentication, deployment
Status: IN PROGRESS / BLOCKED
- [x] Existing Node/Express backend and Render service are present.
- [ ] Resolve deployment startup/database authentication issue.
- [ ] Verify health endpoint.
- [ ] Verify unauthenticated requests are rejected by protected API routes.
- [ ] Add/run tests for owner-only authorization.

### M3 — Chat
Status: BLOCKED / NOT VERIFIED
- [x] Chat UI exists.
- [x] Local Ollama fallback code is present in the repository.
- [ ] Fix the current “assistant temporarily unavailable” result.
- [ ] Verify cloud chat and local fallback separately.
- [ ] Test at least 10 owner-provided Tamil/Tanglish sentences before selecting a model.

### M4 — Memory and tasks
Status: PARTIALLY IMPLEMENTED; NEEDS VERIFICATION
- [x] Memory/task-related modules exist.
- [ ] Verify create, retrieve, update, delete, and task-state validation against the live service.

### M5 — HUD, login, voice
Status: PARTIALLY IMPLEMENTED; NEEDS VERIFICATION
- [x] Existing dark Aurex Control UI and desktop-control features exist.
- [ ] Verify authentication/session behaviour and voice features against the brief.
- [ ] Clearly label any simulated visual effects.

### M6 — Hardening and documentation
Status: NOT COMPLETE
- [ ] Complete security review, tests, rate limiting, CORS review, and key-rotation documentation.
- [ ] Verify no secrets are committed or logged.
- [ ] Record any unverified items honestly.

## Architecture decision required
The brief proposes a new Python/FastAPI app and a new Supabase Auth/JWKS owner-session flow. The existing repository is Node.js/Express with JWT auth and PostgreSQL. Do not silently replace the current stack or migrate production data. First stabilize and audit the existing application; then decide whether to adapt it to the brief or perform a deliberate migration.

## Next action
Inspect the failed Render deployment and relevant server/database/auth code without reading or exposing secret values. Fix only the confirmed cause, test, and update this file.
