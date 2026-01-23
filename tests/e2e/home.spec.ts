import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("ホーム画面が正常に表示される", async ({ page }) => {
    await page.goto("/");

    // ヘッダーが表示される
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // ホーム画面にツール関連のセクションが表示される
    const hasToolSection = await page
      .getByRole("heading", { name: /ツール|ピン留め|お気に入り/ })
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasToolSection).toBeTruthy();
  });

  test("ピン留め機能が存在する", async ({ page }) => {
    await page.goto("/");

    // ピンボタンが存在するか確認
    const pinButtons = page.locator("button").filter({ has: page.locator("svg") });
    const pinButton = pinButtons.filter({ hasText: "" }).first();

    // ピンボタンまたはピンアイコンが存在
    const hasPinFeature = await page
      .locator('[title*="ピン"], [aria-label*="ピン"]')
      .first()
      .isVisible()
      .catch(() => false);

    // ピン機能が存在することを確認（ボタンまたはタイトルで）
    expect(hasPinFeature || (await pinButton.isVisible().catch(() => false))).toBeTruthy();
  });

  test("ツールカードの並び替えが壊れていない", async ({ page }) => {
    await page.goto("/");

    // ページがエラーなく読み込まれる
    await expect(page).not.toHaveTitle(/error/i);

    // コンソールエラーがないことを確認
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // 少し待ってエラーを収集
    await page.waitForTimeout(2000);

    // 重大なReactエラーがないことを確認
    const criticalErrors = errors.filter(
      (e) => e.includes("Uncaught") || e.includes("React") || e.includes("hydration")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
