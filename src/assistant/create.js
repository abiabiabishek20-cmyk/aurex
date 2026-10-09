const path = require("path");

const PROJECT_TYPES = new Set(["website", "node-api"]);

function safeProjectName(value) {
  const name = String(value || "aurex-project")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return name || "aurex-project";
}

function generateProjectBlueprint(args = {}) {
  const type = String(args.type || "website").toLowerCase();
  if (!PROJECT_TYPES.has(type)) {
    return { ok: false, message: "Supported project types are website and node-api." };
  }
  const name = safeProjectName(args.name);
  const description = String(args.description || "A starter project").trim().slice(0, 240);
  let files;
  if (type === "website") {
    files = {
      "index.html": `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(name)}</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main class="hero">
    <p class="eyebrow">${escapeHtml(name)}</p>
    <h1>${escapeHtml(description)}</h1>
    <p class="intro">A clean starting point. Replace this content with your product story.</p>
    <a class="button" href="#about">Explore the project</a>
  </main>
  <section id="about" class="section">
    <h2>Built for your next idea</h2>
    <p>Start small, test the experience, and improve it with real feedback.</p>
  </section>
  <script src="./app.js" defer></script>
</body>
</html>
`,
      "styles.css": `:root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; background: #090b14; color: #f4f5fb; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 75% 20%, #25204a, #090b14 55%); }
.hero { min-height: 75vh; display: grid; align-content: center; justify-items: start; padding: clamp(2rem, 8vw, 8rem); }
.eyebrow { color: #bda3ff; text-transform: uppercase; letter-spacing: .2em; font-size: .8rem; }
h1 { max-width: 900px; font-size: clamp(2.5rem, 7vw, 6rem); line-height: 1.02; margin: .3em 0; }
.intro, .section p { max-width: 650px; color: #c1c5d8; line-height: 1.7; }
.button { display: inline-block; margin-top: 1rem; padding: .9rem 1.2rem; border-radius: 999px; background: #9b5cff; color: white; text-decoration: none; font-weight: 700; }
.section { padding: 3rem clamp(2rem, 8vw, 8rem); border-top: 1px solid #ffffff1f; }
`,
      "app.js": `document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});
`,
      "README.md": `# ${name}

${description}

## Run locally

Open `index.html` in a browser or use a local static file server.

## Files

- `index.html`: semantic page structure
- `styles.css`: responsive visual styling
- `app.js`: small interaction layer

This is a starter scaffold, not a production-ready deployment. Review accessibility, content, and browser behavior before publishing.
`
    };
  } else {
    files = {
      "package.json": JSON.stringify({
        name,
        version: "1.0.0",
        private: true,
        description,
        scripts: { start: "node src/server.js", test: "node --test" },
        dependencies: { express: "^4.21.1" }
      }, null, 2) + "\n",
      "src/server.js": `const express = require("express");

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "${name}" }));
app.get("/", (_req, res) => res.json({ name: "${name}", description: ${JSON.stringify(description)} }));

app.listen(port, () => console.log(`Server listening on port ${port}`));
`,
      "test/health.test.js": `const test = require("node:test");
const assert = require("node:assert/strict");

test("health endpoint contract", () => {
  const response = { ok: true, service: "${name}" };
  assert.equal(response.ok, true);
  assert.equal(response.service, "${name}");
});
`,
      ".gitignore": `node_modules/
.env
.env.*
!.env.example
coverage/
`,
      ".env.example": `PORT=3000
`,
      "README.md": `# ${name}

${description}

## Setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to a local `.env` if needed.
4. Run `npm start`.

## Endpoints

- `GET /`: service information
- `GET /health`: health check

Never commit real secrets. Add authentication, validation, logging, and integration tests before exposing this service publicly.
`
    };
  }

  return {
    ok: true,
    type,
    name,
    description,
    planning_only: false,
    generated_files: Object.keys(files),
    files,
    next_steps: [
      "Review the generated starter files.",
      "Write the files into a dedicated project folder using an approved file-writing workflow.",
      "Run tests and inspect the result before deployment.",
      "Ask for explicit confirmation before publishing or deploying."
    ],
    message: "Starter source generated in memory. No files were written to disk and nothing was deployed."
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[char]);
}

module.exports = { generateProjectBlueprint, safeProjectName, PROJECT_TYPES };
