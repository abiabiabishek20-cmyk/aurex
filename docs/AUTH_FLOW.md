# Aurex v1 Authentication Flow

## Register

1. Client sends `POST /api/auth/register` with email/password.
2. Aurex validates the request.
3. Aurex checks PostgreSQL for an existing email.
4. Password is hashed with bcrypt (12 rounds).
5. Only the hash is stored in `users.password_hash`.
6. Aurex signs a JWT containing the user ID (`sub`) and email.
7. Client receives the token.

## Login

1. Client sends email/password.
2. Aurex loads the user by email using a parameterized SQL query.
3. `bcrypt.compare()` checks the password against the stored hash.
4. Aurex issues a JWT after successful verification.

## Protected request

Send:

`Authorization: Bearer <token>`

The JWT middleware verifies the signature and expiry. The protected route uses `req.user.sub` to load the current user from PostgreSQL.

## Security notes

- Passwords are never stored in plaintext.
- SQL parameters (`$1`) are used instead of string concatenation.
- JWT secret comes from environment configuration.
- `.env` is ignored by Git.
- The in-memory user store from the first Aurex starter has been removed.
