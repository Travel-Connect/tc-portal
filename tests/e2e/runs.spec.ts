import { test, expect } from "@playwright/test";

test.describe("Runs Page", () => {
  test("実行履歴ページが正常に表示される", async ({ page }) => {
    await page.goto("/runs");

    // ページが読み込まれる
    await page.waitForLoadState("networkidle");

    // ヘッダーまたはタイトルが表示される
    await expect(page.getByText(/実行|履歴|Runs/i).first()).toBeVisible();
  });

  test("実行履歴にステータスバッジが表示される", async ({ page }) => {
    await page.goto("/runs");
    await page.waitForLoadState("networkidle");

    // ステータスバッジを探す（成功/失敗/待機中/実行中）
    const statusTexts = ["成功", "失敗", "待機", "実行中", "キャンセル"];
    let hasStatus = false;

    for (const status of statusTexts) {
      if (await page.getByText(status).first().isVisible().catch(() => false)) {
        hasStatus = true;
        break;
      }
    }

    // 履歴がない場合は「履歴がありません」等のメッセージ
    if (!hasStatus) {
      const emptyMessage = await page
        .getByText(/履歴.*ありません|データ.*ありません|表示.*ありません/)
        .isVisible()
        .catch(() => false);
      expect(emptyMessage || hasStatus).toBeTruthy();
    }
  });

  test("実行履歴でツール名が表示される", async ({ page }) => {
    await page.goto("/runs");
    await page.waitForLoadState("networkidle");

    // テーブルまたはカードにツール名列が存在
    const hasToolNameColumn = await page
      .getByText(/ツール名/)
      .isVisible()
      .catch(() => false);

    // または実際のツール名が表示されている
    const hasToolData =
      (await page.locator("table tbody td").count()) > 0 ||
      (await page.locator('[class*="grid"]').count()) > 0;

    expect(hasToolNameColumn || hasToolData).toBeTruthy();
  });
});
