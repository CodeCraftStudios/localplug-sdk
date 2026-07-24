#!/usr/bin/env node
/**
 * `npx localplug <command>` — the site CLI.
 *
 *   localplug build            build + CDN deploy (see cli/build.js)
 *     --skip-build             upload the existing .next without rebuilding
 *     --dry-run                diff only; no upload, no activation
 *     --no-activate            upload but don't flip the active deployment
 *   localplug status           the site's active CDN deployment + prefix
 */

import { run as runBuild } from "./build.js";
import { loadConfig } from "./config.js";
import { createApi } from "./api.js";
import { formatBytes } from "./uploader.js";

const [, , command, ...args] = process.argv;

async function status() {
  const cfg = loadConfig();
  const api = createApi(cfg);
  const res = await api.status();
  console.log(`asset prefix  ${res.asset_prefix}`);
  if (!res.active) {
    console.log("no active deployment yet — run `npx localplug build`");
    return;
  }
  const a = res.active;
  console.log(
    `active        ${a.deploy_id} · ${a.total_files} files · ${formatBytes(a.total_bytes)} · activated ${a.activated_at}`,
  );
  for (const d of res.recent ?? []) {
    if (d.deploy_id !== a.deploy_id) {
      console.log(`  ${d.status.padEnd(10)} ${d.deploy_id} · ${d.created_at}`);
    }
  }
}

try {
  if (command === "build") await runBuild(args);
  else if (command === "status") await status();
  else {
    console.log("Usage: npx localplug <build|status> [--skip-build --dry-run --no-activate]");
    process.exit(command ? 1 : 0);
  }
} catch (e) {
  console.error(`error: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
