import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
let revision = 1;
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path.startsWith("/api/")) {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        mode: "demo",
        turnstileSiteKey: null,
        maxMessageLength: 1000,
        maxContextCharacters: 3200,
      }),
    );
    return;
  }
  try {
    let body = await readFile(
      resolve("dist", path === "/" ? "index.html" : `.${path}`),
    );
    if (path === "/sw.js")
      body = Buffer.from(
        body
          .toString()
          .replace(/ippo-shell-([a-f0-9]+)/g, `ippo-shell-$1-test${revision}`),
      );
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] || "text/html",
      "Cache-Control": "no-cache",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHROME_CHANNEL || undefined,
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.getByRole("combobox").first().selectOption("ko");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  const manifest = await page.evaluate(async () =>
    (await fetch("/manifest.webmanifest")).json(),
  );
  assert.equal(manifest.display, "standalone");
  assert.deepEqual(
    manifest.icons.map((i) => i.sizes),
    ["192x192", "512x512"],
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
    true,
  );
  const send = page.getByRole("button", { name: "메시지 보내기", exact: true });
  await page.getByRole("textbox").fill("업데이트 전 초안");
  revision = 2;
  await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration()).update(),
  );
  await page
    .getByRole("button", { name: "지금 업데이트", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("textbox").inputValue(),
    "업데이트 전 초안",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "지금 업데이트", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      navigator.serviceWorker.controller &&
      !document.querySelector(".connection-banner"),
  );
  await page.getByRole("textbox").fill("피곤해요. 작은 미션을 제안해 주세요");
  await send.click();
  await page.getByRole("button", { name: "시작하기", exact: true }).click();
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "해냈어요", exact: true }).waitFor();
  await page.getByRole("textbox").fill("오프라인");
  assert.equal(await send.isDisabled(), true);
  await page.getByRole("button", { name: "해냈어요", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("ippo.history.v1")).messages.at(-1)
          .mission.status,
    ),
    "completed",
  );
  const cached = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (k) =>
          (await (await caches.open(k)).keys()).map(
            (r) => new URL(r.url).pathname,
          ),
        ),
      )
    ).flat(),
  );
  assert(cached.length > 0);
  assert(!cached.some((p) => p.startsWith("/api/")));
  await context.setOffline(false);
  await page.waitForFunction(
    () => !document.querySelector(".connection-banner"),
  );
  assert.equal(await send.isEnabled(), true);
  assert.deepEqual(errors, []);
  console.log(
    "PWA passed: real SW install/update, draft preserved until consent, offline reload/mission, no API cache, reconnect, mobile viewport.",
  );
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
