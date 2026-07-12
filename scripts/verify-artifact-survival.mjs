#!/usr/bin/env node

import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { mkdirSync, lstatSync, readFileSync, writeFileSync } from "node:fs";

function parseArgs(argv) {
  let target = process.cwd();
  let output = ".codex/governance/final-check.json";
  let manifest;
  const required = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target" || arg === "--output" || arg === "--manifest" || arg === "--require-path") {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      if (arg === "--target") target = value;
      else if (arg === "--output") output = value;
      else if (arg === "--manifest") manifest = value;
      else required.push(value);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (required.length === 0) throw new Error("at least one --require-path is required");
  return { target: resolve(target), output, manifest, required };
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

try {
  const { target, output, manifest, required } = parseArgs(process.argv.slice(2));
  const entries = required.map((relative) => {
    const path = resolve(target, relative);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`required artifact is not a regular file: ${relative}`);
    if (stat.size === 0) throw new Error(`required artifact is empty: ${relative}`);
    return { path: relative, bytes: stat.size, sha256: sha256(path) };
  });
  const report = { schema: 1, status: "passed", target, requiredPaths: entries };
  const outputPath = resolve(target, output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  if (manifest) {
    const manifestPath = resolve(target, manifest);
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, `${JSON.stringify({
      generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      target,
      docs_dir: resolve(target, "docs"),
      required_paths: entries,
      artifact_survival_report: output,
      artifact_survival: report,
      generator: "scripts/verify-artifact-survival.mjs (local fallback; shared finalizer helper unavailable)",
    }, null, 2)}\n`);
  }
  console.log(`[OK] artifact survival: ${entries.length} required files; report=${outputPath}`);
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
}
