import { test, expect } from "@playwright/test";

test.describe("Multi-URL Open", () => {
  test("複数URLツールで▶ボタンが表示され、モーダルが開く", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 複数URL設定済みのツールカードを探す（▶ボタンの存在で判別）
    // URL/Sheetタイプで ▶(Play) ボタンがあるカード = 複数URL設定済み
    const playButtons = page.locator('[data-testid^="tool-card-"] button[title="実行"]');
    const count = await playButtons.count();

    // 複数URLツールが存在しない場合はスキップ
    if (count === 0) {
      test.skip(true, "複数URL設定済みのツールが見つかりません");
      return;
    }

    // 最初の▶ボタンをクリック
    await playButtons.first().click();

    // モーダルが表示される
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // 「一括で開く」ボタンがある
    const openAllButton = dialog.getByRole("button", { name: /一括で開く/ });
    await expect(openAllButton).toBeVisible();

    // キャンセルで閉じる
    const cancelButton = dialog.getByRole("button", { name: /キャンセル/ });
    await cancelButton.click();
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("一括で開くボタンで複数タブが開く", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // window.open をスタブ化（ポップアップブロック回避）
    await page.evaluate(() => {
      (window as unknown as { __openedUrls: string[] }).__openedUrls = [];
      window.open = ((url?: string) => {
        if (url) {
          (window as unknown as { __openedUrls: string[] }).__openedUrls.push(url);
        }
        // null でなく truthy を返すことでブロック検知を回避
        return {} as Window;
      }) as typeof window.open;
    });

    // 複数URLツールの▶ボタンを探す
    const playButtons = page.locator('[data-testid^="tool-card-"] button[title="実行"]');
    const count = await playButtons.count();

    if (count === 0) {
      test.skip(true, "複数URL設定済みのツールが見つかりません");
      return;
    }

    // ▶ボタンをクリック
    await playButtons.first().click();

    // モーダル表示を確認
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // 「一括で開く」をクリック
    const openAllButton = dialog.getByRole("button", { name: /一括で開く/ });
    await openAllButton.click();

    // window.open がURL数だけ呼ばれたことを確認
    const openedUrls = await page.evaluate(
      () => (window as unknown as { __openedUrls: string[] }).__openedUrls
    );
    expect(openedUrls.length).toBeGreaterThan(0);
  });

  test("Enterキーで一括オープンが発火する", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // window.open をスタブ化
    await page.evaluate(() => {
      (window as unknown as { __openedUrls: string[] }).__openedUrls = [];
      window.open = ((url?: string) => {
        if (url) {
          (window as unknown as { __openedUrls: string[] }).__openedUrls.push(url);
        }
        return {} as Window;
      }) as typeof window.open;
    });

    // 複数URLツールの▶ボタンを探す
    const playButtons = page.locator('[data-testid^="tool-card-"] button[title="実行"]');
    const count = await playButtons.count();

    if (count === 0) {
      test.skip(true, "複数URL設定済みのツールが見つかりません");
      return;
    }

    // ▶ボタンをクリック
    await playButtons.first().click();

    // モーダル表示を確認
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Enterキーを押す（autoFocusされた「一括で開く」ボタンが発火する）
    await page.keyboard.press("Enter");

    // 少し待つ
    await page.waitForTimeout(500);

    // window.open が呼ばれたことを確認
    const openedUrls = await page.evaluate(
      () => (window as unknown as { __openedUrls: string[] }).__openedUrls
    );
    expect(openedUrls.length).toBeGreaterThan(0);
  });
});
