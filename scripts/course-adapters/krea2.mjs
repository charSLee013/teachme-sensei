import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, parseFragment, serialize } from "parse5";

const SOURCE_SECTIONS = ["Source", "What It Supports", "Teaching Use", "Scope"];
const SOURCE_TITLES = new Map([["local-codebase.md", "Local Krea 2 Codebase"]]);
const EXPECTED_FILES = {
  lessons: [
    "0001-repository-as-research-object.html", "0002-tensors-and-shapes.html", "0003-probability-and-noise.html",
    "0004-neural-network-inference.html", "0005-tokenization-and-conditioning.html", "0006-attention-and-gqa.html",
    "0007-rope-and-position.html", "0008-vae-latent-space.html", "0009-diffusion-and-flow-matching.html",
    "0010-cfg-and-sampling.html", "0011-dit-and-mmdit.html", "0012-krea2-pipeline-trace.html",
    "0013-code-to-tensor-trace.html", "0014-hardware-and-performance.html", "0015-experiment-design.html",
    "0016-metrics-and-error-analysis.html", "0017-reproducibility-protocol.html", "0018-paper-reading.html",
    "0019-related-work.html", "0020-abstract-and-introduction.html", "0021-method-and-equations.html",
    "0022-experiments-and-tables.html", "0023-figures-and-captions.html", "0024-limitations-and-negative-results.html",
    "0025-reviewer-objections.html", "0026-rebuttal-and-defense.html", "0027-capstone-paper.html", "0028-final-synthesis.html",
  ],
  reference: [
    "experiment-record-template.html", "krea2-architecture.html", "paper-writing-checklist.html",
    "sampler-and-scheduler.html", "tensor-shape-atlas.html", "terminology.html",
  ],
  sources: [
    "acm-mm-and-ccf-context.md", "diffusers-krea2-pipeline.md", "flow-matching-papers.md",
    "krea2-official-sources.md", "local-codebase.md", "qwen3vl-and-qwen-image.md",
    "reproducibility-and-evaluation.md", "transformer-and-dit-papers.md", "vae-and-diffusion-papers.md",
  ],
};
const KREA_REVISION = "cf3c9102c924168699b90d97a2cb15059d761488";
const CODE_PATHS = new Map([
  ["README.md", { lines: 124, kind: "blob" }],
  ["inference.py", { lines: 138, kind: "blob" }],
  ["encoder.py", { lines: 76, kind: "blob" }],
  ["autoencoder.py", { lines: 22, kind: "blob" }],
  ["sampling.py", { lines: 146, kind: "blob" }],
  ["mmdit.py", { lines: 417, kind: "blob" }],
  ["pyproject.toml", { lines: 23, kind: "blob" }],
  ["docs/prompting.md", { lines: 127, kind: "blob" }],
  ["docs/", { lines: null, kind: "tree" }],
]);
const adapterRoot = dirname(fileURLToPath(import.meta.url));
const EDIT_CONFIGS = ["krea2-copy-edits.json", "krea2-style-edits.json"]
  .map((file) => [file, JSON.parse(readFileSync(resolve(adapterRoot, file), "utf8"))]);
const APPROVED_HTML_ROUTES = new Set([
  "course-map.html",
  ...EXPECTED_FILES.lessons.map((file) => "lessons/" + file),
  ...EXPECTED_FILES.reference.map((file) => "reference/" + file),
]);

function validatedCopyEdits() {
  const merged = {};
  const seen = new Map();
  for (const [file, config] of EDIT_CONFIGS) {
    if (!config || Array.isArray(config) || typeof config !== "object") throw new Error("Krea2 edit config must be an object: " + file);
    for (const [route, edits] of Object.entries(config)) {
      if (!APPROVED_HTML_ROUTES.has(route)) throw new Error("Krea2 edit config has unknown route: " + route);
      if (!Array.isArray(edits)) throw new Error("Krea2 edit list must be an array: " + route);
      for (const edit of edits) {
        if (!Array.isArray(edit) || edit.length !== 2 || edit.some((value) => typeof value !== "string" || !value)) {
          throw new Error("Krea2 edit must contain two non-empty strings: " + route);
        }
        if (edit[0] === edit[1]) throw new Error("Krea2 edit must change the source text: " + route);
        const key = route + "\0" + edit[0];
        if (seen.has(key)) throw new Error("Krea2 edit duplicates source text in " + file + ": " + route);
        seen.set(key, file);
        (merged[route] ??= []).push(edit);
      }
    }
  }
  return merged;
}

