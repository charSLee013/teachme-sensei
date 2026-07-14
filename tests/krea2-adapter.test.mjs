import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import test from "node:test";
import { parse } from "parse5";

import { buildKrea2Course } from "../scripts/course-adapters/krea2.mjs";
import { createKrea2SourceFixture } from "../scripts/fixtures/krea2-source-fixture.mjs";

function filesUnder(root) {
  const result = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) result.push(relative(root, path).split(sep).join("/"));
    }
  }
  visit(root);
  return result;
}

function pageTextAndLinks(html) {
  const document = parse(html);
  const text = [];
  const links = [];
  function visit(node, hidden = false) {
    const name = node.tagName?.toLowerCase();
    const excluded = hidden || ["script", "style", "code", "pre", "noscript", "svg"].includes(name);
    if (name === "a") {
      const href = node.attrs?.find((attribute) => attribute.name === "href")?.value;
      if (href) links.push(href);
    }
    if (!excluded && node.nodeName === "#text") text.push(node.value);
    for (const child of node.childNodes ?? []) visit(child, excluded);
  }
  visit(document);
  return { text: text.join(" ").replace(/\s+/g, " ").trim(), links };
}

function assertAccessibleScrollRegions(html, path) {
  const document = parse(html);
  function visit(node) {
    const name = node.tagName?.toLowerCase();
    const attributes = Object.fromEntries((node.attrs ?? []).map(({ name: attributeName, value }) => [attributeName, value]));
    const classes = (attributes.class ?? "").split(/\s+/).filter(Boolean);
    if (name === "pre" || classes.includes("diagram") || classes.includes("table-wrap")) {
      assert.equal(attributes.tabindex, "0", path + ": scroll region tabindex");
      assert.ok(attributes["aria-label"]?.trim(), path + ": scroll region accessible name");
    }
    for (const child of node.childNodes ?? []) visit(child);
  }
  visit(document);
}

