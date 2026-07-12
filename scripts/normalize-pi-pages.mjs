#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const defaultPiRoot = resolve(repoRoot, "docs/teach/pi");

const SEARCH_UI = `    <div class="sidebar-search">
        <input type="search" id="searchInput" placeholder="搜索章节..." aria-label="搜索 Pi 章节">
    </div>`;

const SEARCH_RESULTS = `<div class="search-results" id="searchResults" aria-live="polite">
    <div class="results-header">
        <h2>搜索结果</h2>
        <button type="button" class="results-close" id="searchResultsClose" aria-label="关闭搜索">&times;</button>
    </div>
    <div id="searchResultsList"></div>
</div>`;

function escapeAttr(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function plainText(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/&mdash;/g, "—").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/gu, " ").trim();
}

function chapterId(file) {
  return file.replace(/\.html$/, "");
}

function normalizeChapter(file, piRoot) {
  const chapterRoot = resolve(piRoot, "chapters");
  const path = join(chapterRoot, file);
  let html = readFileSync(path, "utf8");
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const title = plainText(h1?.[1] ?? file);
  const id = chapterId(file);

  html = html.replace(/<main\b([^>]*)>/i, (_match, attributes) => {
    let next = attributes;
    const setAttribute = (name, value) => {
      const pattern = new RegExp(`\\s${name}(?:=(?:"[^"]*"|'[^']*'))?`, "i");
      const replacement = ` ${name}="${escapeAttr(value)}"`;
      next = pattern.test(next) ? next.replace(pattern, replacement) : `${next}${replacement}`;
    };
    setAttribute("data-chapter-id", id);
    setAttribute("data-searchable", "");
    setAttribute("data-title", title);
    return `<main${next}>`;
  });

  if (!/id=["']searchInput["']/i.test(html)) {
    if (html.includes('<div class="sidebar-nav">')) html = html.replace('<div class="sidebar-nav">', `${SEARCH_UI}\n    <div class="sidebar-nav">`);
    else if (html.includes('<nav class="chapter-list">')) html = html.replace('<nav class="chapter-list">', `${SEARCH_UI}\n        <nav class="chapter-list">`);
    else html = html.replace(/<main\b/i, `${SEARCH_UI}\n\n<main`);
  }

  if (!/id=["']searchResults["']/i.test(html)) html = html.replace(/<main\b/i, `${SEARCH_RESULTS}\n\n<main`);
  if (!/assets\/js\/search-index\.js/i.test(html)) html = html.replace(/(<script\s+src=["']\.\.\/assets\/js\/app\.js["'][^>]*><\/script>)/i, '<script src="../assets/js/search-index.js"></script>\n$1');

  writeFileSync(path, html.replace(/\n+$/, "\n"));
}

function normalizeHome(piRoot) {
  const path = resolve(piRoot, "index.html");
  let html = readFileSync(path, "utf8");
  if (!/assets\/js\/search-index\.js/i.test(html)) html = html.replace(/(<script\s+src=["']assets\/js\/app\.js["'][^>]*><\/script>)/i, '<script src="assets/js/search-index.js"></script>\n$1');
  writeFileSync(path, html.replace(/\n+$/, "\n"));
}

export function normalizePiPages({ piRoot = defaultPiRoot } = {}) {
  const chapterRoot = resolve(piRoot, "chapters");
  normalizeHome(piRoot);
  for (const file of readdirSync(chapterRoot).filter((entry) => entry.endsWith(".html")).sort()) normalizeChapter(file, piRoot);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href && process.argv.includes("--write")) {
  normalizePiPages();
  console.log("[OK] normalized Pi chapter search controls");
} else if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.error("Usage: node scripts/normalize-pi-pages.mjs --write");
  process.exitCode = 2;
}
