#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowPath = resolve(process.cwd(), process.argv[2] ?? ".github/workflows/static.yml");
const source = readFileSync(workflowPath, "utf8");

function fail(message) {
  throw new Error(message);
}

function jobSection(name) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${name}:`);
  if (start === -1) fail(`missing job: ${name}`);
  const body = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [a-z][a-z0-9_-]*:\s*$/.test(lines[index])) break;
    body.push(lines[index]);
  }
  return body.join("\n");
}

function requireText(section, text, label) {
  if (!section.includes(text)) fail(`${label} is missing: ${text}`);
}

function requireJobNeeds(name, value) {
  const section = jobSection(name);
  requireText(section, value, `${name}.needs`);
}

try {
  if (/sync-teaching-packages|TEACHING_SOURCE_ROOT|TEACHING_SOURCE_LOCK/.test(source)) fail("workflow must not invoke or depend on source sync");
  const forbiddenTempPath = [String.fromCharCode(47), "tmp"].join("");
  if (source.includes(forbiddenTempPath)) fail("workflow contains a forbidden temporary-path literal");

  const staticJob = jobSection("static");
  requireText(staticJob, "actions/checkout@v4", "static checkout");
  requireText(staticJob, "actions/setup-node@v4", "static setup-node");
  requireText(staticJob, "node-version: 22.23.1", "static node version");
  requireText(staticJob, "run: npm ci", "static npm ci");
  requireText(staticJob, "npx playwright install --with-deps chromium", "static Chromium install");
  requireText(staticJob, "run: npm run verify:public", "static public verification");
  requireText(staticJob, "run: npm run test:sync-fixture", "static fixture verification");

  const smokeJob = jobSection("smoke");
  requireJobNeeds("smoke", "    needs: static");
  requireText(smokeJob, "actions/checkout@v4", "smoke checkout");
  requireText(smokeJob, "actions/setup-node@v4", "smoke setup-node");
  requireText(smokeJob, "run: npm ci", "smoke npm ci");
  requireText(smokeJob, "npx playwright install --with-deps chromium", "smoke Chromium install");
  requireText(smokeJob, "python3 -m http.server 4173 --directory docs", "smoke HTTP server");
  requireText(smokeJob, "run: npm run smoke:public", "smoke runner");

  const reportJob = jobSection("report");
  requireJobNeeds("report", "    needs: [static, smoke]");
  requireText(reportJob, "    if: always()", "report always condition");
  requireText(reportJob, "actions/download-artifact@v4", "report artifact download");
  requireText(reportJob, "id: upload-smoke-artifacts", "report upload step id");
  requireText(reportJob, "name: public-site-smoke", "report artifact name");
  requireText(reportJob, "if-no-files-found: error", "report missing-artifact policy");
  requireText(reportJob, "steps.upload-smoke-artifacts.outcome", "report upload gate");

  const deployJob = jobSection("deploy");
  requireJobNeeds("deploy", "    needs: [static, smoke, report]");
  requireText(deployJob, "if: needs.static.result == 'success' && needs.smoke.result == 'success' && needs.report.result == 'success'", "deploy gate");
  requireText(deployJob, "actions/upload-pages-artifact@v5", "Pages artifact upload");
  requireText(deployJob, "actions/deploy-pages@v5", "Pages deployment");
  if ((source.match(/actions\/upload-pages-artifact@v5/g) ?? []).length !== 1) fail("Pages artifact upload must exist only in deploy");
  if ((source.match(/actions\/deploy-pages@v5/g) ?? []).length !== 1) fail("Pages deployment must exist only in deploy");

  console.log("[OK] workflow graph static -> smoke -> report -> deploy");
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
}
