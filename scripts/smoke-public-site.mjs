#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const cli = resolve(repoRoot, "node_modules/@playwright/test/cli.js");
if (!existsSync(cli)) {
  console.error("[FAIL] Playwright is not installed; run npm ci first");
  process.exit(2);
}
const result = spawnSync(process.execPath, [cli, "test", ...process.argv.slice(2)], { cwd: repoRoot, stdio: "inherit" });
process.exitCode = result.status ?? 1;
