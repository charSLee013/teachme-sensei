#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const workflowDir = resolve(repoRoot, ".github/workflows");
const workflowPath = resolve(repoRoot, process.argv[2] ?? ".github/workflows/pages.yml");
const source = readFileSync(workflowPath, "utf8");

function fail(message) {
  throw new Error(message);
}

function jobNames() {
  const lines = source.split(/\r?\n/);
  const jobsStart = lines.findIndex((line) => line === "jobs:");
  if (jobsStart === -1) fail("workflow is missing jobs");
  return lines
    .slice(jobsStart + 1)
    .filter((line) => /^  [a-z][a-z0-9_-]*:\s*$/.test(line))
    .map((line) => line.trim().slice(0, -1));
}

function requireText(text, label) {
  if (!source.includes(text)) fail(`${label} is missing: ${text}`);
}

try {
  const workflows = readdirSync(workflowDir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort();
  if (JSON.stringify(workflows) !== JSON.stringify([basename(workflowPath)])) {
    fail(`expected one workflow (${basename(workflowPath)}), found: ${workflows.join(", ")}`);
  }
  if (JSON.stringify(jobNames()) !== JSON.stringify(["deploy"])) fail("workflow must contain exactly one deploy job");

  requireText("branches:\n      - master", "master push trigger");
  requireText("workflow_dispatch:", "manual trigger");
  requireText("contents: read", "contents permission");
  requireText("pages: write", "Pages permission");
  requireText("id-token: write", "OIDC permission");
  requireText("name: github-pages", "Pages environment");
  requireText("url: ${{ steps.deployment.outputs.page_url }}", "deployment URL");
  requireText("path: docs", "Pages source directory");
  requireText("include-hidden-files: true", "hidden file upload");

  const expectedActions = [
    "actions/checkout@v4",
    "actions/configure-pages@v6",
    "actions/upload-pages-artifact@v5",
    "actions/deploy-pages@v5",
  ];
  const actualActions = [...source.matchAll(/^\s+uses:\s+([^\s]+)\s*$/gm)].map((match) => match[1]);
  if (JSON.stringify(actualActions) !== JSON.stringify(expectedActions)) {
    fail(`workflow action sequence mismatch: ${actualActions.join(" -> ")}`);
  }

  const forbiddenKeys = [...source.matchAll(/^\s+(run|needs|if|continue-on-error|strategy):/gm)].map((match) => match[1]);
  if (forbiddenKeys.length) fail(`deploy workflow contains execution branches: ${[...new Set(forbiddenKeys)].join(", ")}`);
  if (/setup-node|npm\s|source sync|sync-teaching-packages|upload-artifact|download-artifact/i.test(
    source.replaceAll("upload-pages-artifact", "pages-artifact"),
  )) fail("deploy workflow contains development or report tooling");

  console.log("[OK] workflow: one deploy job, one Pages artifact, four ordered actions");
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
}
