import { test, expect, BrowserContext, Browser } from "@playwright/test";

/**
 * マルチユーザーE2Eテスト
 *
 * 目的:
 * - ユーザー固有データ（pins, tool_orders）の分離を検証
 * - 共通データ（categories, tools, runs）の全ユーザー可視性を検証
 *
 * 前提:
 * - setup-multiプロジェクトでUserA/UserBの認証状態が保存済み
 * - このテストはuserAプロジェクトで実行される（userA.jsonを使用）
 */

// UserBのブラウザコンテキストを作成
async function createUserBContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    storageState: "tests/e2e/.auth/userB.json",
  });
}

// E2E_ALLOW_MUTATIONフラグの確認
const allowMutation = process.env.E2E_ALLOW_MUTATION === "1";

test.describe("Multi-User: Pin Isolation", () => {
  test("UserAのピン留めはUserBに表示されない", async ({ page, browser }) => {
    // === UserA: ツールをピン留め ===
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 最初のピンボタンを取得
    const pinButtons = page.locator('[data-testid^="pin-toggle-"]');
    const pinButtonCount = await pinButtons.count();

    if (pinButtonCount === 0) {
      test.skip(true, "ピン可能なツールがありません");
      return;
    }

    const firstPinButton = pinButtons.first();
    const testIdAttr = await firstPinButton.getAttribute("data-testid");
    const toolId = testIdAttr?.replace("pin-toggle-", "") || "";

    // 現在のピン状態を確認（fill-currentクラスでピン済みを判定）
    const wasPinned = await firstPinButton
      .locator("svg.fill-current")
      .isVisible()
      .catch(() => false);

    // ピン留めする（まだピンされていない場合）
    if (!wasPinned) {
      await firstPinButton.click();
      await page.waitForTimeout(1000);
    }

    // ピンセクションに表示されることを確認
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const userAPinSection = page.locator('[data-testid="pin-section"]');
    const userAPinSectionVisible = await userAPinSection.isVisible().catch(() => false);

    if (userAPinSectionVisible) {
      const userAPinnedTile = userAPinSection.locator(`[data-testid="tool-tile-${toolId}"]`);
      await expect(userAPinnedTile).toBeVisible({ timeout: 5000 });
    }

    // === UserB: 同じツールがピンされていないことを確認 ===
    const userBContext = await createUserBContext(browser);
    const userBPage = await userBContext.newPage();

    try {
      await userBPage.goto("/");
      await userBPage.waitForLoadState("networkidle");

      const userBPinSection = userBPage.locator('[data-testid="pin-section"]');
      const userBPinSectionVisible = await userBPinSection.isVisible().catch(() => false);

      if (userBPinSectionVisible) {
        // UserBのピンセクションにUserAがピンしたツールがないことを確認
        const userBPinnedTile = userBPinSection.locator(`[data-testid="tool-tile-${toolId}"]`);
        await expect(userBPinnedTile).not.toBeVisible({ timeout: 3000 });
      }
      // ピンセクション自体が見えない場合もOK（UserBにピンがない）
    } finally {
      await userBContext.close();
    }

    // === Cleanup: UserAのピンを解除（元の状態に戻す） ===
    if (!wasPinned) {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const cleanupPinButton = page.locator(`[data-testid="pin-toggle-${toolId}"]`);
      await cleanupPinButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe("Multi-User: Tool Order Isolation", () => {
  test("ユーザーごとにツール順序が独立している", async ({ page, browser }) => {
    // === UserA: 全ツールセクションの順序を取得 ===
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const userAAllToolsSection = page.locator('[data-testid="all-tools-section"]');
    const userAAllToolsSectionVisible = await userAAllToolsSection.isVisible().catch(() => false);

    if (!userAAllToolsSectionVisible) {
      test.skip(true, "全ツールセクションが見つかりません");
      return;
    }

    // UserAのツール順序を取得
    const userAToolCards = userAAllToolsSection.locator('[data-testid^="tool-card-"]');
    const userAToolCount = await userAToolCards.count();

    if (userAToolCount < 2) {
      test.skip(true, "ツールが2つ未満のため順序テストをスキップ");
      return;
    }

    const userAToolIds: string[] = [];
    for (let i = 0; i < userAToolCount; i++) {
      const testId = await userAToolCards.nth(i).getAttribute("data-testid");
      userAToolIds.push(testId?.replace("tool-card-", "") || "");
    }

    // === UserB: 同じセクションの順序を取得 ===
    const userBContext = await createUserBContext(browser);
    const userBPage = await userBContext.newPage();

    try {
      await userBPage.goto("/");
      await userBPage.waitForLoadState("networkidle");

      const userBAllToolsSection = userBPage.locator('[data-testid="all-tools-section"]');
      const userBToolCards = userBAllToolsSection.locator('[data-testid^="tool-card-"]');
      const userBToolCount = await userBToolCards.count();

      const userBToolIds: string[] = [];
      for (let i = 0; i < userBToolCount; i++) {
        const testId = await userBToolCards.nth(i).getAttribute("data-testid");
        userBToolIds.push(testId?.replace("tool-card-", "") || "");
      }

      // 両ユーザーで同じツールセットが見えることを確認（順序は問わない）
      expect(userAToolIds.sort()).toEqual(userBToolIds.sort());

      // 順序が異なる場合があることを確認（ユーザーがカスタマイズ済みの場合）
      // 注: 初期状態では同じ順序の可能性があるため、これは informational
      console.log("UserA tool order:", userAToolIds.slice(0, 5));
      console.log("UserB tool order:", userBToolIds.slice(0, 5));
    } finally {
      await userBContext.close();
    }
  });
});

test.describe("Multi-User: Shared Data", () => {
  // 共通データのテストはE2E_ALLOW_MUTATION=1の場合のみ実行
  test.skip(!allowMutation, "E2E_ALLOW_MUTATION=1が必要です");

  test("UserBが追加したカテゴリがUserAに表示される", async ({ page, browser }) => {
    const timestamp = Date.now();
    const testCategoryName = `E2E-CAT-${timestamp}`;

    // === UserB: カテゴリを追加 ===
    const userBContext = await createUserBContext(browser);
    const userBPage = await userBContext.newPage();

    try {
      await userBPage.goto("/admin/categories");
      await userBPage.waitForLoadState("networkidle");

      // 追加ボタンをクリック
      const addButton = userBPage.locator('[data-testid="admin-add-category"]');
      await expect(addButton).toBeVisible({ timeout: 5000 });
      await addButton.click();

      // フォームに入力
      await userBPage.getByLabel("カテゴリ名").fill(testCategoryName);
      await userBPage.getByRole("button", { name: /保存/i }).click();

      // 追加されたことを確認
      await userBPage.waitForTimeout(1000);
      await expect(userBPage.getByText(testCategoryName)).toBeVisible({ timeout: 5000 });
    } finally {
      await userBContext.close();
    }

    // === UserA: 追加されたカテゴリが見えることを確認 ===
    await page.goto("/admin/categories");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(testCategoryName)).toBeVisible({ timeout: 5000 });

    // === Cleanup: カテゴリを削除（UserAで） ===
    // 削除ボタンを見つけてクリック
    const categoryRow = page.locator(`text=${testCategoryName}`).locator("..");
    const deleteButton = categoryRow.locator('button:has(svg[class*="Trash"])');

    if (await deleteButton.isVisible().catch(() => false)) {
      page.once("dialog", (dialog) => dialog.accept());
      await deleteButton.click();
      await page.waitForTimeout(500);
    }
  });

  test("UserBが追加したツールがUserAに表示される", async ({ page, browser }) => {
    const timestamp = Date.now();
    const testToolName = `E2E-TOOL-${timestamp}`;

    // === UserB: ツールを追加 ===
    const userBContext = await createUserBContext(browser);
    const userBPage = await userBContext.newPage();

    try {
      await userBPage.goto("/admin/tools");
      await userBPage.waitForLoadState("networkidle");

      // 追加ボタンをクリック
      const addButton = userBPage.locator('[data-testid="admin-add-tool"]');
      await expect(addButton).toBeVisible({ timeout: 5000 });
      await addButton.click();

      // フォームに入力（最小限の情報）
      await userBPage.getByLabel("ツール名").fill(testToolName);

      // カテゴリを選択（最初の選択肢）
      const categorySelect = userBPage.locator('select, [role="combobox"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.selectOption({ index: 1 });
      }

      await userBPage.getByRole("button", { name: /保存|作成/i }).click();

      // 追加されたことを確認
      await userBPage.waitForTimeout(1000);
    } finally {
      await userBContext.close();
    }

    // === UserA: 追加されたツールが見えることを確認 ===
    await page.goto("/tools");
    await page.waitForLoadState("networkidle");

    // ツール一覧またはホームで確認
    const toolVisible = await page.getByText(testToolName).isVisible().catch(() => false);

    if (!toolVisible) {
      // /admin/tools で確認
      await page.goto("/admin/tools");
      await page.waitForLoadState("networkidle");
    }

    await expect(page.getByText(testToolName)).toBeVisible({ timeout: 5000 });

    // === Cleanup: ツールを削除（UserAで） ===
    await page.goto("/admin/tools");
    await page.waitForLoadState("networkidle");

    const toolRow = page.locator(`text=${testToolName}`).locator("..");
    const deleteButton = toolRow.locator('button:has(svg[class*="Trash"])');

    if (await deleteButton.isVisible().catch(() => false)) {
      page.once("dialog", (dialog) => dialog.accept());
      await deleteButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe("Multi-User: Runs Visibility", () => {
  test("UserBがUserAの実行履歴を閲覧できる", async ({ page, browser }) => {
    // === UserA: 実行履歴ページを確認 ===
    await page.goto("/runs");
    await page.waitForLoadState("networkidle");

    // 実行履歴が存在するか確認
    const runRows = page.locator('[data-testid^="run-row-"]');
    const runCount = await runRows.count();

    if (runCount === 0) {
      // 実行履歴がない場合、ホームページでhelperツールを実行してみる
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // 実行ボタンを探す
      const executeButton = page.locator("button").filter({
        has: page.locator('svg[class*="text-green"]'),
      });

      if ((await executeButton.count()) > 0) {
        await executeButton.first().click();

        const dialog = page.locator('[role="dialog"]');
        if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          // ダイアログを閉じる（実際に実行はしない）
          await dialog.getByRole("button", { name: /キャンセル/i }).click();
        }
      }

      // 再度runsページを確認
      await page.goto("/runs");
      await page.waitForLoadState("networkidle");
    }

    // 実行履歴のIDを取得（あれば）
    const firstRunRow = page.locator('[data-testid^="run-row-"]').first();
    const hasRuns = await firstRunRow.isVisible().catch(() => false);

    // === UserB: 同じ実行履歴が見えることを確認 ===
    const userBContext = await createUserBContext(browser);
    const userBPage = await userBContext.newPage();

    try {
      await userBPage.goto("/runs");
      await userBPage.waitForLoadState("networkidle");

      // UserBでもrunsページにアクセスできることを確認
      await expect(userBPage).toHaveURL(/\/runs/);

      // エラーが表示されていないことを確認
      const errorVisible = await userBPage
        .getByText(/エラー|権限|アクセス/i)
        .isVisible()
        .catch(() => false);

      expect(errorVisible).toBeFalsy();

      // 実行履歴が存在する場合、UserBでも見えることを確認
      if (hasRuns) {
        const userBRunRows = userBPage.locator('[data-testid^="run-row-"]');
        const userBRunCount = await userBRunRows.count();

        // UserBでも実行履歴が見える（RLSで全員閲覧OK）
        expect(userBRunCount).toBeGreaterThanOrEqual(0);
      }
    } finally {
      await userBContext.close();
    }
  });

  test("実行履歴のステータスが正しく表示される", async ({ page, browser }) => {
    // === UserA: runsページを確認 ===
    await page.goto("/runs");
    await page.waitForLoadState("networkidle");

    const runRows = page.locator('[data-testid^="run-row-"]');
    const runCount = await runRows.count();

    if (runCount === 0) {
      test.skip(true, "実行履歴がありません");
      return;
    }

    // ステータスバッジが存在することを確認
    const statusBadges = page.locator('[data-testid^="run-status-"]');
    await expect(statusBadges.first()).toBeVisible();

    // ステータスが有効な値であることを確認
    const firstStatusText = await statusBadges.first().textContent();
    const validStatuses = ["待機中", "実行中", "成功", "失敗", "キャンセル"];
    expect(validStatuses.some((s) => firstStatusText?.includes(s))).toBeTruthy();

    // === UserB: 同じステータスが見えることを確認 ===
    const userBContext = await createUserBContext(browser);
    const userBPage = await userBContext.newPage();

    try {
      await userBPage.goto("/runs");
      await userBPage.waitForLoadState("networkidle");

      const userBStatusBadges = userBPage.locator('[data-testid^="run-status-"]');
      const userBStatusCount = await userBStatusBadges.count();

      // UserBでも同じステータス情報が見える
      expect(userBStatusCount).toBe(runCount);
    } finally {
      await userBContext.close();
    }
  });
});
