const fs = require("fs");
const path = require("path");
const readline = require("readline");

const API_URL = String(process.env.AUREX_API_URL || "https://aurex-api-cvpd.onrender.com").replace(/\/$/, "");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("\nAurex Desktop Agent Pairing\n");
  console.log(`Server: ${API_URL}\n`);

  const email = (await ask("Aurex email: ")).trim();
  const password = await ask("Aurex password: ");
  const name = (await ask("Device name [My Windows PC]: ")).trim() || "My Windows PC";
  rl.close();

  const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const login = await loginResponse.json();
  if (!loginResponse.ok || !login.token) {
    throw new Error(login.error || "Login failed");
  }

  const pairResponse = await fetch(`${API_URL}/api/desktop/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${login.token}`
    },
    body: JSON.stringify({ name })
  });

  const pair = await pairResponse.json();
  if (!pairResponse.ok || !pair.token) {
    throw new Error(pair.error || "Desktop pairing failed");
  }

  const envPath = path.join(__dirname, ".env");
  fs.writeFileSync(
    envPath,
    `AUREX_API_URL=${API_URL}\nAUREX_DEVICE_TOKEN=${pair.token}\n`,
    { encoding: "utf8", mode: 0o600 }
  );

  console.log(`\nPaired successfully: ${pair.device.name}`);
  console.log(`Saved secure device configuration to ${envPath}`);
  console.log("You can now start the agent with: npm run desktop-agent\n");
}

main().catch((error) => {
  rl.close();
  console.error(`\nPairing failed: ${error.message}`);
  process.exit(1);
});
