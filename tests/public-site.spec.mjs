import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const manifest = JSON.parse(readFileSync(new URL("../scripts/public-site-manifest.json", import.meta.url), "utf8"));
const dependencies = JSON.parse(readFileSync(new URL("../scripts/external-dependencies.json", import.meta.url), "utf8"));
const runtimeHosts = new Set(dependencies.allowedRuntimeHosts);
const optionalRuntimeHosts = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

function pathFor(route) {
  return `/${route}`;
}

function canvasHash(canvas) {
  if (canvas.width === 0 || canvas.height === 0) return "empty";
  const encoded = canvas.toDataURL("image/png");
  let hash = 2166136261;
  for (let index = 0; index < encoded.length; index += Math.max(1, Math.floor(encoded.length / 4096))) {
    hash ^= encoded.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${canvas.width}x${canvas.height}:${hash >>> 0}`;
}

for (const route of manifest.htmlRoutes) {
  test(`route renders: ${route}`, async ({ page }) => {
    const runtimeFailures = [];
    const optionalFailures = [];
    const consoleErrors = [];
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      if (!runtimeHosts.has(url.hostname)) return;
      (optionalRuntimeHosts.has(url.hostname) ? optionalFailures : runtimeFailures).push(`${request.url()} ${request.failure()?.errorText ?? "request failed"}`);
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (!runtimeHosts.has(url.hostname) || response.status() >= 200 && response.status() < 300) return;
      (optionalRuntimeHosts.has(url.hostname) ? optionalFailures : runtimeFailures).push(`${response.url()} HTTP ${response.status()}`);
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

    const response = await page.goto(pathFor(route), { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBeGreaterThanOrEqual(200);
    expect(response?.status(), route).toBeLessThan(300);
    await page.waitForTimeout(350);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("link[rel~='icon']")).toHaveCount(1);
    expect(runtimeFailures, `${route} required runtime failures`).toEqual([]);
    expect(consoleErrors, `${route} console errors`).toEqual([]);
    if (optionalFailures.length) test.info().annotations.push({ type: "warning", description: optionalFailures.join("; ") });
  });
}

test("Pi search navigates across chapters", async ({ page }) => {
  await page.goto("/teach/pi/index.html", { waitUntil: "domcontentloaded" });
  await page.locator("#searchInput").fill("compaction");
  await expect(page.locator("#searchResults")).toHaveClass(/visible/);
  const result = page.locator("#searchResultsList a.result-item").first();
  await expect(result).toHaveAttribute("href", /chapters\/10-compaction\.html/);
  await result.click();
  await expect(page).toHaveURL(/\/teach\/pi\/chapters\/10-compaction\.html$/);
});

test("LingBot controls change and replay the Canvas state", async ({ page }) => {
  await page.goto("/teach/lingbot-video/index.html", { waitUntil: "domcontentloaded" });
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-runtime-ready", "true");
  await expect(canvas).toHaveAttribute("data-step-index", "0");
  const initial = await canvas.evaluate(canvasHash);
  expect(initial).not.toBe("empty");
  await page.locator('.hero-stage [data-action="next"]').click();
  await expect(canvas).toHaveAttribute("data-step-index", "1");
  await page.waitForTimeout(250);
  const advanced = await canvas.evaluate(canvasHash);
  expect(advanced).not.toBe(initial);
  await page.locator('.hero-stage [data-action="replay"]').click();
  await expect(canvas).toHaveAttribute("data-step-index", "0");
  await page.waitForTimeout(250);
  expect(await canvas.evaluate(canvasHash)).not.toBe(advanced);
});

test("representative pages have no serious axe violations", async ({ page }) => {
  for (const route of ["index.html", "teach/pi/index.html", "teach/lingbot-video/index.html"]) {
    await page.goto(pathFor(route), { waitUntil: "domcontentloaded" });
    if (route === "teach/lingbot-video/index.html") {
      await expect(page.locator("canvas").first()).toHaveAttribute("data-runtime-ready", "true");
    }
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
    expect(serious, `${route} axe violations`).toEqual([]);
  }
});
