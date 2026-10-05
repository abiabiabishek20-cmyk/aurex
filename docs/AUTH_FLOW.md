# Aurex v1 Authentication Flow

1. Client sends email/password to register or login.
2. Registration hashes the password with bcrypt; plaintext is not stored.
3. Login compares the password with the bcrypt hash.
4. Success creates a signed JWT containing `sub` and `email`.
5. Client sends `Authorization: Bearer <token>` to protected endpoints.
6. `authMiddleware` verifies JWT signature and expiry.
7. Protected routes use `req.user`.

## Production TODO
- Replace in-memory store with PostgreSQL/Supabase/etc.
- Use a strong random JWT secret from a secret manager.
- Add rate limiting and abuse protection.
- Consider secure HttpOnly cookies for browser sessions.
- Add refresh-token/session rotation for long-lived sessions.
- Add email verification, password reset and audit logging.
