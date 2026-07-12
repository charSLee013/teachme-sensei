#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildSearchIndex, writeSearchIndex } from "./generate-pi-search-index.mjs";
import { normalizePiPages } from "./normalize-pi-pages.mjs";
import { normalizePublicMetadata } from "./normalize-public-metadata.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = resolve(repoRoot, "docs");
const defaultLockPath = resolve(repoRoot, "scripts/teaching-source-lock.json");
const canonicalFaviconPath = resolve(repoRoot, "scripts/canonical-favicon.svg");

export const PACKAGE_DEFINITIONS = [
  {
    id: "anima",
    sourcePath: "anima_learning",
    outputPath: "teach/anima",
    include: ["README.md", "course-map.md", "lessons/", "reference/"],
  },
  {
    id: "flux2",
    sourcePath: "flux2",
    outputPath: "teach/flux2",
    include: [
      "course-map.html",
      "lessons/",
      "reference/0001-flux2-training-glossary.html",
      "reference/0002-flux2-latent-contract-map.html",
      "reference/0003-training-gap-checklist.html",
      "reference/0004-model-family-and-license-matrix.html",
      "reference/0005-object-and-contract-quick-reference.html",
      "reference/0006-research-route-decision-tree.html",
    ],
  },
  {
    id: "ideogram4",
    sourcePath: "ideogram4/paper-course",
    outputPath: "teach/ideogram4",
    include: [
      "index.html",
      "paper.css",
      "paper.js",
      "01-model-card.html",
      "02-cli-api-contract.html",
      "03-token-packing.html",
      "04-sampling-cfg.html",
      "05-transformer-architecture.html",
      "06-json-caption-protocol.html",
      "07-training-public-record.html",
      "appendix/",
    ],
  },
  {
    id: "lingbot-video",
    sourcePath: "lingbot-video-course",
    outputPath: "teach/lingbot-video",
    include: [
      "index.html",
      "lessons/",
      "reference/",
      "assets/course.css",
      "assets/course-runtime.js",
      "assets/page-configs.js",
      "assets/ogl-bridge.js",
    ],
  },
  {
    id: "pi",
    sourcePath: "pi/teach",
    outputPath: "teach/pi",
    include: ["index.html", "course-map.html", "assets/", "chapters/"],
  },
];

export const SHARED_FILES = [
  {
    id: "ideogram-logo",
    sourcePath: "ideogram4/assets/ideogram_logo.svg",
    outputPath: "teach/assets/ideogram_logo.svg",
  },
];

export const SYNC_OWNED_PATHS = [
  ".nojekyll",
  "teach/anima/",
  "teach/assets/favicon.svg",
  "teach/assets/ideogram_logo.svg",
  "teach/flux2/",
  "teach/ideogram4/",
  "teach/lingbot-video/",
  "teach/pi/",
];

const EXIT = { ok: 0, mismatch: 1, input: 2 };

class SyncError extends Error {
  constructor(message, code = EXIT.input) {
    super(message);
    this.code = code;
  }
}

function assertRelative(value, label) {
  if (!value || value.includes("\\") || value.includes("\0") || value.startsWith("/") || normalize(value).startsWith("../") || normalize(value) === "..") {
    throw new SyncError(`${label} is not a safe POSIX-relative path: ${value}`);
  }
}

function assertRegular(path, label) {
  let info;
  try {
    info = lstatSync(path);
  } catch {
    throw new SyncError(`${label} does not exist: ${path}`);
  }
  if (info.isSymbolicLink()) throw new SyncError(`${label} is a symlink: ${path}`);
  if (!info.isFile() && !info.isDirectory()) throw new SyncError(`${label} is not a regular file or directory: ${path}`);
  return info;
}

function assertContained(root, path, label) {
  const rootReal = `${realpathSync(root)}${sep}`;
  const pathReal = realpathSync(path);
  if (pathReal !== rootReal.slice(0, -1) && !pathReal.startsWith(rootReal)) throw new SyncError(`${label} escapes root: ${path}`);
}

