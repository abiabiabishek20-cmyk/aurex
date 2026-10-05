const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { query } = require("../db");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || password.length < 8) {
      return res.status(400).json({
        error: "Valid email and password of at least 8 characters are required"
      });
    }

    const existing = await query(
      "select id from users where lower(email) = lower($1) limit 1",
      [email]
    );

    if (existing.rows[0]) {
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
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const result = await query(
      "select id, email, password_hash, created_at from users where lower(email) = lower($1) limit 1",
      [email]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

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
