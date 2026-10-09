function createPlan(args = {}) {
  const request = String(args.request || "").trim().slice(0, 2000);
  if (!request) return { ok: false, message: "A planning request is required." };
  const goal = String(args.goal || "").trim().slice(0, 500) || request;
  const lower = request.toLowerCase();
  const phases = [];
  if (/(app|website|web|software|project|code|create|build)/.test(lower)) {
    phases.push(
      { id: 1, title: "Understand", actions: ["Clarify the requested outcome, constraints, inputs and success criteria."] },
      { id: 2, title: "Design", actions: ["Define architecture, screens or components, data flow and safe tool boundaries."] },
      { id: 3, title: "Build", actions: ["Implement the smallest working slice with isolated, reviewable changes."] },
      { id: 4, title: "Verify", actions: ["Run available tests, inspect errors and verify the requested behavior."] },
      { id: 5, title: "Deliver", actions: ["Prepare the result and only perform external deployment or publishing after explicit confirmation."] }
    );
  } else {
    phases.push(
      { id: 1, title: "Understand", actions: ["Identify the desired outcome, constraints and success criteria."] },
      { id: 2, title: "Plan", actions: ["Break the request into small, ordered steps and identify dependencies."] },
      { id: 3, title: "Execute", actions: ["Carry out safe steps and keep external side effects behind confirmation."] },
      { id: 4, title: "Verify", actions: ["Check the result against the success criteria and report anything incomplete."] }
    );
  }
  return { ok: true, planning_only: true, goal, request, phases };
}

module.exports = { createPlan };