const COPY_EDITS = validatedCopyEdits();

function assertDirectory(path, label) {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`Krea2 ${label} must be a regular directory: ${path}`);
}

function readRegularText(path, label) {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error(`Krea2 ${label} must be a regular file: ${path}`);
  return readFileSync(path, "utf8");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('\"', "&quot;");
}

function hasScriptProtocol(value) {
  const compact = value.replace(/[\u0000-\u0020\u007f-\u009f]/g, "").toLowerCase();
  return compact.startsWith("javascript:") || compact.startsWith("vbscript:");
}

function assertNoActiveContent(document, route) {
  function visit(node) {
    const name = node.tagName?.toLowerCase();
    if (name === "script") throw new Error("Krea2 scripts are forbidden: " + route);
    for (const item of node.attrs ?? []) {
      const attributeName = item.name.toLowerCase();
      if (attributeName.startsWith("on") || attributeName === "srcdoc") {
        throw new Error(`Krea2 active content attribute is forbidden (${attributeName}): ${route}`);
      }
      if (hasScriptProtocol(item.value)) {
        throw new Error(`Krea2 script URL protocol is forbidden (${attributeName}): ${route}`);
      }
    }
    for (const child of node.childNodes ?? []) visit(child);
  }
  visit(document);
}

function evidenceLink(href) {
  if (/^https?:\/\//i.test(href)) return href;
  const pinned = codeHref(href);
  if (pinned) return pinned;
  const reference = /^\.\.\/reference\/([a-z0-9-]+\.html)$/i.exec(href);
  if (reference && EXPECTED_FILES.reference.includes(reference[1])) return reference[1];
  throw new Error("Krea2 evidence source contains an unknown relative link: " + href);
}

function renderInline(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) =>
    '<a href="' + escapeHtml(evidenceLink(href)) + '">' + label + "</a>");
  return html;
}

