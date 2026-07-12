#!/usr/bin/env node
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = resolve(repoRoot, "docs");
const teachRoot = resolve(docsRoot, "teach");

const packages = [
  {
    label: "Pi Agent Harness course",
    source: "/tmp/pi/teach",
    target: resolve(teachRoot, "pi"),
    include: [
      "index.html",
      "course-map.html",
      "assets/",
      "chapters/",
    ],
  },
  {
    label: "Ideogram 4 course",
    source: "/tmp/ideogram4/paper-course",
    target: resolve(teachRoot, "ideogram4"),
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
    label: "LingBot-Video course",
    source: "/tmp/lingbot-video-course",
    target: resolve(teachRoot, "lingbot-video"),
    include: [
      "index.html",
      "lessons/",
      "reference/",
      "assets/course.css",
      "assets/favicon.svg",
      "assets/course-runtime.js",
      "assets/page-configs.js",
      "assets/ogl-bridge.js",
    ],
  },
  {
    label: "FLUX.2 course",
    source: "/private/tmp/flux2",
    target: resolve(teachRoot, "flux2"),
    include: [
      "course-map.html",
      "lessons/",
      "reference/0001-flux2-training-glossary.html",
      "reference/0002-flux2-latent-contract-map.html",
      "reference/0003-training-gap-checklist.html",
      "reference/0004-model-family-and-license-matrix.html",
      "reference/0005-object-and-contract-quick-reference.html",
      "reference/0006-research-route-decision-tree.html",
      "assets/",
    ],
  },
];

const excludedNames = new Set([
  ".claude",
  ".codex",
  ".git",
  ".spec-workflow",
  "artifacts",
  "benchmarks",
  "feedback.md",
  "proof",
  "schemas",
]);

function assertExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${path}`);
  }
}

function cleanDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function runCommandOrThrow(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${label} failed${output ? `\n${output}` : ""}`);
  }
  if (result.stdout.trim()) {
    console.log(result.stdout.trim());
  }
}

function copySelected({ label, source, target, include }) {
  assertExists(source, label);
  cleanDir(target);

  for (const item of include) {
    const sourcePath = resolve(source, item);
    const targetPath = resolve(target, item);
    assertExists(sourcePath, `${label}:${item}`);
    mkdirSync(dirname(targetPath), { recursive: true });
    cpSync(sourcePath, targetPath, { recursive: true });
  }

  console.log(`[sync] ${label}: copied course whitelist`);
}

function sanitizeLingbotPublicPages(target) {
  const indexPath = resolve(target, "index.html");
  const indexHtml = readFileSync(indexPath, "utf8")
    .replace(
      'href="artifacts/source-matrix.md">source matrix',
      'href="reference/model-and-paper-claims.html">model and paper claims',
    )
    .replace(
      'href="artifacts/repo-truth-map.md">repo truth map',
      'href="reference/file-map.html">file map',
    )
    .replace(/\n+$/, "\n");
  writeFileSync(indexPath, indexHtml);

  const validationPath = resolve(
    target,
    "lessons/11-debugging-and-validation.html",
  );
  const validationHtml = readFileSync(validationPath, "utf8").replace(
    "静态验证记录见 <code>proof/validation-log.md</code>。",
    '静态验证边界见 <a href="../reference/evidence-boundaries.html">证据边界参考页</a>。',
  ).replace(/\n+$/, "\n");
  writeFileSync(validationPath, validationHtml);

  function assertNoSupportReferences(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        assertNoSupportReferences(fullPath);
        continue;
      }
      if (extname(entry.name) !== ".html") continue;
      const html = readFileSync(fullPath, "utf8");
      if (/(?:artifacts|proof|showcases)\//.test(html)) {
        throw new Error(
          `LingBot-Video public page references excluded support material: ${relative(target, fullPath)}`,
        );
      }
    }
  }

  assertNoSupportReferences(target);
}