test("builds the complete public Krea2 course from the approved source layout", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  const outputRoot = resolve(temporaryRoot, "course");
  try {
    const result = buildKrea2Course({ packageRoot: sourceRoot, outputRoot });
    const files = filesUnder(outputRoot);
    const htmlFiles = files.filter((path) => path.endsWith(".html"));
    assert.equal(result.htmlCount, 37);
    assert.equal(files.length, 38);
    assert.equal(htmlFiles.length, 37);
    assert.ok(files.includes("index.html"));
    assert.ok(files.includes("course-map.html"));
    assert.ok(files.includes("reference/evidence-and-sources.html"));
    for (const path of htmlFiles) {
      const html = readFileSync(resolve(outputRoot, path), "utf8");
      assert.doesNotMatch(html, /<script\b/i, path);
      assertAccessibleScrollRegions(html, path);
    }
    const evidence = readFileSync(resolve(outputRoot, "reference/evidence-and-sources.html"), "utf8");
    assert.match(evidence, /acm-mm-and-ccf-context/);
    assert.match(evidence, /Local Krea 2 Codebase/);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("routes Krea2 catalog links to the public site root", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  const outputRoot = resolve(temporaryRoot, "course");
  try {
    buildKrea2Course({ packageRoot: sourceRoot, outputRoot });
    const courseIndex = pageTextAndLinks(readFileSync(resolve(outputRoot, "index.html"), "utf8"));
    const courseMap = pageTextAndLinks(readFileSync(resolve(outputRoot, "course-map.html"), "utf8"));
    assert.ok(courseIndex.links.includes("../../index.html"));
    assert.ok(courseMap.links.includes("../../index.html"));
    assert.match(courseMap.text, /Teachme Sensei 目录/);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("publishes reader-facing prose and revision-pinned evidence links", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  const outputRoot = resolve(temporaryRoot, "course");
  try {
    buildKrea2Course({ packageRoot: sourceRoot, outputRoot });
    const htmlFiles = filesUnder(outputRoot).filter((path) => path.endsWith(".html"));
    const forbiddenCopy = /(?:\bnot\s+[^.!?]{0,160}\s+but\b|\bnot part of\b|\b(?:does|do) not require\b|\bnot treated as\b|不是[^。！？]{0,100}而是|并非[^。！？]{0,100}而是|不只是[^。！？]{0,100}而是|不等于|而不是)/i;
    const revision = "cf3c9102c924168699b90d97a2cb15059d761488";
    for (const path of htmlFiles) {
      const { text, links } = pageTextAndLinks(readFileSync(resolve(outputRoot, path), "utf8"));
      assert.doesNotMatch(text, forbiddenCopy, path);
      for (const href of links) {
        assert.doesNotMatch(href, /(?:sources\/|review\.md|MISSION\.md)/i, path + ": " + href);
        if (!/^https?:/i.test(href)) assert.doesNotMatch(href, /\.md(?:#|$)/i, path + ": " + href);
        if (/autoencoder\.py/i.test(href)) {
          assert.match(href, new RegExp("^https://github\\.com/krea-ai/krea-2/blob/" + revision + "/autoencoder\\.py#L1-L22$"));
        }
      }
    }
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects an incomplete approved source layout", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  try {
    rmSync(resolve(sourceRoot, "lessons/0028-final-synthesis.html"));
    assert.throws(
      () => buildKrea2Course({ packageRoot: sourceRoot, outputRoot: resolve(temporaryRoot, "course") }),
      /Krea2 lesson file set mismatch/,
    );
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects scripts before publishing Krea2 pages", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  try {
    const path = resolve(sourceRoot, "lessons/0028-final-synthesis.html");
    writeFileSync(path, readFileSync(path, "utf8").replace("</main>", "<script>globalThis.injected = true;</script></main>"));
    assert.throws(
      () => buildKrea2Course({ packageRoot: sourceRoot, outputRoot: resolve(temporaryRoot, "course") }),
      /Krea2 scripts are forbidden/,
    );
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects inline event handlers before publishing Krea2 pages", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  try {
    const path = resolve(sourceRoot, "lessons/0028-final-synthesis.html");
    writeFileSync(path, readFileSync(path, "utf8").replace("</main>", '<button onclick="globalThis.injected = true">probe</button></main>'));
    assert.throws(
      () => buildKrea2Course({ packageRoot: sourceRoot, outputRoot: resolve(temporaryRoot, "course") }),
      /Krea2 active content attribute is forbidden \(onclick\)/,
    );
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects script URL protocols before publishing Krea2 pages", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  try {
    const path = resolve(sourceRoot, "lessons/0028-final-synthesis.html");
    writeFileSync(path, readFileSync(path, "utf8").replace("</main>", '<a href="java&#x09;script:globalThis.injected=true">probe</a></main>'));
    assert.throws(
      () => buildKrea2Course({ packageRoot: sourceRoot, outputRoot: resolve(temporaryRoot, "course") }),
      /Krea2 script URL protocol is forbidden \(href\)/,
    );
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects script protocols introduced by Markdown link conversion", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  try {
    const path = resolve(sourceRoot, "lessons/0028-final-synthesis.html");
    writeFileSync(path, readFileSync(path, "utf8").replace("</main>", "<p>[probe](javascript:globalThis.injected=true)</p></main>"));
    assert.throws(
      () => buildKrea2Course({ packageRoot: sourceRoot, outputRoot: resolve(temporaryRoot, "course") }),
      /Krea2 script URL protocol is forbidden \(href\)/,
    );
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects source Markdown with the wrong heading levels", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  try {
    const path = resolve(sourceRoot, "sources/local-codebase.md");
    writeFileSync(path, readFileSync(path, "utf8").replaceAll("## ", "# "));
    assert.throws(
      () => buildKrea2Course({ packageRoot: sourceRoot, outputRoot: resolve(temporaryRoot, "course") }),
      /one H1 followed by four H2 sections/,
    );
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects code anchors outside the pinned revision file bounds", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  try {
    const path = resolve(sourceRoot, "reference/krea2-architecture.html");
    writeFileSync(path, readFileSync(path, "utf8").replace("../../autoencoder.py#L1-L47", "../../sampling.py#L1-L999"));
    assert.throws(
      () => buildKrea2Course({ packageRoot: sourceRoot, outputRoot: resolve(temporaryRoot, "course") }),
      /Krea2 code line anchor exceeds pinned file/,
    );
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects a non-empty output root instead of preserving stale files", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  const outputRoot = resolve(temporaryRoot, "course");
  try {
    mkdirSync(outputRoot);
    writeFileSync(resolve(outputRoot, "stale.html"), "stale\n");
    assert.throws(() => buildKrea2Course({ packageRoot: sourceRoot, outputRoot }), /output root must be empty/);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects a symlinked required source file", () => {
  const sourceRoot = createKrea2SourceFixture();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "krea2-adapter-test-"));
  const stylesheet = resolve(sourceRoot, "assets/course.css");
  const externalStylesheet = resolve(temporaryRoot, "external.css");
  try {
    writeFileSync(externalStylesheet, readFileSync(stylesheet, "utf8"));
    rmSync(stylesheet);
    symlinkSync(externalStylesheet, stylesheet);
    assert.throws(
      () => buildKrea2Course({ packageRoot: sourceRoot, outputRoot: resolve(temporaryRoot, "course") }),
      /stylesheet must be a regular file/,
    );
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
