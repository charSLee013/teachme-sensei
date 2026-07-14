import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const copyEditSets = [
  "krea2-copy-edits.json",
  "krea2-style-edits.json",
].map((file) => JSON.parse(readFileSync(resolve(repoRoot, "scripts/course-adapters", file), "utf8")));

export const KREA2_LESSON_FILES = [
  "0001-repository-as-research-object.html", "0002-tensors-and-shapes.html", "0003-probability-and-noise.html",
  "0004-neural-network-inference.html", "0005-tokenization-and-conditioning.html", "0006-attention-and-gqa.html",
  "0007-rope-and-position.html", "0008-vae-latent-space.html", "0009-diffusion-and-flow-matching.html",
  "0010-cfg-and-sampling.html", "0011-dit-and-mmdit.html", "0012-krea2-pipeline-trace.html",
  "0013-code-to-tensor-trace.html", "0014-hardware-and-performance.html", "0015-experiment-design.html",
  "0016-metrics-and-error-analysis.html", "0017-reproducibility-protocol.html", "0018-paper-reading.html",
  "0019-related-work.html", "0020-abstract-and-introduction.html", "0021-method-and-equations.html",
  "0022-experiments-and-tables.html", "0023-figures-and-captions.html", "0024-limitations-and-negative-results.html",
  "0025-reviewer-objections.html", "0026-rebuttal-and-defense.html", "0027-capstone-paper.html", "0028-final-synthesis.html",
];

export const KREA2_REFERENCE_FILES = [
  "experiment-record-template.html", "krea2-architecture.html", "paper-writing-checklist.html",
  "sampler-and-scheduler.html", "tensor-shape-atlas.html", "terminology.html",
];

export const KREA2_SOURCE_FILES = [
  "acm-mm-and-ccf-context.md", "diffusers-krea2-pipeline.md", "flow-matching-papers.md",
  "krea2-official-sources.md", "local-codebase.md", "qwen3vl-and-qwen-image.md",
  "reproducibility-and-evaluation.md", "transformer-and-dit-papers.md", "vae-and-diffusion-papers.md",
];

function write(root, path, content) {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function fixtureHtml(route) {
  const paragraphs = copyEditSets.flatMap((edits) => edits[route] ?? []).map(([before]) => "<p>" + escapeHtml(before) + "</p>").join("");
  const links = route === "course-map.html"
    ? '<a href="../README.md">README</a><a href="sources/local-codebase.md">sources</a><a href="review.md">review</a>'
    : route === "reference/krea2-architecture.html"
      ? '<a href="../../autoencoder.py#L1-L47">autoencoder</a>'
      : route === "lessons/0001-repository-as-research-object.html"
        ? "<details><summary>Fixture answer</summary><p>Fixture details.</p></details>"
        : "";
  const stylesheet = route.includes("/") ? "../assets/course.css" : "assets/course.css";
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fixture</title><link rel="stylesheet" href="' +
    stylesheet + '"></head><body><main><h1>Fixture</h1>' + paragraphs + links + "</main></body></html>\n";
}

export function createKrea2SourceFixture(root = mkdtempSync(join(tmpdir(), "krea2-source-fixture-"))) {
  write(root, "course-map.html", fixtureHtml("course-map.html"));
  write(root, "assets/course.css", "body { color: #17212b; }\n");
  for (const file of KREA2_LESSON_FILES) write(root, "lessons/" + file, fixtureHtml("lessons/" + file));
  for (const file of KREA2_REFERENCE_FILES) write(root, "reference/" + file, fixtureHtml("reference/" + file));
  for (const file of KREA2_SOURCE_FILES) {
    const title = file === "local-codebase.md" ? "Local Codebase" : file.replace(".md", "");
    const scope = file === "krea2-official-sources.md"
      ? "Marketing claims, leaderboard positions, and hosted-product behavior are not treated as controlled evidence for the local inference ablation."
      : "Fixture scope.";
    write(
      root,
      "sources/" + file,
      "# " + title + "\n\n## Source\n\n- [Official](https://github.com/krea-ai/krea-2)\n\n## What It Supports\n\nFixture support.\n\n## Teaching Use\n\nFixture teaching use.\n\n## Scope\n\n" + scope + "\n",
    );
  }
  return root;
}
