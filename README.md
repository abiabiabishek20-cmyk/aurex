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
```

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

After these are set, `/api/health` should return `ok: true` with `database: "connected"`.

## Authentication flow

Client → register/login → PostgreSQL user lookup → bcrypt hash/verification → JWT → `Authorization: Bearer <token>` → JWT middleware → protected route.

## Next production hardening

- Email verification and password reset
- Rate limiting
- Refresh-token/session rotation when long-lived sessions are needed
- HttpOnly secure cookies for browser sessions where appropriate
- Audit logging and monitoring
