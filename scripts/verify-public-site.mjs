#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { parse } from "parse5";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const docsRoot = resolve(repoRoot, "docs");
const manifestPath = resolve(repoRoot, "scripts/public-site-manifest.json");
const dependencyManifestPath = resolve(repoRoot, "scripts/external-dependencies.json");
const piRoot = resolve(docsRoot, "teach/pi");

const EXPECTED_ENTRY_ROUTES = [
  { route: "index.html", course: "portal", kind: "portal" },
  { route: "teach/anima/course-map.html", course: "anima", kind: "map" },
  { route: "teach/anima/index.html", course: "anima", kind: "course" },
  { route: "teach/flux2/course-map.html", course: "flux2", kind: "map" },
  { route: "teach/flux2/index.html", course: "flux2", kind: "course" },
  { route: "teach/ideogram4/index.html", course: "ideogram4", kind: "course" },
  { route: "teach/index.html", course: "catalog", kind: "catalog" },
  { route: "teach/krea2/course-map.html", course: "krea2", kind: "map" },
  { route: "teach/krea2/index.html", course: "krea2", kind: "course" },
  { route: "teach/lingbot-video/index.html", course: "lingbot-video", kind: "course" },
  { route: "teach/pi/course-map.html", course: "pi", kind: "map" },
  { route: "teach/pi/index.html", course: "pi", kind: "course" },
];

const EXPECTED_ASSETS = [
  "teach/anima/anima.css",
  "teach/home.css",
  "teach/ideogram4/paper.css",
  "teach/ideogram4/paper.js",
  "teach/krea2/assets/course.css",
  "teach/lingbot-video/assets/course-runtime.js",
  "teach/lingbot-video/assets/course.css",
  "teach/lingbot-video/assets/ogl-bridge.js",
  "teach/lingbot-video/assets/page-configs.js",
  "teach/pi/assets/js/app.js",
  "teach/pi/assets/js/search-index.js",
  "teach/pi/assets/style.css",
  "teach/assets/favicon.svg",
  "teach/assets/ideogram_logo.svg",
];

const EXPECTED_SYNC_OWNED = [
  ".nojekyll",
  "teach/anima/",
  "teach/assets/favicon.svg",
  "teach/assets/ideogram_logo.svg",
  "teach/flux2/",
  "teach/ideogram4/",
  "teach/krea2/",
  "teach/lingbot-video/",
  "teach/pi/",
];

const EXPECTED_DEPENDENCY_HOSTS = {
  runtime: ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"],
  reference: [
    "arxiv.org",
    "bfl.ai",
    "discord.com",
    "github.com",
    "huggingface.co",
    "keepachangelog.com",
    "neurips.cc",
    "pi.dev",
    "radius.pi.dev",
    "rfc.earendil.com",
    "www.acm.org",
    "www.acmmm.org",
    "www.ccf.org.cn",
    "www.krea.ai",
  ],
};

const KREA_FORBIDDEN_COPY = [
  /\bnot\s+[^.!?]{0,160}\s+but\b/i,
  /\bnot part of\b/i,
  /\b(?:does|do) not require\b/i,
  /\bnot treated as\b/i,
  /不是[^。！？]{0,100}而是/,
  /并非[^。！？]{0,100}而是/,
  /不只是[^。！？]{0,100}而是/,
  /不等于/,
  /而不是/,
];

const legacyValidationTerm = ["smo", "ke"].join("");
const legacyValidationPattern = new RegExp(legacyValidationTerm, "i");

const SUPPORT_PATTERNS = [
  /source matrix/i,
  /repo truth map/i,
  /support-layer/i,
  /(?:^|[\s/])proof\//i,
  /(?:^|[\s/])artifacts\//i,
  /(?:^|[\s/])showcases\//i,
];

const SKIP_VISIBLE_TAGS = new Set([
  "head",
  "script",
  "style",
  "template",
  "pre",
  "code",
  "noscript",
  "textarea",
  "option",
  "svg",
]);

function fail(message) {
  throw new Error(message);
}

