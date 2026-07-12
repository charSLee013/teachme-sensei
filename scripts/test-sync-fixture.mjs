#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const syncScript = resolve(repoRoot, "scripts/sync-teaching-packages.mjs");

function write(root, path, content) {
  const full = join(root, path);
  mkdirSync(resolve(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

function html(title) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body><main><h1>${title}</h1><p>fixture content</p></main></body></html>\n`;
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "teachme-sync-fixture-"));
  write(root, "ideogram4/assets/ideogram_logo.svg", "<svg></svg>\n");
  write(root, "anima_learning/README.md", "# Anima fixture\n");
  write(root, "anima_learning/course-map.md", "# Anima map\n");
  for (const file of ["01-what-is-anima", "02-architecture", "03-training-boundaries", "04-prompting", "05-evaluation"]) write(root, `anima_learning/lessons/${file}.md`, `# ${file}\n`);
  for (const file of ["formulas", "methodology", "resources"]) write(root, `anima_learning/reference/${file}.md`, `# ${file}\n`);

  write(root, "flux2/course-map.html", html("FLUX map"));
  for (let i = 1; i <= 12; i += 1) write(root, `flux2/lessons/${String(i).padStart(4, "0")}-lesson.html`, html(`FLUX lesson ${i}`));
  for (const file of [
    "0001-flux2-training-glossary.html",
    "0002-flux2-latent-contract-map.html",
    "0003-training-gap-checklist.html",
    "0004-model-family-and-license-matrix.html",
    "0005-object-and-contract-quick-reference.html",
    "0006-research-route-decision-tree.html",
  ]) write(root, `flux2/reference/${file}`, html(`FLUX ${file}`));

  write(root, "ideogram4/paper-course/index.html", html("Ideogram entry"));
  write(root, "ideogram4/paper-course/paper.css", "body { color: black; }\n");
  write(root, "ideogram4/paper-course/paper.js", "console.log('fixture');\n");
  for (const file of [
    "01-model-card.html",
    "02-cli-api-contract.html",
    "03-token-packing.html",
    "04-sampling-cfg.html",
    "05-transformer-architecture.html",
    "06-json-caption-protocol.html",
    "07-training-public-record.html",
  ]) write(root, `ideogram4/paper-course/${file}`, html(`Ideogram ${file}`));
  write(root, "ideogram4/paper-course/appendix/evidence.html", html("Ideogram evidence"));
  write(root, "ideogram4/paper-course/appendix/module-index.html", html("Ideogram modules"));

  write(root, "lingbot-video-course/index.html", html("LingBot entry"));
  for (let i = 1; i <= 11; i += 1) write(root, `lingbot-video-course/lessons/${String(i).padStart(2, "0")}-lesson.html`, html(`LingBot lesson ${i}`));
  for (let i = 1; i <= 5; i += 1) write(root, `lingbot-video-course/reference/${String(i).padStart(2, "0")}-reference.html`, html(`LingBot reference ${i}`));
  write(root, "lingbot-video-course/assets/course.css", "body { color: black; }\n");
  write(root, "lingbot-video-course/assets/course-runtime.js", "export {};\n");
  write(root, "lingbot-video-course/assets/page-configs.js", "export {};\n");
  write(root, "lingbot-video-course/assets/ogl-bridge.js", "export {};\n");

  write(root, "pi/teach/index.html", html("Pi entry"));
  write(root, "pi/teach/course-map.html", html("Pi map"));
  write(root, "pi/teach/assets/style.css", "body { color: black; }\n");
  write(root, "pi/teach/assets/js/app.js", "document.documentElement.dataset.fixture = 'true';\n");
  const piNames = [
    "01-what-is-pi", "02-monorepo", "03-pi-ai", "04-agent-core", "05-pi-tui", "06-coding-agent", "07-tools", "08-extensions",
    "09-session-management", "10-compaction", "11-interactive-mode", "12-sdk", "13-orchestrator", "14-contributing",
  ];
  for (const name of piNames) write(root, `pi/teach/chapters/${name}.html`, html(`Pi ${name}`));
  return root;
}

function run(args, env = {}) {
  const result = spawnSync(process.execPath, [syncScript, ...args], { cwd: repoRoot, env: { ...process.env, ...env }, encoding: "utf8" });
  return { ...result, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function expectExit(result, code, label) {
  if (result.status !== code) throw new Error(`${label}: expected exit ${code}, got ${result.status}\n${result.output}`);
}

function treeHash(root, ignored = []) {
  const ignoredSet = new Set(ignored);
  const files = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) {
        const path = relative(root, full).split(sep).join("/");
        if (!ignoredSet.has(path)) files.push(path);
      }
    }
  }
  visit(root);
  const hash = createHash("sha256");
  for (const path of files.sort()) {
    hash.update(path);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(join(root, path)));
    hash.update(Buffer.from("\n"));
  }
  return hash.digest("hex");
}

function runFixture() {
  const source = createFixture();
  const alternate = createFixture();
  const work = mkdtempSync(join(tmpdir(), "teachme-sync-test-"));
  const lock = join(work, "source-lock.json");
  const out = join(work, "out");
  const out2 = join(work, "out-2");
  mkdirSync(out, { recursive: true });
  mkdirSync(out2, { recursive: true });
  writeFileSync(join(out, "keep.txt"), "unowned\n");
  const base = ["--write", "--update-lock", "--source-root", source, "--source-lock", lock, "--output-root", out];
  expectExit(run(["--check", "--source-root", join(work, "missing")]), 2, "missing root");
  expectExit(run(["--check", "--source-root", source], { TEACHING_SOURCE_ROOT: alternate }), 2, "conflicting root");
  expectExit(run(base), 0, "initial fixture write");
  if (!existsSync(join(out, "keep.txt"))) throw new Error("unowned output file was removed");
  expectExit(run(["--check", "--source-root", source, "--source-lock", lock, "--output-root", out]), 0, "fixture check");
  write(source, "pi/teach/chapters/10-compaction.html", `${html("changed")}changed\n`);
  const beforeMismatch = treeHash(out, ["keep.txt"]);
  expectExit(run(["--check", "--source-root", source, "--source-lock", lock, "--output-root", out]), 1, "lock mismatch");
  if (treeHash(out, ["keep.txt"]) !== beforeMismatch) throw new Error("lock mismatch changed output");
  expectExit(run(["--write", "--update-lock", "--source-root", source, "--source-lock", lock, "--output-root", out]), 0, "updated fixture write");
  expectExit(run(["--write", "--source-root", source, "--source-lock", lock, "--output-root", out2]), 0, "second fixture write");
  if (treeHash(out, ["keep.txt"]) !== treeHash(out2)) throw new Error("identical fixture inputs produced different output bytes");
  const sourceLink = join(source, "pi/teach/assets/style.css");
  rmSync(sourceLink);
  symlinkSync(join(source, "pi/teach/assets/js/app.js"), sourceLink);
  expectExit(run(["--check", "--source-root", source, "--source-lock", lock, "--output-root", out2]), 2, "symlink rejection");
  rmSync(source, { recursive: true, force: true });
  rmSync(alternate, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
  console.log("[OK] sync fixture: missing/conflict/lock/symlink/rollback-preservation/double-write cases");
}

try {
  runFixture();
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
}
