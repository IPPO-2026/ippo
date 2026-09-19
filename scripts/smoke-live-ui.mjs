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
      body: `window.turnstile={render(element,options){window.__verificationOptions=options;setTimeout(()=>options.callback('synthetic-single-use-token'),0);return 'test-widget'},remove(){}};`,
    }),
);
const page = await context.newPage();
const baseUrl = process.env.IPPO_TEST_URL || "http://127.0.0.1:8787";
await page.goto(baseUrl);
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
await page.getByText('이야기할 준비가 됐어요', {exact:true}).waitFor();
assert.equal(await page.evaluate(() => window.__verificationOptions.appearance), 'interaction-only');
await page.evaluate(() => window.__verificationOptions['expired-callback']());
assert.equal(await page.locator('.send-button').isDisabled(), true);
await page.getByText('안전하게 연결하고 있어요', {exact:true}).waitFor();
await page.evaluate(() => window.__verificationOptions['before-interactive-callback']());
await page.getByText('아래 확인을 완료해 주세요', {exact:true}).waitFor();
await page.evaluate(() => window.__verificationOptions['error-callback']());
await page.getByText('연결을 다시 확인해 주세요', {exact:true}).waitFor();
await page.locator('.verification-retry').click();
await page.getByText('이야기할 준비가 됐어요', {exact:true}).waitFor();
assert.equal(await page.locator('.send-button').isEnabled(), true);
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
await context.route("https://js.tosspayments.com/v2/standard", (route) =>
  route.fulfill({
    contentType: "application/javascript",
    body: `window.TossPayments=()=>({widgets:()=>({
      setAmount:async amount=>{window.__paymentAmount=amount},
      renderPaymentMethods:async({selector})=>{document.querySelector(selector).innerHTML='<div data-testid="toss-methods">간편결제 선택 데모</div>';return{destroy:async()=>{}}},
      renderAgreement:async({selector})=>{document.querySelector(selector).innerHTML='<div data-testid="toss-agreement">테스트 약관</div>';return{destroy:async()=>{}}},
      requestPayment:async request=>{window.__paymentRequest=request}
    })});`,
  }),
);
await context.route("**/api/demo-topup/order", (route) =>
  route.fulfill({
    json: {
      orderId: "IPPO_DEMO_serverowned1234567890",
      amount: 1000,
      extraUses: 10,
    },
  }),
);
await context.route("**/api/demo-topup/confirm", (route) =>
  route.fulfill({ json: { granted: true, extraUses: 10 } }),
);
await page.getByRole("button", { name: "메시지 보내기", exact: true }).click();
await page.getByRole("alert").filter({ hasText: "한도" }).waitFor();
assert.equal(await page.locator(".message-row.assistant").count(), 0);
await page.getByRole("button", { name: "추가 결제하기", exact: true }).click();
await page
  .getByRole("heading", { name: "대화 이용권 결제 데모", exact: true })
  .waitFor();
await page.getByText("간편결제 선택 데모", { exact: true }).waitFor();
assert.deepEqual(await page.evaluate(() => window.__paymentAmount), {
  currency: "KRW",
  value: 1000,
});
await page
  .getByRole("button", { name: "데모 결제 진행하기", exact: true })
  .click();
assert.equal(
  await page.evaluate(() => window.__paymentRequest.orderName),
  "잇포 추가 대화 10회 (데모)",
);
assert.equal(
  await page.evaluate(() => window.__paymentRequest.orderId),
  "IPPO_DEMO_serverowned1234567890",
);
await page
  .getByRole("button", { name: "결제 데모 닫기", exact: true })
  .click();
await page
  .getByRole("button", { name: "대화에서 작은 미션 찾기", exact: true })
  .click();
await page.getByText("기기에서 고른 한 걸음", { exact: true }).waitFor();
await page.getByRole("heading", { name: "창밖을, 잠깐 바라봐요." }).waitFor();
await page
  .locator(".inline-mission", {
    has: page.getByRole("heading", { name: "창밖을, 잠깐 바라봐요." }),
  })
  .getByRole("button", { name: "나중에 할게요", exact: true })
  .click();
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
await page.goto(
  `${baseUrl}/?paymentDemo=success&paymentKey=test_payment_key_1234567890&orderId=IPPO_DEMO_serverowned1234567890&amount=1000`,
);
await page
  .getByRole("heading", { name: "오늘의 대화 10회가 추가됐어요" })
  .waitFor();
console.log(
  "PASS: mocked live contract — consent, independent locale/region, localized quota error, no disguised demo response, bounded context and clear aborts pending response. This script does not call the real model.",
);
await browser.close();
