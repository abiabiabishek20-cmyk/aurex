# Aurex v1

Starter backend foundation for Aurex with authentication.

## Stack
- Node.js
- Express
- JWT authentication
- bcrypt password hashing
- dotenv

## Run
```bash
npm install
cp .env.example .env
npm run dev
```

## API
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token required)

Never commit `.env`.
