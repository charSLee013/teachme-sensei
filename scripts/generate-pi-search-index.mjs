#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "parse5";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const defaultPiRoot = resolve(repoRoot, "docs/teach/pi");

const SKIP_TAGS = new Set(["head", "script", "style", "template", "pre", "code", "noscript", "textarea", "option", "svg"]);

function walk(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) walk(child, callback);
}

function attrs(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
}

function hidden(node) {
  const a = attrs(node);
  return Object.hasOwn(a, "hidden") || Object.hasOwn(a, "inert") || a["aria-hidden"] === "true" || /(?:^|;|\s)(?:display\s*:\s*none|visibility\s*:\s*hidden)(?:;|\s|$)/i.test(a.style ?? "");
}

function text(node, inheritedHidden = false) {
  if (node.nodeName === "#text") return inheritedHidden ? "" : node.value;
  if (!node.nodeName || SKIP_TAGS.has(node.nodeName)) return "";
  const isHidden = inheritedHidden || hidden(node);
  return (node.childNodes ?? []).map((child) => text(child, isHidden)).join(" ");
}

function normalizeText(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function chapterFiles(piRoot) {
  return Array.from({ length: 14 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const file = readdirChapter(piRoot, number);
    return `chapters/${file}`;
  }).sort();
}

function readdirChapter(piRoot, number) {
  const files = [
    "01-what-is-pi.html",
    "02-monorepo.html",
    "03-pi-ai.html",
    "04-agent-core.html",
    "05-pi-tui.html",
    "06-coding-agent.html",
    "07-tools.html",
    "08-extensions.html",
    "09-session-management.html",
    "10-compaction.html",
    "11-interactive-mode.html",
    "12-sdk.html",
    "13-orchestrator.html",
    "14-contributing.html",
  ];
  const file = files.find((candidate) => candidate.startsWith(`${number}-`));
  if (!file || !existsSync(join(piRoot, "chapters", file))) throw new Error(`Missing Pi chapter ${number}`);
  return file;
}

function sourceHash(sourceFiles, piRoot) {
  const hash = createHash("sha256");
  for (const file of sourceFiles) {
    hash.update(Buffer.from(file));
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(resolve(piRoot, file)));
    hash.update(Buffer.from("\n"));
  }
  return hash.digest("hex");
}

function entryFor(file, piRoot) {
  const document = parse(readFileSync(resolve(piRoot, file), "utf8"));
  const elements = [];
  walk(document, (node) => {
    if (node.tagName) elements.push(node);
  });
  const heading = elements.find((node) => node.tagName === "h1");
  const body = elements.find((node) => node.tagName === "body");
  const bodyText = normalizeText(body ? text(body) : text(document));
  return {
    title: normalizeText(heading ? text(heading) : file),
    href: file,
    snippet: Array.from(bodyText).slice(0, 180).join(""),
    searchText: bodyText,
  };
}

export function buildSearchIndex({ piRoot = defaultPiRoot } = {}) {
  const sourceFiles = chapterFiles(piRoot);
  return {
    schema: 1,
    sourceHashAlgorithm: "sha256-path-nul-raw-newline",
    sourceHash: sourceHash(sourceFiles, piRoot),
    sourceFiles,
    entries: sourceFiles.map((file) => entryFor(file, piRoot)),
  };
}

function serializedIndex(index) {
  return `window.PI_SEARCH_INDEX = ${JSON.stringify(index, null, 2)};\n`;
}

export function writeSearchIndex({ piRoot = defaultPiRoot } = {}) {
  const indexPath = resolve(piRoot, "assets/js/search-index.js");
  writeFileSync(indexPath, serializedIndex(buildSearchIndex({ piRoot })));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href && process.argv.includes("--check")) {
  const indexPath = resolve(defaultPiRoot, "assets/js/search-index.js");
  const expected = serializedIndex(buildSearchIndex());
  if (!existsSync(indexPath) || readFileSync(indexPath, "utf8") !== expected) {
    console.error("[FAIL] Pi search index is stale; run node scripts/generate-pi-search-index.mjs --write");
    process.exitCode = 1;
  } else {
    console.log("[OK] Pi search index is fresh");
  }
} else if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href && process.argv.includes("--write")) {
  writeSearchIndex();
  console.log(`[OK] wrote ${resolve(defaultPiRoot, "assets/js/search-index.js")}`);
} else if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.error("Usage: node scripts/generate-pi-search-index.mjs --check|--write");
  process.exitCode = 2;
}
