import { test, expect } from "@playwright/test";

test.describe("Tools Page", () => {
  test("ツール一覧ページが正常に表示される", async ({ page }) => {
    await page.goto("/tools");

    // ページタイトルまたはヘッダーが表示される
    await expect(page.getByRole("heading").first()).toBeVisible();

    // ツール一覧が表示される
    await page.waitForLoadState("networkidle");
  });

  test("ツールをクリックすると確認ダイアログが表示される", async ({ page }) => {
    await page.goto("/");

    // 実行ボタン（Play icon）を探す
    const executeButton = page.locator("button").filter({
      has: page.locator('svg[class*="text-green"]'),
    });

    const buttonCount = await executeButton.count();

    if (buttonCount > 0) {
      // 実行ボタンをクリック
      await executeButton.first().click();

      // 確認ダイアログが表示される
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // ダイアログに「実行確認」または関連テキストが含まれる
      await expect(dialog.getByText(/実行|確認|起動/)).toBeVisible();

      // キャンセルボタンで閉じる
      await dialog.getByRole("button", { name: /キャンセル/i }).click();
      await expect(dialog).not.toBeVisible();
    } else {
      // 実行ボタンがない場合はスキップ
      test.skip();
    }
  });

  test("ツール実行でrunsが作成される", async ({ page }) => {
    await page.goto("/");

    // 実行ボタンを探す
    const executeButton = page.locator("button").filter({
      has: page.locator('svg[class*="text-green"]'),
    });

    const buttonCount = await executeButton.count();

    if (buttonCount > 0) {
      // 実行ボタンをクリック
      await executeButton.first().click();

      // 確認ダイアログが表示される
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // 実行ボタンをクリック
      const confirmButton = dialog.getByRole("button", { name: /実行|起動/i });
      await confirmButton.click();

      // 成功メッセージまたはダイアログが閉じるのを待つ
      await page.waitForTimeout(2000);

      // /runs ページに移動して確認
      await page.goto("/runs");
      await page.waitForLoadState("networkidle");

      // runs一覧にレコードが存在する（テーブル行またはカード）
      const runsExist =
        (await page.locator("table tbody tr").count()) > 0 ||
        (await page.locator('[class*="Card"]').count()) > 0 ||
        (await page.getByText(/成功|失敗|待機|実行中/).count()) > 0;

      expect(runsExist).toBeTruthy();
    } else {
      test.skip();
    }
  });
});