function walkRegularFiles(root, current = root, result = []) {
  assertContained(root, current, "source path");
  const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = join(current, entry.name);
    assertRegular(full, "source entry");
    if (entry.isDirectory()) walkRegularFiles(root, full, result);
    else result.push(full);
  }
  return result;
}

function selectedFiles(sourceRoot, pkg) {
  const packageRoot = resolve(sourceRoot, pkg.sourcePath);
  assertRelative(pkg.sourcePath, `${pkg.id}.sourcePath`);
  assertRegular(packageRoot, `${pkg.id} source package`);
  const records = new Map();
  for (const include of pkg.include) {
    assertRelative(include.replace(/\/$/, ""), `${pkg.id}.include`);
    const isDirectory = include.endsWith("/");
    const relativePath = isDirectory ? include.slice(0, -1) : include;
    const sourcePath = resolve(packageRoot, relativePath);
    assertContained(packageRoot, sourcePath, `${pkg.id} include`);
    const info = assertRegular(sourcePath, `${pkg.id}:${include}`);
    const files = info.isDirectory() ? walkRegularFiles(packageRoot, sourcePath) : [sourcePath];
    for (const file of files) {
      const path = relative(packageRoot, file).split(sep).join("/");
      if (records.has(path)) throw new SyncError(`${pkg.id} include overlap: ${path}`);
      records.set(path, file);
    }
  }
  return [...records.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([path, sourcePath]) => ({ path, sourcePath }));
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function treeHash(files, key = "path") {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a[key].localeCompare(b[key]))) {
    hash.update(Buffer.from(file[key]));
    hash.update(Buffer.from([0]));
    hash.update(Buffer.from(file.sha256));
    hash.update(Buffer.from("\n"));
  }
  return hash.digest("hex");
}

function fileRecord(path, sourcePath) {
  const bytes = statSync(sourcePath).size;
  return { path, bytes, sha256: sha256File(sourcePath), sourcePath };
}

export function buildSourceLock(sourceRoot) {
  const packages = PACKAGE_DEFINITIONS.map((pkg) => {
    const files = selectedFiles(sourceRoot, pkg).map(({ path, sourcePath }) => fileRecord(path, sourcePath));
    return {
      schema: undefined,
      id: pkg.id,
      sourcePath: pkg.sourcePath,
      outputPath: pkg.outputPath,
      include: [...pkg.include].sort(),
      files: files.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
      treeSha256: treeHash(files),
    };
  }).map(({ schema: _schema, ...pkg }) => pkg);
  const sharedFiles = SHARED_FILES.map((shared) => {
    const sourcePath = resolve(sourceRoot, shared.sourcePath);
    assertRelative(shared.sourcePath, `${shared.id}.sourcePath`);
    assertRegular(sourcePath, `${shared.id} source file`);
    assertContained(sourceRoot, sourcePath, `${shared.id} source file`);
    const record = fileRecord(shared.outputPath, sourcePath);
    return { id: shared.id, sourcePath: shared.sourcePath, outputPath: shared.outputPath, bytes: record.bytes, sha256: record.sha256 };
  }).sort((a, b) => a.outputPath.localeCompare(b.outputPath));
  return {
    schema: 1,
    hashAlgorithm: "sha256-raw-bytes",
    pathEncoding: "posix-relative",
    packages,
    sharedFiles,
    sharedTreeSha256: treeHash(sharedFiles, "outputPath"),
  };
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readLock(lockPath) {
  if (!existsSync(lockPath)) throw new SyncError(`source lock does not exist: ${lockPath}`);
  try {
    const parsed = JSON.parse(readFileSync(lockPath, "utf8"));
    const expectedKeys = ["hashAlgorithm", "packages", "pathEncoding", "schema", "sharedFiles", "sharedTreeSha256"];
    if (JSON.stringify(Object.keys(parsed).sort()) !== JSON.stringify(expectedKeys) || parsed.schema !== 1) throw new Error("schema mismatch");
    return parsed;
  } catch (error) {
    throw new SyncError(`source lock is invalid: ${error.message}`);
  }
}

function ensureLockMatches(lockPath, computed) {
  const actual = readLock(lockPath);
  if (stableJson(actual) !== stableJson(computed)) throw new SyncError(`source lock does not match source bytes: ${lockPath}`, EXIT.mismatch);
}

function parseArgs(argv) {
  let mode = null;
  let sourceRootArg;
  let sourceLockArg;
  let outputRootArg;
  let updateLock = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check" || arg === "--write") {
      if (mode) throw new SyncError("exactly one of --check or --write is required");
      mode = arg.slice(2);
    } else if (["--source-root", "--source-lock", "--output-root"].includes(arg)) {
      if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) throw new SyncError(`${arg} requires a value`);
      if (arg === "--source-root") {
        if (sourceRootArg !== undefined) throw new SyncError("duplicate --source-root");
        sourceRootArg = argv[++index];
      } else if (arg === "--source-lock") {
        if (sourceLockArg !== undefined) throw new SyncError("duplicate --source-lock");
        sourceLockArg = argv[++index];
      } else {
        if (outputRootArg !== undefined) throw new SyncError("duplicate --output-root");
        outputRootArg = argv[++index];
      }
    } else if (arg === "--update-lock") {
      if (updateLock) throw new SyncError("duplicate --update-lock");
      updateLock = true;
    } else {
      throw new SyncError(`unknown argument: ${arg}`);
    }
  }
  if (!mode) throw new SyncError("exactly one of --check or --write is required");
  if (updateLock && mode !== "write") throw new SyncError("--update-lock requires --write");
  return { mode, sourceRootArg, sourceLockArg, outputRootArg, updateLock };
}

