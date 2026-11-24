# AUREX — Private Cloud-First Personal AI

AUREX is a private, single-owner AI assistant. The cloud-first dashboard is served at the application root; no PC installation is required for chat, memory, research, planning and task management.

## Current cloud capabilities
- Owner-only registration and JWT login.
- Tamil, Tanglish and English assistant conversations.
- Persistent conversations and private memory tools.
- Web research through the configured AI provider's web-search tool.
- Task management, planning and starter project blueprints.
- Browser-based push-to-talk speech recognition where supported, and spoken replies.
- Optional PC Companion code remains in the repository for a future hybrid mode, but cloud-only mode blocks PC and local Ollama tools.

## Required environment
Set these values in the hosting provider dashboard. Never commit real secrets.

```env
PORT=3000
DATABASE_URL=YOUR_SUPABASE_CONNECTION_STRING
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=1h
DATABASE_SSL=true
NODE_ENV=production
AUREX_OWNER_EMAIL=owner@example.com
OPENAI_API_KEY=YOUR_SERVER_SIDE_AI_API_KEY
AUREX_MODEL=YOUR_ENABLED_MODEL_ID
AUREX_CLOUD_ONLY=true
```

AUREX_MODEL must be a model ID enabled for the API account. There is intentionally no guessed default model.

## Database
Run `db/schema.sql` in Supabase SQL Editor. The service creates its assistant, task and audit tables during startup.

## Run
```bash
npm install
npm start
```

## Deployment
The Render blueprint in `render.yaml` configures the Node web service. Add every required environment variable in Render, connect Supabase, and verify `/api/health` after deployment. The service cannot be considered live until a real owner login and assistant request have been tested.

## Security
- Configure `AUREX_OWNER_EMAIL` before allowing registration.
- Keep API keys and database credentials on the server only.
- Keep the repository private before storing proprietary source code.
- Use HTTPS and private database/storage policies.
- Review `docs/CLOUD_FIRST_ARCHITECTURE.md` and `docs/CLOUD_ONLY_DEPLOYMENT.md`.

## Limitations
Cloud-only AUREX cannot control the owner's local desktop, read local files, launch installed apps, run local Ollama, or work offline. Browser voice support varies. AI and speech provider usage can incur charges. Website automation requires a separately configured isolated cloud browser worker and is not implied by the current desktop bridge.
