# Aurex API

Aurex v1 backend foundation with Node.js, Express, PostgreSQL/Supabase, bcrypt and JWT authentication.

## API

- `GET /api/health` — database connectivity health check
- `POST /api/auth/register` — create a user
- `POST /api/auth/login` — authenticate and receive a JWT
- `GET /api/auth/me` — authenticated user (`Authorization: Bearer <token>` required)

## Environment

Copy `.env.example` to `.env` and set:

```env
PORT=3000
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=1h
DATABASE_SSL=true
AUREX_OWNER_EMAIL=your_owner_email@example.com
OPENAI_API_KEY=your_openai_api_key
AUREX_MODEL=gpt-6-luna
```

`AUREX_OWNER_EMAIL` is required to enable registration and should be set to the single owner's existing account email in Render. When configured, login is restricted to that email. If it is missing, new registrations fail closed; existing login remains available so a missing setting does not unexpectedly lock out an already-created owner account. `OPENAI_API_KEY` is optional when the paired desktop agent and local Ollama are available; cloud web research and cloud tool-calling require the provider key. Keep all real values in the hosting provider's environment settings, never in Git.

Never commit `.env` or real secrets to GitHub.

## Database

Run `db/schema.sql` in Supabase SQL Editor/PostgreSQL. The API expects the `users` table used by the auth routes.

## Run

```bash
npm install
npm run dev
```

Production uses `npm start`.

## Render deployment

`render.yaml` configures the Aurex web service. Required Render environment variables are:

- `DATABASE_URL` — Supabase PostgreSQL connection string
- `JWT_SECRET` — long random JWT signing secret
- `DATABASE_SSL=true`
- `JWT_EXPIRES_IN=1h`
- `NODE_ENV=production`
- `AUREX_OWNER_EMAIL` — the one owner's existing account email
- `OPENAI_API_KEY` — optional cloud AI provider key; omit only when relying on local Ollama fallback

After these are set, `/api/health` should return `ok: true` with `database: "connected"`.

## Authentication flow

Client → register/login → PostgreSQL user lookup → bcrypt hash/verification → JWT → `Authorization: Bearer <token>` → JWT middleware → protected route.

## Next production hardening

- Email verification and password reset
- Rate limiting
- Refresh-token/session rotation when long-lived sessions are needed
- HttpOnly secure cookies for browser sessions where appropriate
- Audit logging and monitoring


## Local Ollama fallback (optional)

The cloud assistant can fall back to Ollama on the paired Windows PC when the OpenAI key is missing, invalid, rate-limited, or out of quota. This requires Ollama to be running locally and the authenticated Aurex Desktop Agent to be connected to this API. The agent calls only `http://127.0.0.1:11434`; do not expose Ollama's port to the internet. Set `AUREX_OLLAMA_MODEL=qwen2.5:3b` in the desktop agent's local `.env` only if you want to override the default model. The fallback supports chat only; cloud tool-calling and web research still require the configured cloud AI provider. If the PC/agent is offline, the API cannot reach the local model.
