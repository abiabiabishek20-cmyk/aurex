const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { getModules } = require("../assistant/modules");

const router = express.Router();
router.use(authMiddleware);

router.get("/", (_req, res) => {
  res.json({ ok: true, modules: getModules() });
});

module.exports = router;
