/**
 * Prints LAN URLs for phone testing, then runs `next dev -H 0.0.0.0`.
 * Usage: npm run dev:mobile   (or: node scripts/dev-mobile.cjs)
 */
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const port = process.env.PORT || "3000";

function lanIps() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        out.push(net.address);
      }
    }
  }
  return [...new Set(out)].sort();
}

const cyan = "\x1b[36m";
const bold = "\x1b[1m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";

const ips = lanIps();

console.log("");
console.log(`  ${bold}aapi — dev${reset}  ${dim}(same Wi‑Fi as this machine)${reset}`);
console.log("");
console.log(`  ${bold}This computer:${reset}  ${cyan}http://localhost:${port}${reset}`);
if (ips.length) {
  console.log(`  ${bold}Phone / tablet:${reset}`);
  for (const ip of ips) {
    console.log(`             ${cyan}http://${ip}:${port}${reset}`);
  }
} else {
  console.log(
    `  ${dim}(No LAN IPv4 found — connect to Wi‑Fi or run ipconfig / ifconfig.)${reset}`
  );
}
console.log("");
console.log(
  `  ${dim}If your phone can’t open the LAN URL: same Wi‑Fi, disable VPN, and allow inbound TCP ${port} (macOS Firewall / Little Snitch / router).${reset}`
);
console.log("");

const child = spawn(
  process.execPath,
  [
    path.join(root, "node_modules", "next", "dist", "bin", "next"),
    "dev",
    "-H",
    "0.0.0.0",
    "-p",
    port,
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PORT: port },
  }
);

function forward(sig) {
  try {
    child.kill(sig);
  } catch {
    /* ignore */
  }
}
["SIGINT", "SIGTERM", "SIGHUP"].forEach((sig) => {
  process.on(sig, () => forward(sig));
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
