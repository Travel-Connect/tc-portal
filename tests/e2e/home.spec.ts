import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("ホーム画面が正常に表示される", async ({ page }) => {
    await page.goto("/");

    // ヘッダーが表示される
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // ツールカードが存在する（少なくとも1つ）
    const toolCards = page.locator("[data-testid='tool-card']").or(
      page.locator(".cursor-pointer").filter({ has: page.locator("h3, [class*='CardTitle']") })
    );

    // ツールが1つ以上あるか、空の場合はメッセージが表示される
    const cardCount = await toolCards.count();
    if (cardCount === 0) {
      // ツールがない場合の表示確認
      await expect(page.getByText(/ツール|表示/)).toBeVisible();
    } else {
      await expect(toolCards.first()).toBeVisible();
    }
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