function verifyFlux2LearnerHtml(source) {
  runCommandOrThrow(
    "python3",
    [resolve(source, "scripts/verify_learner_html.py"), "--root", source],
    "FLUX.2 learner HTML gate",
  );
}

function createFlux2EntryAlias(target) {
  copyFileSync(resolve(target, "course-map.html"), resolve(target, "index.html"));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function rewriteMarkdownLinks(line) {
  return line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, href) => {
    if (/^(https?:|mailto:|tel:|#)/i.test(href)) {
      return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
    }

    if (href.startsWith("../artifacts/") || href.startsWith("artifacts/")) {
      return escapeHtml(label);
    }

    const [path, hash = ""] = href.split("#");
    const htmlPath = path.endsWith(".md") ? `${path.slice(0, -3)}.html` : path;
    const suffix = hash ? `#${hash}` : "";
    return `<a href="${escapeHtml(htmlPath + suffix)}">${escapeHtml(label)}</a>`;
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
    value = value.replace(
      /\n### 证据与实验支撑\n[\s\S]*?(?=\n## 公开事实与解释边界)/,
      "",
    );
    value = value.replace("，再回到 reference 和 artifacts。", "，再回到 reference。");
  }

  if (relativePath === "lessons/05-evaluation.md") {
    value = value.replace(
      "如果你要深入论文方法论，进入 [../reference/methodology.md](../reference/methodology.md)。如果你要检查公开证据边界，进入 [../artifacts/evidence-audit.md](../artifacts/evidence-audit.md)。",
      "如果你要深入论文方法论，进入 [../reference/methodology.md](../reference/methodology.md)。公开证据边界已在课程正文中用“已公开确认 / 解释性重构 / 尚未公开确认”分层呈现，支撑材料不进入公开课程目录。",
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
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
  };

  const flushCode = () => {
    html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    code = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      flushParagraph();
      closeLists();
      if (inCode) flushCode();
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      code.push(rawLine);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      closeLists();
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeLists();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text);
      html.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      continue;
    }

    const quote = /^>\s+(.+)$/.exec(line);
    if (quote) {
      flushParagraph();
      closeLists();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    const unordered = /^-\s+(.+)$/.exec(line);
    if (unordered) {
      flushParagraph();
      if (inOrderedList) {
        html.push("</ol>");
        inOrderedList = false;
      }
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph();
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      if (!inOrderedList) {
        html.push("<ol>");
        inOrderedList = true;
      }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeLists();
  if (inCode) flushCode();

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

function readTitle(markdown, fallback) {
  const match = /^#\s+(.+)$/m.exec(markdown);
  return match ? match[1].trim() : fallback;
}

function writeAnimaCss(target) {
  writeFileSync(
    resolve(target, "anima.css"),
    `:root {
  color-scheme: light;
  --bg: #f7f5f0;
  --paper: #fffdf8;
  --ink: #171b22;
  --muted: #626a72;
  --line: rgba(23, 27, 34, 0.14);
  --accent: #6b5b95;
  --accent-2: #28756f;
  --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --serif: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  color: var(--ink);
  background: linear-gradient(180deg, var(--bg), #ece8df);
  font-family: var(--sans);
  line-height: 1.7;
}
.course-shell {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px max(20px, calc((100vw - 880px) / 2));
  border-bottom: 1px solid var(--line);
  background: rgba(255, 253, 248, 0.88);
  backdrop-filter: blur(12px);
}
.course-shell a { color: var(--accent-2); text-decoration: none; font-weight: 700; }
.course-shell a:hover { text-decoration: underline; }
.markdown-course {
  width: min(880px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 42px 0 72px;
}
h1, h2, h3, h4 {
  margin: 1.35em 0 0.48em;
  font-family: var(--serif);
  line-height: 1.15;
  letter-spacing: 0;
}
h1 { margin-top: 0; font-size: clamp(2.2rem, 6vw, 4.2rem); }
h2 { font-size: 1.65rem; padding-top: 0.4rem; border-top: 1px solid var(--line); }
h3 { font-size: 1.28rem; }
p, li, blockquote { font-size: 1.02rem; }
p, ul, ol, blockquote, pre { margin: 0.8rem 0; }
a { color: var(--accent-2); }
blockquote {
  padding: 14px 18px;
  border-left: 4px solid var(--accent);
  background: rgba(107, 91, 149, 0.08);
  color: var(--muted);
}
code {
  font-family: var(--mono);
  font-size: 0.94em;
  padding: 0.12em 0.32em;
  border-radius: 4px;
  background: rgba(23, 27, 34, 0.07);
}
pre {
  overflow: auto;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #171b22;
  color: #f8f4eb;
}
pre code { padding: 0; background: transparent; color: inherit; }
@media (max-width: 720px) {
  .course-shell { position: static; flex-direction: column; }
  .markdown-course { padding-top: 28px; }
}
`,
  );
}

function collectMarkdownFiles(source) {
  const files = [];
  const allowedRoots = new Set(["lessons", "reference"]);

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (excludedNames.has(entry.name)) continue;
      const fullPath = resolve(dir, entry.name);
      const rel = relative(source, fullPath).replaceAll("\\", "/");

      if (entry.isDirectory()) {
        const root = rel.split("/")[0];
        if (rel.includes("/") || allowedRoots.has(root)) walk(fullPath);
        continue;
      }

      if (!entry.isFile() || extname(entry.name) !== ".md") continue;
      if (
        rel === "README.md" ||
        rel === "course-map.md" ||
        rel.startsWith("lessons/") ||
        rel.startsWith("reference/")
      ) {
        files.push(rel);
      }
    }
  }

  walk(source);
  return files.sort();
}

function syncAnima() {
  const label = "Anima course";
  const source = "/tmp/anima_learning";
  const target = resolve(teachRoot, "anima");
  assertExists(source, label);
  cleanDir(target);
  writeAnimaCss(target);

  const files = collectMarkdownFiles(source);
  for (const rel of files) {
    const markdown = sanitizeAnimaMarkdown(
      readFileSync(resolve(source, rel), "utf8"),
      rel,
    );
    const outputRel = rel === "README.md" ? "index.html" : rel.replace(/\.md$/, ".html");
    const outputPath = resolve(target, outputRel);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, markdownToHtml(markdown, readTitle(markdown, "Anima"), rel));
  }

  console.log(`[sync] ${label}: rendered ${files.length} course markdown files`);
}

function syncFlux2() {
  const pkg = packages.find((entry) => entry.label === "FLUX.2 course");
  if (!pkg) {
    throw new Error("FLUX.2 package definition is missing");
  }
  verifyFlux2LearnerHtml(pkg.source);
  copySelected(pkg);
  createFlux2EntryAlias(pkg.target);
}

function syncLingbotVideo() {
  const pkg = packages.find((entry) => entry.label === "LingBot-Video course");
  if (!pkg) {
    throw new Error("LingBot-Video package definition is missing");
  }
  copySelected(pkg);
  sanitizeLingbotPublicPages(pkg.target);
}

for (const item of packages) {
  if (item.label === "FLUX.2 course" || item.label === "LingBot-Video course") {
    continue;
  }
  copySelected(item);
}

syncAnima();
syncFlux2();
syncLingbotVideo();

rmSync(resolve(docsRoot, "assets"), { recursive: true, force: true });
mkdirSync(resolve(teachRoot, "assets"), { recursive: true });
copyFileSync("/tmp/ideogram4/assets/ideogram_logo.svg", resolve(teachRoot, "assets/ideogram_logo.svg"));
writeFileSync(resolve(docsRoot, ".nojekyll"), "");
console.log("[sync] wrote docs/.nojekyll and course assets");