function renderMarkdownBlock(value) {
  const output = [];
  let list = [];
  let paragraph = [];
  const flushList = () => {
    if (list.length === 0) return;
    output.push(`<ul>${list.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  for (const line of value.split(/\r?\n/)) {
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return output.join("\n");
}

function replaceExactlyOnce(value, before, after, label) {
  const first = value.indexOf(before);
  if (first < 0 || value.indexOf(before, first + before.length) >= 0) {
    throw new Error("Krea2 deterministic edit drifted (" + label + "): " + before);
  }
  return value.slice(0, first) + after + value.slice(first + before.length);
}

function parseSource(path) {
  let markdown = readRegularText(path, "source");
  if (basename(path) === "krea2-official-sources.md") {
    markdown = replaceExactlyOnce(
      markdown,
      "Marketing claims, leaderboard positions, and hosted-product behavior are not treated as controlled evidence for the local inference ablation.",
      "Marketing claims, leaderboard positions, and hosted-product behavior remain contextual claims outside the controlled evidence set for the local inference ablation.",
      basename(path),
    );
  }
  const headings = [...markdown.matchAll(/^(#{1,2})\s+(.+)$/gm)];
  const levels = headings.map((heading) => heading[1]);
  if (JSON.stringify(levels) !== JSON.stringify(["#", "##", "##", "##", "##"])) {
    throw new Error(`Krea2 source must contain one H1 followed by four H2 sections: ${basename(path)}`);
  }
  const actualSections = headings.slice(1).map((heading) => heading[2].trim());
  if (JSON.stringify(actualSections) !== JSON.stringify(SOURCE_SECTIONS)) {
    throw new Error(`Krea2 source section schema mismatch: ${basename(path)}`);
  }
  const sections = {};
  for (let index = 1; index < headings.length; index += 1) {
    const start = headings[index].index + headings[index][0].length;
    const end = headings[index + 1]?.index ?? markdown.length;
    const content = markdown.slice(start, end).trim();
    if (!content) throw new Error(`Krea2 source section is empty: ${basename(path)}#${actualSections[index - 1]}`);
    sections[actualSections[index - 1]] = content;
  }
  return {
    id: basename(path, ".md"),
    title: SOURCE_TITLES.get(basename(path)) ?? headings[0][2].trim(),
    sections,
  };
}

function attribute(node, name) {
  return node.attrs?.find((item) => item.name === name);
}

function setAttribute(node, name, value) {
  const existing = attribute(node, name);
  if (existing) existing.value = value;
  else (node.attrs ??= []).push({ name, value });
}

function nodeText(node) {
  if (node.nodeName === "#text") return node.value;
  return (node.childNodes ?? []).map(nodeText).join("");
}

function codeHref(href) {
  const parts = href.split("#");
  const path = parts[0];
  let fragment = parts[1] ?? "";
  let repositoryPath = null;
  if (/^\.\.\/\.\.\/(?:README\.md|inference\.py|encoder\.py|autoencoder\.py|sampling\.py|mmdit\.py|pyproject\.toml)$/.test(path)) {
    repositoryPath = path.slice(6);
  } else if (path === "../../docs/prompting.md") {
    repositoryPath = "docs/prompting.md";
  } else if (path === "../../docs/") {
    repositoryPath = "docs/";
  } else {
    return null;
  }
  const contract = CODE_PATHS.get(repositoryPath);
  if (!contract) return null;
  if (fragment) {
    const match = /^L(\d+)(?:-L(\d+))?$/.exec(fragment);
    if (!match) throw new Error("Krea2 code link has an invalid line anchor: " + href);
    const start = Number(match[1]);
    let end = Number(match[2] ?? match[1]);
    if (repositoryPath === "autoencoder.py" && start === 1 && [47, 62].includes(end)) end = 22;
    if (!contract.lines || start < 1 || end < start || end > contract.lines) {
      throw new Error("Krea2 code line anchor exceeds pinned file: " + href);
    }
    fragment = "L" + start + (end === start ? "" : "-L" + end);
  }
  return "https://github.com/krea-ai/krea-2/" + contract.kind + "/" + KREA_REVISION + "/" + repositoryPath + (fragment ? "#" + fragment : "");
}

function evidenceHref(route, href) {
  const match = /(?:^|\/)sources\/([^/#]+)\.md(?:#.*)?$/i.exec(href);
  if (!match) return null;
  if (route.startsWith("lessons/")) return "../reference/evidence-and-sources.html#" + match[1];
  if (route.startsWith("reference/")) return "evidence-and-sources.html#" + match[1];
  return "reference/evidence-and-sources.html#" + match[1];
}

function rewritePage(html, route) {
  const document = parse(html);
  const edits = new Map((COPY_EDITS[route] ?? []).map(([before, after]) => [before, { after, count: 0 }]));
  function replaceMarkdownLinks(node) {
    if (!/\[[^\]]+\]\([^)]+\)/.test(node.value)) return;
    const rendered = node.value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const target = codeHref(href) ?? evidenceHref(route, href) ?? href;
      return '<a href="' + escapeHtml(target) + '">' + escapeHtml(label) + "</a>";
    });
    const fragment = parseFragment(rendered);
    const parent = node.parentNode;
    const index = parent.childNodes.indexOf(node);
    for (const child of fragment.childNodes) child.parentNode = parent;
    parent.childNodes.splice(index, 1, ...fragment.childNodes);
  }
  function visit(node, excluded = false) {
    const name = node.tagName?.toLowerCase();
    const classes = (attribute(node, "class")?.value ?? "").split(/\s+/).filter(Boolean);
    const scrollLabel = name === "pre"
      ? "可横向滚动的代码示例"
      : classes.includes("diagram")
        ? "可横向滚动的课程图示"
        : classes.includes("table-wrap")
          ? "可横向滚动的数据表"
          : null;
    if (scrollLabel) {
      setAttribute(node, "tabindex", "0");
      if (!attribute(node, "aria-label")) setAttribute(node, "aria-label", scrollLabel);
    }
    if (route === "course-map.html" && name === "section") {
      const heading = (node.childNodes ?? []).find((child) => child.tagName === "h2");
      if (heading && nodeText(heading).trim() === "课程契约") setAttribute(node, "id", "course-contract");
    }
    const skipText = excluded || ["script", "style", "code", "pre", "noscript", "svg"].includes(name);
    if (!skipText && node.nodeName === "#text") {
      for (const [before, edit] of edits) {
        if (node.value.includes(before)) {
          node.value = replaceExactlyOnce(node.value, before, edit.after, route + " text");
          edit.count += 1;
        }
      }
      replaceMarkdownLinks(node);
    }
    if (name === "a") {
      const hrefAttribute = attribute(node, "href");
      if (hrefAttribute) {
        const href = hrefAttribute.value;
        const pinned = codeHref(href);
        const evidence = evidenceHref(route, href);
        if (route === "course-map.html" && href === "../README.md") {
          hrefAttribute.value = "../../index.html";
          node.childNodes = [{ nodeName: "#text", value: "Teachme Sensei 目录", parentNode: node }];
        } else if (/MISSION\.md(?:#.*)?$/i.test(href)) {
          hrefAttribute.value = route.startsWith("lessons/") ? "../course-map.html#course-contract" : "course-map.html#course-contract";
        } else if (/review\.md(?:#.*)?$/i.test(href)) {
          const parent = node.parentNode;
          const index = parent.childNodes.indexOf(node);
          const previous = parent.childNodes[index - 1];
          if (previous?.nodeName === "#text") {
            previous.value = previous.value.replace(/课程完成后的独立教学审查记录在\s*$/, "");
          }
          parent.childNodes.splice(index, 1);
          return;
        } else if (pinned) hrefAttribute.value = pinned;
        else if (evidence) hrefAttribute.value = evidence;
      }
    }
    for (const child of node.childNodes ?? []) visit(child, skipText);
  }
  visit(document);
  for (const [before, edit] of edits) {
    if (edit.count !== 1) {
      throw new Error("Krea2 copy edit expected once, found " + edit.count + " (" + route + "): " + before);
    }
  }
  assertNoActiveContent(document, route);
  return serialize(document);
}

function htmlDocument({ title, body }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="../assets/course.css">
</head>
<body>
  <header class="topbar"><div class="crumbs"><a href="../course-map.html">课程地图</a><span>/</span><span>Evidence</span></div><a href="../index.html">课程首页</a></header>
  <main>${body}</main>
  <footer class="foot">Krea 2 evidence index. Sources are grouped by the claims they support and their applicable scope.</footer>
</body>
</html>
`;
}

function evidencePage(sources) {
  const navigation = sources.map(({ id, title }) => `<li><a href="#${id}">${escapeHtml(title)}</a></li>`).join("");
  const sections = sources.map(({ id, title, sections: content }) => `
    <section id="${id}">
      <h2>${escapeHtml(title)}</h2>
      <h3>来源</h3>${renderMarkdownBlock(content.Source)}
      <h3>支持内容</h3>${renderMarkdownBlock(content["What It Supports"])}
      <h3>教学用途</h3>${renderMarkdownBlock(content["Teaching Use"])}
      <h3>适用范围</h3>${renderMarkdownBlock(content.Scope)}
    </section>`).join("");
  return rewritePage(htmlDocument({
    title: "Krea 2 Evidence and Sources",
    body: `
    <section class="hero"><p class="kicker">Reference / Source Map</p><h1>Krea 2 Evidence and Sources</h1><p class="lede">按来源查看课程主张的证据、教学用途和适用范围。代码事实固定到课程声明的 revision，会议与投稿规则以使用时的官方页面为准。</p></section>
    <section><h2>来源导航</h2><ul>${navigation}</ul></section>
    <section id="license-and-safety"><h2>许可与安全检查</h2><div class="table-wrap"><table><thead><tr><th>对象</th><th>当前导航</th><th>采用前检查</th></tr></thead><tbody><tr><td>仓库代码</td><td>固定 revision 下的 Apache-2.0 代码许可</td><td>保留许可证与归属信息，核对所引依赖的各自条款。</td></tr><tr><td>Raw / Turbo 权重</td><td>官方模型卡所列 Krea Community License</td><td>下载、再分发、微调与商用前逐项核对当前模型卡和许可正文。</td></tr><tr><td>部署与下游使用</td><td>许可允许范围与安全责任共同生效</td><td>记录用途、风险评估、内容安全措施、适用法规与组织审批。</td></tr></tbody></table></div><p>本节提供采用前的导航摘要。许可解释、合规决定和安全审批以当前官方文本及合格专业意见为准。</p></section>${sections}`,
  }), "reference/evidence-and-sources.html");
}

function courseIndex() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Krea 2 多模态生成研究课程</title>
  <link rel="stylesheet" href="assets/course.css">
</head>
<body>
  <header class="topbar"><div class="crumbs"><a href="../../index.html">课程目录</a><span>/</span><span>Krea 2</span></div><a href="course-map.html">课程地图</a></header>
  <main>
    <section class="hero"><p class="kicker">Krea 2 / Multimodal Generation</p><h1>从推理代码走到可复现的研究论文</h1><p class="lede">沿着直觉、公式、代码和实验四层路径，理解 Krea 2 的生成链路，并把观察整理成可复核的研究写作。</p><p><a href="lessons/0001-repository-as-research-object.html">开始第 1 课</a> · <a href="course-map.html">查看 28 课路线</a></p></section>
    <section><h2>学习阶段</h2><div class="layer-grid"><article class="layer"><h3>基础与张量</h3><p>建立仓库、概率、token、attention、RoPE、VAE 与 flow matching 心智模型。</p></article><article class="layer"><h3>系统追踪</h3><p>从 pipeline 入口追踪张量状态、MMDiT、采样调度和性能条件。</p></article><article class="layer"><h3>实验方法</h3><p>设计变量、指标、错误分析与可复现协议。</p></article><article class="layer"><h3>论文写作</h3><p>完成 related work、方法、实验、限制、rebuttal 与毕业论文包。</p></article></div></section>
    <section class="next"><strong>证据索引：</strong><a href="reference/evidence-and-sources.html">查看课程使用的代码、论文和官方资料</a></section>
  </main>
  <footer class="foot">Krea 2 course package. Claims are tied to code, sources, experiments and explicit scope.</footer>
</body>
</html>
`;
}

function copyDirectoryFiles(sourceRoot, outputRoot, directory) {
  const sourceDirectory = resolve(sourceRoot, directory);
  assertDirectory(sourceDirectory, directory.slice(0, -1));
  const entries = readdirSync(sourceDirectory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const names = entries.map((entry) => entry.name);
  if (JSON.stringify(names) !== JSON.stringify(EXPECTED_FILES[directory])) {
    throw new Error("Krea2 " + directory.slice(0, -1) + " file set mismatch");
  }
  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".html") {
      throw new Error(`Unexpected Krea2 ${directory} entry: ${entry.name}`);
    }
    const target = resolve(outputRoot, directory, entry.name);
    mkdirSync(dirname(target), { recursive: true });
    const route = directory + "/" + entry.name;
    writeFileSync(target, rewritePage(readRegularText(resolve(sourceDirectory, entry.name), route), route));
  }
}