function walk(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) walk(child, callback);
}

function attrs(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
}

function isHidden(node) {
  const a = attrs(node);
  if (Object.hasOwn(a, "hidden") || Object.hasOwn(a, "inert")) return true;
  if (a["aria-hidden"]?.toLowerCase() === "true") return true;
  return /(?:^|;|\s)(?:display\s*:\s*none|visibility\s*:\s*hidden)(?:;|\s|$)/i.test(a.style ?? "");
}

function normalizeText(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function visibleText(node, hidden = false) {
  if (node.nodeName === "#text") return hidden ? "" : node.value;
  if (!node.nodeName || SKIP_VISIBLE_TAGS.has(node.nodeName)) return "";
  const nowHidden = hidden || isHidden(node);
  return (node.childNodes ?? []).map((child) => visibleText(child, nowHidden)).join(" ");
}

function allElements(document) {
  const elements = [];
  walk(document, (node) => {
    if (node.tagName) elements.push(node);
  });
  return elements;
}

function parseHtml(route) {
  return parse(readFileSync(resolve(docsRoot, route), "utf8"));
}

function htmlRoutes() {
  const routes = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && extname(entry.name) === ".html") {
        routes.push(relative(docsRoot, full).split(sep).join("/"));
      }
    }
  }
  visit(docsRoot);
  return routes.sort();
}

function routeFromUrl(value, currentRoute) {
  if (!value || value.startsWith("mailto:") || value.startsWith("tel:") || value.startsWith("data:")) return null;
  let parsed;
  try {
    parsed = new URL(value, `https://teachme.invalid/${currentRoute}`);
  } catch {
    return null;
  }
  if (parsed.origin !== "https://teachme.invalid") return null;
  let pathname = decodeURIComponent(parsed.pathname).replace(/^\//, "");
  if (pathname.endsWith("/")) pathname += "index.html";
  pathname = normalize(pathname).replaceAll("\\", "/");
  if (pathname.startsWith("../") || pathname === "..") return null;
  return { route: pathname, fragment: parsed.hash.slice(1) };
}

function localReference(value) {
  return !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value) && !/^(?:mailto:|tel:|data:|javascript:)/i.test(value);
}

function hasScriptProtocol(value) {
  const compact = value.replace(/[\u0000-\u0020\u007f-\u009f]/g, "").toLowerCase();
  return compact.startsWith("javascript:") || compact.startsWith("vbscript:");
}

function assertLocalLinks() {
  const routes = htmlRoutes();
  const routeSet = new Set(routes);
  const errors = [];
  for (const route of routes) {
    const document = parseHtml(route);
    for (const element of allElements(document)) {
      const a = attrs(element);
      for (const [name, value] of Object.entries(a)) {
        if (name === "href" && value === "#") errors.push(`${route}: empty href="#"`);
        if (!/^(?:href|src|action)$/i.test(name) || !localReference(value)) continue;
        const target = routeFromUrl(value, route);
        if (!target) continue;
        if (target.route && !existsSync(resolve(docsRoot, target.route))) {
          errors.push(`${route}: missing local target ${value}`);
          continue;
        }
        if (target.fragment) {
          if (!routeSet.has(target.route)) {
            errors.push(`${route}: fragment target is not HTML ${value}`);
            continue;
          }
          const targetDocument = parseHtml(target.route);
          const ids = new Set(allElements(targetDocument).flatMap((node) => {
            const id = attrs(node).id;
            return id ? [id] : [];
          }));
          if (!ids.has(target.fragment)) errors.push(`${route}: missing fragment ${value}`);
        }
      }
    }
  }
  if (errors.length) fail(errors.join("\n"));
  console.log(`[OK] local links/fragments (${routes.length} HTML routes)`);
}

