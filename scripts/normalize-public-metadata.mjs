#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const defaultDocsRoot = resolve(repoRoot, "docs");

function htmlRoutes(docsRoot) {
  const routes = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && entry.name.endsWith(".html")) routes.push(relative(docsRoot, full).split(sep).join("/"));
    }
  }
  visit(docsRoot);
  return routes.sort();
}

function escapeAttr(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function plainText(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|&)nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&middot;/g, "·")
    .replace(/&quot;/g, '"')
    .replace(/\s+/gu, " ")
    .trim();
}

function setTitle(html, title) {
  const tag = `<title>${title}</title>`;
  if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, tag);
  return html.replace(/<head\b[^>]*>/i, (match) => `${match}\n    ${tag}`);
}

function setDescription(html, description) {
  const tag = `<meta name="description" content="${escapeAttr(description)}">`;
  html = html.replace(/\s*<meta\b[^>]*\bname=["']description["'][^>]*>/gi, "");
  return html.replace(/(<meta\b[^>]*charset=[^>]*>)/i, `$1\n    ${tag}`);
}

function setFavicon(html, href) {
  const tag = `<link rel="icon" type="image/svg+xml" href="${href}">`;
  html = html.replace(/\s*<link\b[^>]*\brel=["'][^"']*\bicon\b[^>]*>/gi, "");
  return html.replace(/(<meta\b[^>]*name=["']viewport["'][^>]*>)/i, `$1\n    ${tag}`);
}

function ensureMain(html) {
  if ((html.match(/<main\b/gi) ?? []).length > 0) return html;
  return html.replace(/(<body\b[^>]*>)/i, "$1\n<main>").replace(/<\/body>/i, "</main>\n</body>");
}

function replaceFluxEntry(route, html) {
  if (route !== "teach/flux2/index.html") return html;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FLUX.2 课程入口</title>
</head>
<body>
  <main>
    <h1>FLUX.2 课程入口</h1>
    <p>从仓库身份、latent contract 和模型家族边界开始，逐步建立从公开推理代码走向训练准备的判断框架。</p>
    <p><a href="course-map.html">打开完整课程地图</a></p>
    <p><a href="lessons/0001-find-the-latent-contract.html">从第 1 课开始</a></p>
  </main>
</body>
</html>
`;
}

function normalizeRoute(route, docsRoot, faviconPath) {
  const path = resolve(docsRoot, route);
  let html = replaceFluxEntry(route, readFileSync(path, "utf8"));
  html = ensureMain(html);
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const title = plainText(h1?.[1] ?? route);
  const description = `Teachme Sensei 课程页：${title}`.slice(0, 155);
  const href = relative(dirname(path), faviconPath).split(sep).join("/");
  html = setTitle(html, escapeAttr(title));
  html = setDescription(html, description);
  html = setFavicon(html, href);
  html = html.replace(/<button(?![^>]*\btype\s*=)/gi, '<button type="button"');
  writeFileSync(path, html.replace(/\n+$/, "\n"));
}

export function normalizePublicMetadata({ docsRoot = defaultDocsRoot, faviconPath = resolve(docsRoot, "teach/assets/favicon.svg") } = {}) {
  if (!existsSync(faviconPath)) throw new Error(`canonical favicon missing: ${faviconPath}`);
  for (const route of htmlRoutes(docsRoot)) normalizeRoute(route, docsRoot, faviconPath);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href && process.argv.includes("--write")) {
  normalizePublicMetadata();
  console.log("[OK] normalized public metadata, favicon, and main wrappers");
} else if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.error("Usage: node scripts/normalize-public-metadata.mjs --write");
  process.exitCode = 2;
}
