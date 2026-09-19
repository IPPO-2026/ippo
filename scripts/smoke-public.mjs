import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const url = process.env.IPPO_TEST_URL;
if (!url?.startsWith("https://"))
  throw Error("Set IPPO_TEST_URL to the deployed HTTPS URL.");
const profile = await mkdtemp(join(tmpdir(), "ippo-public-"));
let context;
try {
  for (const width of [390, 1440]) {
    context = await chromium.launchPersistentContext(
      join(profile, String(width)),
      {
        channel: process.env.PLAYWRIGHT_CHROME_CHANNEL || undefined,
        viewport: { width, height: width === 390 ? 844 : 1000 },
      },
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(url);
    await page.getByRole("heading", { name: "今日は、どんな一日？" }).waitFor();
    await page.getByRole("checkbox").waitFor();
    assert.equal(
      (await (await context.request.get(`${url}/api/config`)).json()).mode,
      "live",
    );
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert(
      await page.evaluate(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      ),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page.getByRole("combobox").first().selectOption("ko");
    await page.getByRole("button", { name: "닫기", exact: true }).click();
    await page
      .getByRole("heading", { name: "오늘은 어떤 하루였나요?" })
      .waitFor();
    await page.screenshot({ path: `artifacts/public-${width}.png` });
    const composer = await page.locator(".conversation-composer").boundingBox();
    assert(composer.y + composer.height <= (width === 390 ? 844 : 1000));
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    const install = await cdp.send("Page.getInstallabilityErrors");
    assert.deepEqual(install.installabilityErrors, []);
    assert.deepEqual(errors, [], "Online browser errors");
    errors.length = 0;
    await context.setOffline(true);
    await page.reload();
    await page
      .getByRole("heading", { name: "오늘은 어떤 하루였나요?" })
      .waitFor();
    await page.getByRole("textbox").fill("오프라인 테스트");
    assert(
      await page
        .getByRole("button", { name: "메시지 보내기", exact: true })
        .isDisabled(),
    );
    // An offline /api/config network error is expected and must not be cached.
    assert.deepEqual(errors.filter(e => !e.includes("ERR_INTERNET_DISCONNECTED") && !e.includes("net::ERR_FAILED")), [], "Unexpected offline error");
    await context.close();
  }
  console.log(
    "PASS public HTTPS: live config, 390/1440 ja/ko, images/layout, PWA installability, offline reload and blocked send. No chat sent by this script.",
  );
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
