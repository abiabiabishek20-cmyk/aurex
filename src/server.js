require("dotenv").config();

const express = require("express");
const authRoutes = require("./routes/auth");
const { authMiddleware } = require("./middleware/auth");
const { query } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({ ok: true, service: "aurex-api", database: "connected" });
  } catch (error) {
    console.error(error);
    res.status(503).json({ ok: false, service: "aurex-api", database: "unavailable" });
  }
});

app.use("/api/auth", authRoutes);

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await query(
      "select id, email, created_at from users where id = $1",
      [req.user.sub]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Aurex API running on http://localhost:${PORT}`);
});
