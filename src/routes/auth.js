const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { query } = require("../db");
const { recordAudit } = require("../audit");

const router = express.Router();
const authAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 10;
const REGISTER_LIMIT = 5;
function clientKey(req) {
  return String(req.ip || req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
}
function allowAuth(req, action, limit) {
  const key = action + ":" + clientKey(req);
  const now = Date.now();
  const entry = authAttempts.get(key);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    authAttempts.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, entry] of authAttempts) if (entry.startedAt < cutoff) authAttempts.delete(key);
}, WINDOW_MS).unref();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h", issuer: "aurex-api", audience: "aurex-control" }
  );
}

router.post("/register", async (req, res) => {
  try {
    if (!allowAuth(req, "register", REGISTER_LIMIT)) return res.status(429).json({ error: "Registration rate limit exceeded", retry_after_seconds: 900 });
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || password.length < 8) {
      await recordAudit({ eventType: "auth.register.rejected", metadata: { reason: "invalid_input" } });
      return res.status(400).json({
        error: "Valid email and password of at least 8 characters are required"
      });
    }

    const existing = await query(
      "select id from users where lower(email) = lower($1) limit 1",
      [email]
    );

    if (existing.rows[0]) {
      await recordAudit({ eventType: "auth.register.rejected", metadata: { reason: "user_exists" } });
      return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    const result = await query(
      `insert into users (id, email, password_hash)
       values ($1, $2, $3)
       returning id, email, created_at`,
      [id, email, passwordHash]
    );

    const user = result.rows[0];
    await recordAudit({ userId: user.id, eventType: "auth.register.success" });

    res.status(201).json({
      user,
      token: signToken(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    if (!allowAuth(req, "login", LOGIN_LIMIT)) return res.status(429).json({ error: "Login rate limit exceeded", retry_after_seconds: 900 });
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const result = await query(
      "select id, email, password_hash, created_at from users where lower(email) = lower($1) limit 1",
      [email]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await recordAudit({ eventType: "auth.login.failure", metadata: { reason: "invalid_credentials" } });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await recordAudit({ userId: user.id, eventType: "auth.login.success" });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      token: signToken(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not log in" });
  }
});

module.exports = router;