function inputPath(raw, label) {
  const path = resolve(repoRoot, raw);
  assertRegular(path, label);
  if (lstatSync(path).isSymbolicLink()) throw new SyncError(`${label} is a symlink: ${path}`);
  return realpathSync(path);
}

function chooseSourceRoot(cliValue) {
  const envValue = process.env.TEACHING_SOURCE_ROOT;
  if (cliValue && envValue) {
    const cli = inputPath(cliValue, "source root");
    const env = inputPath(envValue, "source root");
    if (cli !== env) throw new SyncError("--source-root conflicts with TEACHING_SOURCE_ROOT");
    return cli;
  }
  const value = cliValue ?? envValue;
  if (!value) throw new SyncError("source root is required via --source-root or TEACHING_SOURCE_ROOT");
  const root = inputPath(value, "source root");
  if (!statSync(root).isDirectory()) throw new SyncError(`source root is not a directory: ${root}`);
  return root;
}

function chooseOutputRoot(raw) {
  const path = raw ? inputPath(raw, "output root") : realpathSync(docsRoot);
  if (!statSync(path).isDirectory()) throw new SyncError(`output root is not a directory: ${path}`);
  if (path === repoRoot) throw new SyncError("output root cannot be the repository root");
  return path;
}

function chooseLockPath(cliValue) {
  const raw = cliValue ?? process.env.TEACHING_SOURCE_LOCK;
  return raw ? resolve(repoRoot, raw) : defaultLockPath;
}

