import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const base = process.env.IPPO_TEST_URL || "http://127.0.0.1:8787";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHROME_CHANNEL || undefined,
});
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("dialog", (d) => d.accept());
    await page.goto(base);
    await page.getByRole("heading", { name: "今日は、どんな一日？" }).waitFor();
    assert.doesNotMatch(
      await page.locator(".conversation-app").evaluate((element) =>
        getComputedStyle(element).fontFamily,
      ),
      /Pretendard/,
      "Japanese keeps its existing font stack",
    );
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode())),
    );
    await page.screenshot({
      path: `artifacts/${width === 390 ? "mobile" : "desktop"}-ja.png`,
    });
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page.getByRole("combobox").first().selectOption("ko");
    await page.getByRole("button", { name: "닫기", exact: true }).click();
    assert.match(
      await page.locator(".conversation-app").evaluate((element) =>
        getComputedStyle(element).fontFamily,
      ),
      /Pretendard Variable/,
      "Korean uses Pretendard",
    );
    if (width === 390) {
      await page.getByRole("textbox").focus();
      await page.setViewportSize({ width: 390, height: 500 });
      await page.waitForFunction(
        () => document.documentElement.dataset.keyboardOpen === "true",
      );
      assert.equal(
        await page.locator(".composer-caption").evaluate(
          (element) => getComputedStyle(element).display,
        ),
        "none",
        "secondary composer copy is hidden while the keyboard is open",
      );
      assert.equal(
        await page.locator(".welcome-symbol").evaluate(
          (element) => getComputedStyle(element).display,
        ),
        "none",
        "decorative welcome content yields space to the conversation",
      );
      const compactComposer = await page
        .locator(".conversation-composer")
        .boundingBox();
      assert(compactComposer.y + compactComposer.height <= 500);
      await page.getByRole("textbox").blur();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(
        () => !document.documentElement.dataset.keyboardOpen,
      );
    }
    await page.screenshot({
      path: `artifacts/${width === 390 ? "mobile" : "desktop"}-ko.png`,
    });
    assert(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    );
    assert.equal(
      await page.locator(".inline-mission").count(),
      0,
      "no unrelated mission before conversation",
    );
    for (let turn = 0; turn < 3; turn++) {
      await page.getByRole("textbox").fill("조금 지친 것 같아요");
      await page.getByRole("button", { name: "메시지 보내기", exact: true }).click();
      assert.equal(await page.locator(".inline-mission").count(), 0, "early conversation has no mission");
    }
    await page.getByRole("textbox").fill("피곤해요. 작은 미션을 제안해 주세요");
    await page
      .getByRole("button", { name: "메시지 보내기", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "물, 한 모금 마셔볼까요." })
      .waitFor();
    await page.getByRole("button", { name: "시작하기", exact: true }).click();
    await page.getByRole("button", { name: "해냈어요", exact: true }).click();
    await page
      .getByText("해냈어요. 이 한 걸음이면 충분해요.", { exact: true })
      .waitFor();
    await page.screenshot({
      path: `artifacts/${width === 390 ? "mobile" : "desktop"}-mission.png`,
    });
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ippo.history.v1")),
      null,
    );
    await page.getByRole("button", { name: "메뉴", exact: true }).click();
    await page.getByRole("switch").check();
    await page.getByRole("button", { name: "닫기", exact: true }).click();
    await page.reload();
    await page
      .getByText("해냈어요. 이 한 걸음이면 충분해요.", { exact: true })
      .waitFor();
    await page.getByRole("textbox").fill("음악 미션을 추천해 주세요");
    await page
      .getByRole("button", { name: "메시지 보내기", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "좋아하는 음악, 딱 한 곡." })
      .waitFor();
    await page
      .getByRole("button", { name: "나중에 할게요", exact: true })
      .click();
    await page
      .getByText("괜찮아요. 마음이 내킬 때 다시 해봐요.", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "메뉴", exact: true }).click();
    await page
      .getByRole("button", { name: "대화·한 걸음 기록 지우기", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "오늘은 어떤 하루였나요?" })
      .waitFor();
    assert.equal(await page.locator(".inline-mission").count(), 0);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ippo.history.v1")),
      null,
    );
    const bounds = await page.locator(".conversation-composer").boundingBox();
    assert(bounds.y + bounds.height <= (width === 390 ? 844 : 1000));
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    "PASS: ja/ko 1440/390 single conversation, contextual missions/start/complete/defer, opt-in persistence/delete, viewport and no browser errors.",
  );
} finally {
  await browser.close();
}
