# Aurex v1 — Database Authentication

Aurex backend foundation with:
- Express
- PostgreSQL-compatible database (works with Supabase Postgres)
- bcrypt password hashing
- JWT authentication
- dotenv configuration

## 1. Install

```bash
npm install
```

## 2. Configure

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` — your PostgreSQL/Supabase connection string
- `JWT_SECRET` — a long random secret

Never commit `.env`.

## 3. Create the database table

Run `db/schema.sql` in your Supabase SQL Editor or PostgreSQL client.

## 4. Start

```bash
npm run dev
```

## API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` — Bearer token required

## Authentication flow

Client → register/login → PostgreSQL user lookup → bcrypt verification/hash → JWT → `Authorization: Bearer <token>` → JWT middleware → protected route.

## Production TODO

- Add email verification and password reset.
- Add rate limiting.
- Add refresh-token/session rotation if long-lived sessions are required.
- Consider HttpOnly secure cookies for browser sessions.
- Add audit logging and monitoring.
