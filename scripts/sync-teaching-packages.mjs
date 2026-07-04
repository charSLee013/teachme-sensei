#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const copies = [
  {
    label: "Pi repo course",
    from: "/tmp/pi/teach",
    to: "docs/teach/pi",
  },
  {
    label: "Ideogram 4 paper course",
    from: "/tmp/ideogram4/paper-course",
    to: "docs/teach/ideogram4",
  },
  {
    label: "Ideogram 4 course manifest",
    from: "/tmp/ideogram4/manifest.paper-course.json",
    to: "docs/teach/ideogram4/manifest.paper-course.json",
  },
  {
    label: "Ideogram 4 proof",
    from: "/tmp/ideogram4/proof",
    to: "docs/teach/ideogram4/proof",
  },
  {
    label: "Ideogram 4 review artifacts",
    from: "/tmp/ideogram4/artifacts",
    to: "docs/teach/ideogram4/review-artifacts",
  },
];

function assertExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${path}`);
  }
}

function copyPath({ label, from, to }) {
  const source = resolve(from);
  const target = resolve(repoRoot, to);

  assertExists(source, label);
  mkdirSync(dirname(target), { recursive: true });
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  console.log(`[sync] ${label}: ${source} -> ${target}`);
}

for (const item of copies) {
  copyPath(item);
}

writeFileSync(resolve(repoRoot, "docs/.nojekyll"), "");
console.log("[sync] wrote docs/.nojekyll");
