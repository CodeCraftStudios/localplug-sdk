/**
 * CLI config — resolved from the site's env files, the same variables the SDK
 * runtime already uses:
 *
 *   LPS_SITE_KEY   the site's SECRET key (dfd-site-secret-…). Deploys are a
 *                  server-side act; the public key cannot deploy.
 *   LPS_API_URL    defaults to https://api.dashfordevs.com
 *
 * Reads process.env first, then .env.local / .env in the working directory —
 * `next dev`-style resolution without depending on dotenv.
 */

import fs from "node:fs";
import path from "node:path";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    // Strip optional surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function loadConfig(cwd = process.cwd()) {
  const fileEnv = {
    ...parseEnvFile(path.join(cwd, ".env")),
    ...parseEnvFile(path.join(cwd, ".env.local")),
  };
  const get = (name) => process.env[name] || fileEnv[name] || "";

  const apiKey = get("LPS_SITE_KEY");
  if (!apiKey) {
    throw new Error("LPS_SITE_KEY is not set (checked env, .env.local, .env)");
  }
  if (!apiKey.startsWith("dfd-site-secret-")) {
    throw new Error("LPS_SITE_KEY must be the site's SECRET key — deploys can't run on the public key");
  }

  return {
    cwd,
    apiKey,
    apiUrl: (get("LPS_API_URL") || "https://api.dashfordevs.com").replace(/\/$/, ""),
    buildDir: ".next",
    publicDir: "public",
  };
}
