const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

test("Windows agent has an automatic-start bootstrap", () => {
  const file = path.join(__dirname, "../desktop-agent/install-autostart.ps1");
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /Register-ScheduledTask/);
  assert.match(source, /New-ScheduledTaskTrigger -AtLogOn/);
  assert.match(source, /RestartCount/);
});

test("installer plan forbids embedding device credentials", () => {
  const file = path.join(__dirname, "../desktop-agent/INSTALLER_PLAN.md");
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /never embed a device token/i);
});