function copySelectedPackage(sourceRoot, stageRoot, pkg) {
  const packageRoot = resolve(sourceRoot, pkg.sourcePath);
  const targetRoot = resolve(stageRoot, pkg.outputPath);
  mkdirSync(targetRoot, { recursive: true });
  for (const { path, sourcePath } of selectedFiles(sourceRoot, pkg)) {
    const target = resolve(targetRoot, path);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(sourcePath, target);
  }
  return packageRoot;
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function slugify(text) {
  return text.toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function publicMarkdownLabel(label, href) {
  const base = href.split("#")[0].split("/").pop() ?? label;
  const known = {
    "course-map.md": "课程地图",
    "01-what-is-anima.md": "第 1 章：Anima 是什么",
    "02-architecture.md": "第 2 章：架构",
    "03-training-boundaries.md": "第 3 章：训练边界",
    "04-prompting.md": "第 4 章：提示词",
    "05-evaluation.md": "第 5 章：评估",
    "methodology.md": "方法论参考",
    "formulas.md": "公式参考",
    "resources.md": "资源参考",
  };
  return known[base] ?? label.replace(/\.md$/i, "").replace(/^.*\//, "");
}

function rewriteMarkdownLinks(value) {
  return value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    if (/^(https?:|mailto:|tel:|#)/i.test(href)) return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
    if (/^(?:\.\.\/)?artifacts\//i.test(href)) return escapeHtml(publicMarkdownLabel(label, href));
    const [path, hash = ""] = href.split("#");
    const htmlPath = path.endsWith(".md") ? `${path.slice(0, -3)}.html` : path;
    const suffix = hash ? `#${hash}` : "";
    return `<a href="${escapeHtml(htmlPath + suffix)}">${escapeHtml(publicMarkdownLabel(label, path))}</a>`;
  });
}

function inlineMarkdown(text) {
  let value = escapeHtml(text);
  value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return rewriteMarkdownLinks(value);
}

function sanitizeAnimaMarkdown(markdown, relativePath) {
  let value = markdown;
  if (relativePath === "README.md") {
    value = value.replace(/\n### 证据与实验支撑\n[\s\S]*?(?=\n## 公开事实与解释边界)/, "");
    value = value.replace("，再回到 reference 和 artifacts。", "，再回到 reference。");
  }
  if (relativePath === "lessons/05-evaluation.md") {
    value = value.replace(
      "如果你要深入论文方法论，进入 [../reference/methodology.md](../reference/methodology.md)。如果你要检查公开证据边界，进入 [../artifacts/evidence-audit.md](../artifacts/evidence-audit.md)。",
      "如果你要深入论文方法论，进入 [../reference/methodology.md](../reference/methodology.md)。公开证据边界已在课程正文中分层呈现。",
    );
  }
  return value;
}

function markdownToHtml(markdown, title, sourceRelativePath) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let inCode = false;
  let code = [];
  let inList = false;
  let inOrderedList = false;
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeLists = () => {
    if (inList) { html.push("</ul>"); inList = false; }
    if (inOrderedList) { html.push("</ol>"); inOrderedList = false; }
  };
  const flushCode = () => { html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`); code = []; };
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("```")) {
      flushParagraph(); closeLists();
      if (inCode) flushCode();
      inCode = !inCode;
      continue;
    }
    if (inCode) { code.push(rawLine); continue; }
    if (!line.trim()) { flushParagraph(); closeLists(); continue; }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph(); closeLists();
      const level = heading[1].length;
      const headingText = heading[2].trim();
      html.push(`<h${level} id="${slugify(headingText)}">${inlineMarkdown(headingText)}</h${level}>`);
      continue;
    }
    const quote = /^>\s+(.+)$/.exec(line);
    if (quote) { flushParagraph(); closeLists(); html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`); continue; }
    const unordered = /^-\s+(.+)$/.exec(line);
    if (unordered) {
      flushParagraph();
      if (inOrderedList) { html.push("</ol>"); inOrderedList = false; }
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inlineMarkdown(unordered[1])}</li>`);
      continue;
    }
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph();
      if (inList) { html.push("</ul>"); inList = false; }
      if (!inOrderedList) { html.push("<ol>"); inOrderedList = true; }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph(); closeLists(); if (inCode) flushCode();
  const depth = sourceRelativePath.split("/").length - 1;
  const homeHref = depth === 0 ? "index.html" : `${"../".repeat(depth)}index.html`;
  const catalogHref = `${"../".repeat(depth)}../`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Anima 课程</title>
  <link rel="stylesheet" href="${"../".repeat(depth)}anima.css">
</head>
<body>
  <header class="course-shell">
    <a href="${homeHref}">Anima 课程入口</a>
    <a href="${catalogHref}">Teachme Sensei 目录</a>
  </header>
  <main class="markdown-course">
${html.map((line) => `    ${line}`).join("\n")}
  </main>
</body>
</html>
`;
}

function writeAnimaCss(target) {
  const source = resolve(repoRoot, "scripts/anima.css");
  if (!existsSync(source)) throw new SyncError(`generated Anima stylesheet missing: ${source}`);
  mkdirSync(target, { recursive: true });
  cpSync(source, resolve(target, "anima.css"));
}

function syncAnima(sourceRoot, stageRoot) {
  const source = resolve(sourceRoot, "anima_learning");
  const target = resolve(stageRoot, "teach/anima");
  mkdirSync(target, { recursive: true });
  writeAnimaCss(target);
  const sourceFiles = selectedFiles(sourceRoot, PACKAGE_DEFINITIONS.find((pkg) => pkg.id === "anima"));
  for (const { path } of sourceFiles) {
    const markdown = sanitizeAnimaMarkdown(readFileSync(resolve(source, path), "utf8"), path);
    const outputPath = path === "README.md" ? "index.html" : path === "course-map.md" ? "course-map.html" : path.replace(/\.md$/i, ".html");
    const title = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? "Anima";
    const output = resolve(target, outputPath);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, markdownToHtml(markdown, title, outputPath));
  }
}

function replaceFile(target, replacer) {
  const old = readFileSync(target, "utf8");
  const next = replacer(old);
  writeFileSync(target, next.replace(/\n+$/, "\n"));
}

function sanitizeLingbot(target) {
  replaceFile(resolve(target, "assets/course.css"), (css) => `${css.replace("--muted: #657168", "--muted: #4c5a50")}\n\n.hero-placeholder {\n  height: 849px;\n  margin: 42px 0 46px;\n}\n\n[data-course-diagram] {\n  min-height: 647px;\n  margin: 22px 0 10px;\n}\n\n.story-diagram .flow-column h4,\n.story-diagram .route-arrow {\n  color: var(--accent);\n  opacity: 1;\n}\n\n.story-diagram .flow-card.is-dim {\n  opacity: 1;\n}\n\n.story-diagram .flow-card p {\n  color: var(--muted);\n  opacity: 1;\n}\n\n@media (max-width: 760px) {\n  .hero-placeholder {\n    height: 1080px;\n  }\n\n  [data-course-diagram] {\n    min-height: 900px;\n  }\n}\n`);
  replaceFile(resolve(target, "assets/course-runtime.js"), (source) => source
    .replace(
      '  anchor.insertAdjacentElement("afterend", hero);',
      '  const placeholder = article.querySelector(".hero-placeholder");\n  if (placeholder) placeholder.replaceWith(hero);\n  else anchor.insertAdjacentElement("afterend", hero);',
    )
    .replace(
      '    dpr: Math.min(window.devicePixelRatio || 1, 1.5),\n    alpha: true,\n    antialias: true,\n  });',
      '    dpr: Math.min(window.devicePixelRatio || 1, 1.5),\n    alpha: true,\n    antialias: true,\n    preserveDrawingBuffer: true,\n  });',
    )
    .replace(
      '    const width = canvas.clientWidth || 640;\n    const height = canvas.clientHeight || 460;\n    renderer.setSize(width, height);\n    camera.perspective({ aspect: width / height });',
      '    const width = canvas.parentElement?.clientWidth || canvas.clientWidth || 640;\n    const height = window.matchMedia("(max-width: 760px)").matches ? 380 : 500;\n    renderer.setSize(width, height);\n    canvas.style.width = "100%";\n    canvas.style.height = `${height}px`;\n    camera.perspective({ aspect: width / height });',
    )
    .replace(
      '    buttons.prev.disabled = index === 0;\n    buttons.next.disabled = index === heroConfig.steps.length - 1;\n  };',
      '    buttons.prev.disabled = index === 0;\n    buttons.next.disabled = index === heroConfig.steps.length - 1;\n    const canvas = hero.querySelector("canvas");\n    if (canvas) canvas.dataset.stepIndex = String(index);\n  };',
    )
    .replace(
      '  api.onStepChange(setStepUI);\n  setStepUI(api.currentStep());\n\n  buttons.intro.addEventListener',
      '  api.onStepChange(setStepUI);\n  setStepUI(api.currentStep());\n  hero.dataset.runtimeReady = "true";\n  const canvas = hero.querySelector("canvas");\n  if (canvas) canvas.dataset.runtimeReady = "true";\n\n  buttons.intro.addEventListener',
    ));
  const indexPath = resolve(target, "index.html");
  replaceFile(indexPath, (html) => {
    let next = html
      .replace('href="artifacts/source-matrix.md">source matrix', 'href="reference/model-and-paper-claims.html">model and paper claims')
      .replace('href="artifacts/repo-truth-map.md">repo truth map', 'href="reference/file-map.html">file map')
      .replace(/<p>详细证据见[\s\S]*?<\/p>/, '<p>详细证据见 <a href="reference/model-and-paper-claims.html">model and paper claims</a>、<a href="reference/file-map.html">file map</a> 和 <a href="reference/evidence-boundaries.html">evidence boundaries</a>。参数索引见 <a href="reference/cli-arguments.html">CLI arguments</a>，环境变量见 <a href="reference/environment-variables.html">environment variables</a>。</p>');
    return next;
  });
  const lesson01 = resolve(target, "lessons/01-system-map.html");
  if (existsSync(lesson01)) replaceFile(lesson01, (html) => html.replace("详细归类见 source matrix。", '详细归类见 <a href="../reference/evidence-boundaries.html">证据边界参考页</a>。'));
  const lesson04 = resolve(target, "lessons/04-runner-orchestration.html");
  if (existsSync(lesson04)) replaceFile(lesson04, (html) => html.replaceAll("静默回退", "无提示回退"));
  const lesson10 = resolve(target, "lessons/10-serving-fsdp-sglang.html");
  if (existsSync(lesson10)) replaceFile(lesson10, (html) => html.replaceAll("不可用时静默回退 diffusers", "不可用时记录 warning 并回退到 diffusers"));
  const lesson11 = resolve(target, "lessons/11-debugging-and-validation.html");
  if (existsSync(lesson11)) replaceFile(lesson11, (html) => html.replace("静态验证记录见 <code>proof/validation-log.md</code>。", '静态验证边界见 <a href="../reference/evidence-boundaries.html">证据边界参考页</a>。'));
  for (const file of htmlFiles(target)) {
    replaceFile(file, (html) => html.includes('class="hero-placeholder"')
      ? html
      : html.replace(/(<p class="meta">[\s\S]*?<\/p>)/, '$1\n    <div class="hero-placeholder" aria-hidden="true"></div>'));
  }
  for (const file of htmlFiles(target)) {
    const html = readFileSync(file, "utf8");
    if (/(?:artifacts|proof|showcases)\//i.test(html)) throw new SyncError(`LingBot public page references excluded material: ${relative(target, file)}`);
  }
}

function sanitizePi(target) {
  const canonicalApp = resolve(repoRoot, "scripts/pi-app.js");
  assertRegular(canonicalApp, "canonical Pi app");
  mkdirSync(resolve(target, "assets/js"), { recursive: true });
  cpSync(canonicalApp, resolve(target, "assets/js/app.js"));
  replaceFile(resolve(target, "assets/style.css"), (css) => css
    .replaceAll("#7a8a9a", "#94a3b8")
    .replaceAll("#e94560", "#ff7088")
    .replaceAll("#0f9b8e", "#0b756b")
    .replace(".search-results .result-item {", ".search-results .result-item {\n    display: block;\n    color: inherit;\n    text-decoration: none;")
    .replace(".search-results .result-item:hover {", ".search-results .result-item:focus-visible {\n    outline: 2px solid var(--accent-primary);\n    outline-offset: 2px;\n}\n\n.search-results .result-item:hover {"));
  for (const file of htmlFiles(target)) {
    replaceFile(file, (html) => html
      .replace(/<a\s+href="#">([^<]+)<\/a>/g, "$1")
      .replaceAll("regression: issue #1234", "regression: empty-system-prompt")
      .replaceAll("CVE-2024-xxxxx", "a dependency vulnerability")
      .replaceAll("#7a8a9a", "#94a3b8")
      .replaceAll("#e94560", "#ff7088")
      .replaceAll("#0f9b8e", "#0b756b"));
  }
}

function sanitizeFlux2(target) {
  const masterclass = resolve(target, "lessons/0003-flux2-system-masterclass.html");
  if (existsSync(masterclass)) {
    replaceFile(masterclass, (html) => html
      .replace('  <script defer src="https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.min.js"></script>\n', "")
      .replace(
        '  <script>\n    (() => {\n      const container = document.getElementById("system-viz");',
        '  <script type="module">\n    import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js";\n    window.THREE = THREE;\n    (() => {\n      const container = document.getElementById("system-viz");',
      ));
  }
}

function htmlFiles(root) {
  const files = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && extname(entry.name).toLowerCase() === ".html") files.push(full);
    }
  }
  visit(root);
  return files.sort();
}

function copyGeneratedFiles(sourceRoot, stageRoot) {
  mkdirSync(resolve(stageRoot, "teach/assets"), { recursive: true });
  cpSync(canonicalFaviconPath, resolve(stageRoot, "teach/assets/favicon.svg"));
  const logo = resolve(sourceRoot, SHARED_FILES[0].sourcePath);
  assertRegular(logo, "ideogram logo");
  cpSync(logo, resolve(stageRoot, SHARED_FILES[0].outputPath));
  writeFileSync(resolve(stageRoot, ".nojekyll"), "");
}

function createFluxEntry(stageRoot) {
  const target = resolve(stageRoot, "teach/flux2/index.html");
  const courseMap = resolve(stageRoot, "teach/flux2/course-map.html");
  if (!existsSync(courseMap)) throw new SyncError("FLUX.2 course-map.html is missing from staging");
  cpSync(courseMap, target);
}

function buildStage(sourceRoot, stageRoot) {
  mkdirSync(stageRoot, { recursive: true });
  copyGeneratedFiles(sourceRoot, stageRoot);
  for (const pkg of PACKAGE_DEFINITIONS) {
    if (pkg.id === "anima") syncAnima(sourceRoot, stageRoot);
    else {
      copySelectedPackage(sourceRoot, stageRoot, pkg);
      if (pkg.id === "flux2") createFluxEntry(stageRoot);
    }
  }
  sanitizeLingbot(resolve(stageRoot, "teach/lingbot-video"));
  sanitizePi(resolve(stageRoot, "teach/pi"));
  sanitizeFlux2(resolve(stageRoot, "teach/flux2"));
  normalizePublicMetadata({ docsRoot: stageRoot, faviconPath: resolve(stageRoot, "teach/assets/favicon.svg") });
  normalizePiPages({ piRoot: resolve(stageRoot, "teach/pi") });
  writeSearchIndex({ piRoot: resolve(stageRoot, "teach/pi") });
  validateStage(stageRoot);
}

function validateStage(stageRoot) {
  const html = htmlFiles(stageRoot);
  if (html.length !== 73) throw new SyncError(`staging HTML count is ${html.length}, expected 73 course pages`);
  for (const file of html) {
    const source = readFileSync(file, "utf8");
    if (/(?:artifacts|proof|showcases)\//i.test(source)) throw new SyncError(`staging contains excluded support path: ${file}`);
    if (!/<main\b/i.test(source) || !/<h1\b/i.test(source) || !/name="description"/i.test(source) || !/rel="icon"/i.test(source)) throw new SyncError(`staging page contract failed: ${file}`);
  }
}

function snapshot(root) {
  const files = new Map();
  for (const owned of SYNC_OWNED_PATHS) {
    const full = resolve(root, owned);
    if (!existsSync(full)) continue;
    const info = lstatSync(full);
    if (info.isSymbolicLink()) throw new SyncError(`sync-owned path is a symlink: ${full}`);
    if (info.isDirectory()) {
      for (const file of walkRegularFiles(root, full)) {
        const rel = relative(root, file).split(sep).join("/");
        files.set(rel, sha256File(file));
      }
    } else if (info.isFile()) {
      files.set(owned.replace(/\/$/, ""), sha256File(full));
    }
  }
  return files;
}

function assertSameOutput(outputRoot, stageRoot) {
  const expected = snapshot(stageRoot);
  const actual = snapshot(outputRoot);
  const paths = new Set([...expected.keys(), ...actual.keys()]);
  const differences = [...paths].sort().filter((path) => expected.get(path) !== actual.get(path));
  if (differences.length) throw new SyncError(`sync output differs at: ${differences.join(", ")}`, EXIT.mismatch);
}

function pathDepth(path) {
  return path.replace(/\/$/, "").split("/").length;
}

function moveOwned(outputRoot, stageRoot, lockPath, lockContent) {
  const transactionRoot = mkdtempSync(join(tmpdir(), "teachme-sync-transaction-"));
  const backupRoot = resolve(transactionRoot, "backup");
  mkdirSync(backupRoot, { recursive: true });
  const movedOld = [];
  const installed = [];
  let oldLock = false;
  let newLock = false;
  try {
    if (existsSync(lockPath)) {
      const lockBackup = resolve(backupRoot, "source-lock.json");
      mkdirSync(dirname(lockBackup), { recursive: true });
      renameSync(lockPath, lockBackup);
      oldLock = true;
    }
    for (const owned of [...SYNC_OWNED_PATHS].sort((a, b) => pathDepth(b) - pathDepth(a))) {
      const source = resolve(outputRoot, owned);
      if (!existsSync(source)) continue;
      const backup = resolve(backupRoot, owned);
      mkdirSync(dirname(backup), { recursive: true });
      renameSync(source, backup);
      movedOld.push({ owned, backup });
    }
    for (const owned of [...SYNC_OWNED_PATHS].sort((a, b) => pathDepth(a) - pathDepth(b))) {
      const source = resolve(stageRoot, owned);
      if (!existsSync(source)) throw new SyncError(`staging is missing sync-owned path: ${owned}`, EXIT.mismatch);
      const target = resolve(outputRoot, owned);
      mkdirSync(dirname(target), { recursive: true });
      renameSync(source, target);
      installed.push(target);
    }
    mkdirSync(dirname(lockPath), { recursive: true });
    const lockTemp = `${lockPath}.tmp-${process.pid}`;
    writeFileSync(lockTemp, lockContent);
    renameSync(lockTemp, lockPath);
    newLock = true;
    rmSync(transactionRoot, { recursive: true, force: true });
  } catch (error) {
    if (newLock && existsSync(lockPath)) rmSync(lockPath, { recursive: true, force: true });
    if (oldLock && existsSync(resolve(backupRoot, "source-lock.json"))) {
      mkdirSync(dirname(lockPath), { recursive: true });
      renameSync(resolve(backupRoot, "source-lock.json"), lockPath);
    }
    for (const target of installed.reverse()) if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    for (const { owned, backup } of movedOld.reverse()) {
      if (existsSync(backup)) {
        const target = resolve(outputRoot, owned);
        mkdirSync(dirname(target), { recursive: true });
        renameSync(backup, target);
      }
    }
    rmSync(transactionRoot, { recursive: true, force: true });
    if (error instanceof SyncError) throw error;
    throw new SyncError(`sync transaction failed: ${error.message}`, EXIT.mismatch);
  }
}

export function runSync(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const sourceRoot = chooseSourceRoot(options.sourceRootArg);
  const outputRoot = chooseOutputRoot(options.outputRootArg);
  const lockPath = chooseLockPath(options.sourceLockArg);
  const computedLock = buildSourceLock(sourceRoot);
  if (!options.updateLock) ensureLockMatches(lockPath, computedLock);
  const stageRoot = mkdtempSync(join(tmpdir(), "teachme-sync-"));
  try {
    buildStage(sourceRoot, stageRoot);
    if (options.mode === "check") {
      assertSameOutput(outputRoot, stageRoot);
      return EXIT.ok;
    }
    if (options.updateLock) {
      moveOwned(outputRoot, stageRoot, lockPath, stableJson(computedLock));
    } else {
      const lockContent = readFileSync(lockPath, "utf8");
      moveOwned(outputRoot, stageRoot, lockPath, lockContent);
    }
    return EXIT.ok;
  } finally {
    rmSync(stageRoot, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    process.exitCode = runSync();
  } catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exitCode = error instanceof SyncError ? error.code : EXIT.mismatch;
  }
}
