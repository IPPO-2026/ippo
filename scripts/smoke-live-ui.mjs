// Contract tests with synthetic responses. These do not call or validate the real AI model.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHROME_CHANNEL || undefined,
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
await context.route("**/api/config", (route) =>
  route.fulfill({
    json: {
      mode: "live",
      turnstileSiteKey: "test-site",
      maxMessageLength: 1000,
      maxContextCharacters: 3200,
    },
  }),
);
await context.route(
  "https://challenges.cloudflare.com/turnstile/v0/api.js*",
  (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile={render(element,options){setTimeout(()=>options.callback('synthetic-single-use-token'),0);return 'test-widget'},remove(){}};`,
    }),
);
const page = await context.newPage();
await page.goto(process.env.IPPO_TEST_URL || "http://127.0.0.1:8787");
await page.getByRole("button", { name: "メニュー", exact: true }).click();
await page.getByRole("combobox").first().selectOption("ko");
await page.getByRole("button", { name: "닫기", exact: true }).click();
await page.getByRole("textbox").fill("안녕하세요");
assert.equal(
  await page
    .getByRole("button", { name: "메시지 보내기", exact: true })
    .isDisabled(),
  true,
  "live send requires consent",
);
// The consent section unmounts immediately after selection.
await page.getByRole("checkbox").click();
await page.waitForFunction(
  () => !document.querySelector(".send-button").disabled,
);
await context.route("**/api/chat", (route) =>
  route.fulfill({
    status: 429,
    json: {
      code: "daily_limit",
      error:
        "오늘 AI 이용 한도에 도달했어요. 오전 9시 이후 다시 대화할 수 있어요.",
    },
  }),
);
await page.getByRole("button", { name: "메시지 보내기", exact: true }).click();
await page.getByRole("alert").filter({ hasText: "한도" }).waitFor();
assert.equal(await page.locator(".message-row.assistant").count(), 0);
await context.unroute("**/api/chat");
await context.route("**/api/chat", (route) =>
  route.fulfill({ json: { mode: "demo", message: "DO NOT DISPLAY AS LIVE" } }),
);
await page.getByRole("textbox").fill("두 번째 테스트");
await page.waitForFunction(
  () => !document.querySelector(".send-button").disabled,
);
await page.getByRole("button", { name: "메시지 보내기", exact: true }).click();
await page
  .getByRole("alert")
  .filter({ hasText: "답변을 가져오지 못했어요" })
  .waitFor();
assert.equal(await page.getByText("DO NOT DISPLAY AS LIVE").count(), 0);
await context.unroute("**/api/chat");
await context.route("**/api/chat", (route) =>
  route.fulfill({
    json: {
      mode: "live",
      message: "책상 한 곳을 조금 정리해볼까요?",
      mission: "tidy",
    },
  }),
);
await page.getByRole("textbox").fill("작은 미션을 제안해 주세요");
await page.waitForFunction(
  () => !document.querySelector(".send-button").disabled,
);
await page.getByRole("button", { name: "메시지 보내기", exact: true }).click();
await page.getByRole("heading", { name: "내 주변, 딱 한 곳만." }).waitFor();
await page.getByRole("button", { name: "시작하기", exact: true }).click();
await page.getByRole("button", { name: "해냈어요", exact: true }).click();
await page
  .getByText("해냈어요. 이 한 걸음이면 충분해요.", { exact: true })
  .waitFor();
await context.unroute("**/api/chat");
let requestSeen;
const seen = new Promise((resolve) => (requestSeen = resolve));
let release;
const gate = new Promise((resolve) => (release = resolve));
await context.route("**/api/chat", async (route) => {
  requestSeen(route.request().postDataJSON());
  await gate;
  try {
    await route.fulfill({
      json: { mode: "live", message: "STALE RESPONSE MUST NOT RETURN" },
    });
  } catch {}
});
await page.getByRole("textbox").fill("늦게 도착할 응답 테스트");
await page.waitForFunction(
  () => !document.querySelector(".send-button").disabled,
);
await page.getByRole("button", { name: "메시지 보내기", exact: true }).click();
const payload = await seen;
assert.equal(payload.consent, true);
assert.equal(payload.locale, "ko");
assert.equal(payload.region, "JP");
assert.ok(payload.messages.length <= 8);
assert.ok(payload.messages.reduce((n, m) => n + m.content.length, 0) <= 3200);
assert.ok(payload.messages.every((m) => m.content.length <= 1000));
await page.getByRole("button", { name: "메뉴", exact: true }).click();
page.once("dialog", (d) => d.accept());
await page
  .getByRole("button", { name: "대화·한 걸음 기록 지우기", exact: true })
  .click();
release();
await page.getByRole("heading", { name: "오늘은 어떤 하루였나요?" }).waitFor();
assert.equal(await page.getByText("STALE RESPONSE MUST NOT RETURN").count(), 0);
assert.equal(await page.getByRole("checkbox").isChecked(), false);
console.log(
  "PASS: mocked live contract — consent, independent locale/region, localized quota error, no disguised demo response, bounded context and clear aborts pending response. This script does not call the real model.",
);
await browser.close();