export function buildKrea2Course({ packageRoot, outputRoot }) {
  assertDirectory(packageRoot, "package root");
  if (existsSync(outputRoot)) {
    assertDirectory(outputRoot, "output root");
    if (readdirSync(outputRoot).length > 0) throw new Error(`Krea2 output root must be empty: ${outputRoot}`);
  } else {
    mkdirSync(outputRoot, { recursive: true });
  }
  copyDirectoryFiles(packageRoot, outputRoot, "lessons");
  copyDirectoryFiles(packageRoot, outputRoot, "reference");
  mkdirSync(resolve(outputRoot, "assets"), { recursive: true });
  assertDirectory(resolve(packageRoot, "assets"), "assets");
  const css = readRegularText(resolve(packageRoot, "assets/course.css"), "stylesheet");
  const cssAdditions = [
    "",
    ":focus-visible { outline: 3px solid #0c6670; outline-offset: 3px; }",
    "main, section, article, li, td { min-width: 0; }",
    "p, li, td, a, code { overflow-wrap: anywhere; }",
    "img, video, canvas { max-width: 100%; height: auto; }",
    "",
  ].join("\n");
  writeFileSync(resolve(outputRoot, "assets/course.css"), css.trimEnd() + "\n" + cssAdditions);
  writeFileSync(
    resolve(outputRoot, "course-map.html"),
    rewritePage(readRegularText(resolve(packageRoot, "course-map.html"), "course map"), "course-map.html"),
  );

  assertDirectory(resolve(packageRoot, "sources"), "sources");
  const sourceEntries = readdirSync(resolve(packageRoot, "sources"), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  if (JSON.stringify(sourceEntries.map((entry) => entry.name)) !== JSON.stringify(EXPECTED_FILES.sources)) {
    throw new Error("Krea2 source file set mismatch");
  }
  const sources = sourceEntries
    .map((entry) => {
      if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".md") {
        throw new Error(`Unexpected Krea2 source entry: ${entry.name}`);
      }
      return parseSource(resolve(packageRoot, "sources", entry.name));
    });
  if (sources.length !== 9) throw new Error(`Krea2 source count is ${sources.length}, expected 9`);

  writeFileSync(resolve(outputRoot, "index.html"), courseIndex());
  writeFileSync(resolve(outputRoot, "reference/evidence-and-sources.html"), evidencePage(sources));
  return { htmlCount: 37, sourceCount: sources.length };
}