function assertPublicContent() {
  const errors = [];
  for (const route of htmlRoutes()) {
    const html = readFileSync(resolve(docsRoot, route), "utf8");
    if (legacyValidationPattern.test(html)) errors.push(`${route}: legacy validation terminology`);
    const document = parse(html);
    const body = allElements(document).find((node) => node.tagName === "body");
    const text = normalizeText(body ? visibleText(body) : visibleText(document));
    for (const pattern of SUPPORT_PATTERNS) {
      if (pattern.test(text)) errors.push(`${route}: forbidden visible support text ${pattern}`);
    }
    if (/issue\s*#1234/i.test(html)) errors.push(`${route}: fabricated issue number`);
    if (/CVE-2024-xxxxx/i.test(html)) errors.push(`${route}: fabricated CVE`);
    if (route.startsWith("teach/krea2/")) {
      for (const pattern of KREA_FORBIDDEN_COPY) {
        if (pattern.test(text)) errors.push(`${route}: forbidden negative-contrast copy ${pattern}`);
      }
      if (/<script\b/i.test(html)) errors.push(`${route}: Krea2 pages must remain script-free`);
      if (/\[[^\]]+\]\([^)]+\)/.test(text)) errors.push(`${route}: raw Markdown link syntax is visible`);
    }
    for (const element of allElements(document)) {
      const a = attrs(element);
      for (const [name, value] of Object.entries(a)) {
        if (/^(?:href|src|action|data-[\w-]+)$/i.test(name) && /(?:artifacts|proof|showcases)\//i.test(value)) {
          errors.push(`${route}: forbidden support path in ${name}=${value}`);
        }
        if (route.startsWith("teach/krea2/") && name === "href") {
          if (/(?:MISSION|review)\.md|(?:^|\/)sources\//i.test(value)) errors.push(`${route}: Krea2 governance path in href=${value}`);
          if (!/^https?:/i.test(value) && /\.md(?:#|$)/i.test(value)) errors.push(`${route}: Krea2 local Markdown href=${value}`);
        }
        if (route.startsWith("teach/krea2/") && (name.startsWith("on") || name === "srcdoc")) {
          errors.push(`${route}: Krea2 active content attribute ${name}`);
        }
        if (route.startsWith("teach/krea2/") && hasScriptProtocol(value)) {
          errors.push(`${route}: Krea2 script URL protocol in ${name}`);
        }
      }
    }
  }
  function visitCode(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visitCode(full);
      else if (entry.isFile() && /\.(?:js|css)$/i.test(entry.name)) {
        const source = readFileSync(full, "utf8");
        if (legacyValidationPattern.test(source)) errors.push(`${relative(docsRoot, full)}: legacy validation terminology`);
      }
    }
  }
  visitCode(docsRoot);
  if (errors.length) fail(errors.join("\n"));
  console.log("[OK] public content boundary");
}

function headElements(document, tagName) {
  const head = allElements(document).find((node) => node.tagName === "head");
  return (head ? allElements(head) : []).filter((node) => node.tagName === tagName);
}

function assertStructure() {
  const errors = [];
  for (const route of htmlRoutes()) {
    const source = readFileSync(resolve(docsRoot, route), "utf8");
    if (/^\s*```/m.test(source)) errors.push(`${route}: raw Markdown fence in HTML`);
    const parseErrors = [];
    const document = parse(source, { onParseError: (error) => parseErrors.push(error) });
    for (const error of parseErrors) {
      errors.push(`${route}:${error.startLine}:${error.startCol}: HTML parse error ${error.code}`);
    }
    const elements = allElements(document);
    const html = elements.find((node) => node.tagName === "html");
    const main = elements.filter((node) => node.tagName === "main");
    const h1 = elements.filter((node) => node.tagName === "h1");
    const descriptions = headElements(document, "meta").filter((node) => attrs(node).name?.toLowerCase() === "description" && attrs(node).content?.trim());
    const icons = headElements(document, "link").filter((node) => /(?:^|\s)icon(?:\s|$)/i.test(attrs(node).rel ?? ""));
    if (!html || !attrs(html).lang) errors.push(`${route}: missing html lang`);
    if (main.length !== 1) errors.push(`${route}: expected one main, got ${main.length}`);
    if (h1.length !== 1) errors.push(`${route}: expected one h1, got ${h1.length}`);
    if (descriptions.length !== 1) errors.push(`${route}: expected one non-empty description, got ${descriptions.length}`);
    if (icons.length !== 1) errors.push(`${route}: expected one favicon, got ${icons.length}`);
    for (const icon of icons) {
      const href = attrs(icon).href;
      const target = href ? routeFromUrl(href, route) : null;
      if (!target || !existsSync(resolve(docsRoot, target.route))) errors.push(`${route}: favicon target missing`);
    }
  }
  if (errors.length) fail(errors.join("\n"));
  console.log(`[OK] HTML structure (${htmlRoutes().length} routes)`);
}

function hashPiSources(sourceFiles) {
  const hash = createHash("sha256");
  for (const path of sourceFiles) {
    hash.update(Buffer.from(path));
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(resolve(piRoot, path)));
    hash.update(Buffer.from("\n"));
  }
  return hash.digest("hex");
}

function piVisibleTitleAndSnippet(route) {
  const document = parseHtml(`teach/pi/${route}`);
  const elements = allElements(document);
  const h1 = elements.find((node) => node.tagName === "h1");
  const body = elements.find((node) => node.tagName === "body");
  return {
    title: normalizeText(h1 ? visibleText(h1) : ""),
    snippet: Array.from(normalizeText(body ? visibleText(body) : "")).slice(0, 180).join(""),
    searchText: normalizeText(body ? visibleText(body) : ""),
  };
}

function readSearchIndex() {
  const path = resolve(piRoot, "assets/js/search-index.js");
  if (!existsSync(path)) fail("Pi search index is missing");
  const source = readFileSync(path, "utf8");
  const match = /^window\.PI_SEARCH_INDEX\s*=\s*(\{[\s\S]*\});?\s*$/m.exec(source);
  if (!match) fail("Pi search index must assign window.PI_SEARCH_INDEX to one JSON object");
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`Pi search index JSON invalid: ${error.message}`);
  }
}

function assertPiSearch() {
  const expectedFiles = readdirSync(resolve(piRoot, "chapters"))
    .filter((file) => file.endsWith(".html"))
    .map((file) => `chapters/${file}`)
    .sort();
  if (expectedFiles.length !== 14) fail(`Pi chapter count is ${expectedFiles.length}, expected 14`);
  const index = readSearchIndex();
  const keys = Object.keys(index).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["entries", "schema", "sourceFiles", "sourceHash", "sourceHashAlgorithm"])) fail("Pi search index keys do not match schema");
  if (index.schema !== 1 || index.sourceHashAlgorithm !== "sha256-path-nul-raw-newline") fail("Pi search index schema/version mismatch");
  if (JSON.stringify(index.sourceFiles) !== JSON.stringify(expectedFiles)) fail("Pi search index sourceFiles mismatch");
  if (index.sourceHash !== hashPiSources(expectedFiles)) fail("Pi search index sourceHash is stale");
  if (!Array.isArray(index.entries) || index.entries.length !== expectedFiles.length) fail("Pi search entries count mismatch");
  for (const [i, entry] of index.entries.entries()) {
    if (JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(["href", "searchText", "snippet", "title"])) fail(`Pi search entry ${i} keys mismatch`);
    const expected = piVisibleTitleAndSnippet(expectedFiles[i]);
    if (entry.href !== expectedFiles[i] || entry.title !== expected.title || entry.snippet !== expected.snippet || entry.searchText !== expected.searchText) fail(`Pi search entry ${expectedFiles[i]} content mismatch`);
  }
  console.log("[OK] Pi search index freshness and schema");
}

function assertManifest() {
  if (!existsSync(manifestPath)) fail("public-site-manifest.json is missing");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const expectedKeys = ["assetAllowlist", "binaryAllowlist", "entryRoutes", "htmlRoutes", "orphanRoots", "schema", "syncOwnedPaths"];
  if (JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(expectedKeys)) fail("public manifest top-level schema mismatch");
  if (manifest.schema !== 2) fail("public manifest schema must be 2");
  if (JSON.stringify(manifest.htmlRoutes) !== JSON.stringify(htmlRoutes())) fail("public manifest htmlRoutes mismatch");
  if (JSON.stringify(manifest.entryRoutes) !== JSON.stringify(EXPECTED_ENTRY_ROUTES)) fail("public manifest entryRoutes mismatch");
  if (JSON.stringify(manifest.assetAllowlist) !== JSON.stringify(EXPECTED_ASSETS)) fail("public manifest assetAllowlist mismatch");
  if (JSON.stringify(manifest.binaryAllowlist) !== JSON.stringify([])) fail("public manifest binaryAllowlist must be empty");
  if (JSON.stringify(manifest.syncOwnedPaths) !== JSON.stringify(EXPECTED_SYNC_OWNED)) fail("public manifest syncOwnedPaths mismatch");
  if (JSON.stringify(manifest.orphanRoots) !== JSON.stringify([{ root: "teach/flux2/assets", expectedLinks: [], allowedFiles: [] }])) fail("public manifest orphanRoots mismatch");
  for (const path of EXPECTED_ASSETS) if (!existsSync(resolve(docsRoot, path))) fail(`declared asset missing: ${path}`);
  console.log("[OK] public manifest exact inventory");
}

function assertLocalAssets() {
  const binary = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && /\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|mp4|webm)$/i.test(entry.name)) binary.push(relative(docsRoot, full).split(sep).join("/"));
    }
  }
  visit(docsRoot);
  if (binary.length) fail(`unexpected public binary assets: ${binary.sort().join(", ")}`);
  console.log("[OK] public binary allowlist");
}

function assertDependencies() {
  if (!existsSync(dependencyManifestPath)) fail("external-dependencies.json is missing");
  const manifest = JSON.parse(readFileSync(dependencyManifestPath, "utf8"));
  const keys = Object.keys(manifest).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["allowedReferenceHosts", "allowedRuntimeHosts", "dependencies", "schema"])) fail("external dependency manifest keys mismatch");
  if (manifest.schema !== 2) fail("external dependency manifest schema must be 2");
  if (JSON.stringify(manifest.allowedRuntimeHosts) !== JSON.stringify(EXPECTED_DEPENDENCY_HOSTS.runtime)) fail("runtime host allowlist mismatch");
  if (JSON.stringify(manifest.allowedReferenceHosts) !== JSON.stringify(EXPECTED_DEPENDENCY_HOSTS.reference)) fail("reference host allowlist mismatch");
  const seen = new Set();
  const declaredUrls = new Set();
  const declaredPrefixes = [];
  for (const dependency of manifest.dependencies) {
    if (seen.has(dependency.id)) fail(`duplicate dependency id: ${dependency.id}`);
    seen.add(dependency.id);
    if (!["runtime", "reference"].includes(dependency.type)) fail(`invalid dependency type: ${dependency.id}`);
    for (const raw of dependency.urls) {
      const url = new URL(raw);
      declaredUrls.add(raw);
      const allowlist = dependency.type === "runtime" ? manifest.allowedRuntimeHosts : manifest.allowedReferenceHosts;
      if (!allowlist.includes(url.hostname)) fail(`dependency host is not allowlisted: ${raw}`);
    }
    for (const raw of dependency.urlPrefixes ?? []) {
      if (dependency.type !== "reference") fail(`runtime dependency cannot use urlPrefixes: ${dependency.id}`);
      const url = new URL(raw);
      if (url.protocol !== "https:") fail(`dependency prefix must use HTTPS: ${raw}`);
      if (!manifest.allowedReferenceHosts.includes(url.hostname)) fail(`dependency prefix host is not allowlisted: ${raw}`);
      declaredPrefixes.push(raw);
    }
  }
  const runtimeUrls = new Set();
  const referenceUrls = new Set();
  for (const route of htmlRoutes()) {
    const document = parseHtml(route);
    for (const element of allElements(document)) {
      const a = attrs(element);
      for (const [name, value] of Object.entries(a)) {
        if (!/^(?:href|src|data)$/i.test(name) || !/^https?:\/\//i.test(value)) continue;
        if (element.tagName === "a" && name === "href") referenceUrls.add(value);
        else runtimeUrls.add(value);
      }
    }
  }
  function collectCodeUrls(root) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const full = join(root, entry.name);
      if (entry.isDirectory()) collectCodeUrls(full);
      else if (entry.isFile() && /\.(?:js|css)$/i.test(entry.name)) {
        const source = readFileSync(full, "utf8");
        for (const match of source.matchAll(/https?:\/\/[^"'\s)]+/g)) runtimeUrls.add(match[0]);
      }
    }
  }
  collectCodeUrls(docsRoot);
  const errors = [];
  for (const raw of runtimeUrls) {
    const url = new URL(raw);
    if (!manifest.allowedRuntimeHosts.includes(url.hostname)) errors.push(`runtime URL host is not allowlisted: ${raw}`);
    if (!declaredUrls.has(raw)) errors.push(`runtime URL is not declared: ${raw}`);
  }
  for (const raw of referenceUrls) {
    const url = new URL(raw);
    if (!manifest.allowedReferenceHosts.includes(url.hostname)) errors.push(`reference URL host is not allowlisted: ${raw}`);
    if (!declaredUrls.has(raw) && !declaredPrefixes.some((prefix) => raw.startsWith(prefix))) {
      errors.push(`reference URL is not declared: ${raw}`);
    }
  }
  if (errors.length) fail(errors.join("\n"));
  console.log("[OK] external dependency policy");
}

function assertA11yStatic() {
  const errors = [];
  for (const route of htmlRoutes()) {
    const document = parseHtml(route);
    for (const element of allElements(document)) {
      const a = attrs(element);
      const classes = (a.class ?? "").split(/\s+/).filter(Boolean);
      if (element.tagName === "img" && !Object.hasOwn(a, "alt")) errors.push(`${route}: img missing alt`);
      if (element.tagName === "button" && !a.type) errors.push(`${route}: button missing type`);
      if (element.tagName === "input" && !a["aria-label"] && !a.id) errors.push(`${route}: input needs label or id`);
      const kreaScrollRegion = route.startsWith("teach/krea2/")
        && (element.tagName === "pre" || classes.includes("diagram") || classes.includes("table-wrap"));
      const lingbotScrollRegion = route.startsWith("teach/lingbot-video/")
        && (element.tagName === "pre" || element.tagName === "table" || classes.includes("math-block"));
      const piScrollRegion = route.startsWith("teach/pi/chapters/")
        && (element.tagName === "pre" || element.tagName === "table" || classes.includes("diagram-container"));
      const ideogramScrollRegion = route.startsWith("teach/ideogram4/")
        && (element.tagName === "pre" || element.tagName === "table");
      if (kreaScrollRegion || lingbotScrollRegion || piScrollRegion || ideogramScrollRegion) {
        if (a.tabindex !== "0") errors.push(`${route}: scroll region needs tabindex=0`);
        if (!a["aria-label"]?.trim()) errors.push(`${route}: scroll region needs an accessible name`);
      }
    }
  }
  if (errors.length) fail(errors.join("\n"));
  console.log("[OK] static accessibility checks");
}

function run(mode) {
  const modes = new Set(mode === "--all" ? ["--content-only", "--links", "--search", "--structure", "--a11y-static", "--assets", "--manifest", "--dependencies"] : [mode]);
  if (modes.has("--content-only")) assertPublicContent();
  if (modes.has("--links")) assertLocalLinks();
  if (modes.has("--search")) assertPiSearch();
  if (modes.has("--structure")) assertStructure();
  if (modes.has("--a11y-static")) assertA11yStatic();
  if (modes.has("--assets") || modes.has("--local-assets")) assertLocalAssets();
  if (modes.has("--manifest")) assertManifest();
  if (modes.has("--dependencies")) assertDependencies();
}

const mode = process.argv[2] ?? "--all";
try {
  run(mode);
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
}
