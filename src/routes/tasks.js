const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { listTasks, createTask, updateTask, deleteTask } = require("../assistant/tasks");

const router = express.Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const tasks = await listTasks(req.user.sub, req.query.status ? String(req.query.status) : null);
    res.json({ ok: true, tasks });
  } catch (error) {
    if (/invalid task status filter/i.test(error.message)) return res.status(400).json({ error: error.message });
    console.error("Aurex task list error:", error);
    res.status(500).json({ error: "Could not load Aurex tasks." });
  }
});

router.post("/", async (req, res) => {
  try {
    const task = await createTask(req.user.sub, req.body || {});
    res.status(201).json({ ok: true, task });
  } catch (error) {
    if (/required|invalid/i.test(error.message)) return res.status(400).json({ error: error.message });
    console.error("Aurex task create error:", error);
    res.status(500).json({ error: "Could not create Aurex task." });
  }
});

router.patch("/:id", async (req, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid task ID." });
  try {
    const task = await updateTask(req.user.sub, req.params.id, req.body || {});
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.json({ ok: true, task });
  } catch (error) {
    if (/required|invalid|no task fields/i.test(error.message)) return res.status(400).json({ error: error.message });
    console.error("Aurex task update error:", error);
    res.status(500).json({ error: "Could not update Aurex task." });
  }
});

router.delete("/:id", async (req, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid task ID." });
  try {
    const deleted = await deleteTask(req.user.sub, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Task not found." });
    res.json({ ok: true, deleted: true });
  } catch (error) {
    console.error("Aurex task delete error:", error);
    res.status(500).json({ error: "Could not delete Aurex task." });
  }
});

module.exports = router;
