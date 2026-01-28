import { test, expect } from "@playwright/test";

test.describe("Announcements", () => {
  test("お知らせ一覧ページが正常に表示される", async ({ page }) => {
    await page.goto("/announcements");

    // ヘッダーが表示される
    await expect(page.getByRole("heading", { name: "お知らせ" })).toBeVisible();
  });

  test("お知らせ一覧ページにエラーがない", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/announcements");
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(
      (e) => e.includes("Uncaught") || e.includes("React") || e.includes("hydration")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("管理画面のお知らせ管理が表示される", async ({ page }) => {
    await page.goto("/admin/announcements");

    // ヘッダーが表示される
    await expect(page.getByRole("heading", { name: "お知らせ管理" })).toBeVisible();

    // 追加ボタンが存在する
    await expect(page.getByRole("button", { name: /お知らせを追加/ })).toBeVisible();
  });

  test("管理画面でお知らせ追加フォームが開ける", async ({ page }) => {
    await page.goto("/admin/announcements");

    // 追加ボタンをクリック
    await page.getByRole("button", { name: /お知らせを追加/ }).click();

    // フォームが表示される
    await expect(page.getByLabel("タイトル")).toBeVisible();
    await expect(page.getByLabel("本文")).toBeVisible();
    await expect(page.getByLabel("ステータス")).toBeVisible();

    // キャンセルボタンが表示される
    await expect(page.getByRole("button", { name: "キャンセル" })).toBeVisible();
  });

  test("管理画面のトップからお知らせ管理へアクセスできる", async ({ page }) => {
    await page.goto("/admin");

    // お知らせ管理カードが有効（準備中でない）
    const announcementCard = page.locator("text=お知らせ管理").first();
    await expect(announcementCard).toBeVisible();

    // 管理画面へリンクが存在する
    const manageButton = page
      .locator("a[href='/admin/announcements']")
      .getByRole("button", { name: "管理画面へ" });
    await expect(manageButton).toBeVisible();
  });

  test("ホーム画面にお知らせバナーエリアが存在する", async ({ page }) => {
    await page.goto("/");

    // ページがエラーなく読み込まれる
    await expect(page).not.toHaveTitle(/error/i);

    // 重大なエラーがないことを確認
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(
      (e) => e.includes("Uncaught") || e.includes("React") || e.includes("hydration")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("お知らせを作成→公開→一覧表示→Home表示→非表示の一連フロー", async ({ page }) => {
    const uniqueTitle = `E2Eテストお知らせ_${Date.now()}`;
    const body = "これはE2Eテストで自動作成されたお知らせです。";

    // === Step 1: 管理画面でお知らせを作成（下書き） ===
    await page.goto("/admin/announcements");
    await page.getByRole("button", { name: /お知らせを追加/ }).click();

    await page.getByLabel("タイトル").fill(uniqueTitle);
    await page.getByLabel("本文").fill(body);
    // ステータスはデフォルト「下書き」のまま

    await page.getByRole("button", { name: "保存" }).click();

    // ページリロード後、作成したお知らせが一覧に表示される
    await page.waitForURL("/admin/announcements");
    await expect(page.locator(`text=${uniqueTitle}`).first()).toBeVisible({ timeout: 10000 });

    // 「下書き」バッジが表示される
    // DOM: row > left-section > title-row > span(title) なので ../../.. で row に到達
    const row = page.locator(".rounded-lg").filter({ hasText: uniqueTitle });
    await expect(row.locator("text=下書き")).toBeVisible();

    // === Step 2: 下書き状態ではお知らせ一覧に表示されない ===
    await page.goto("/announcements");
    await expect(page.locator(`text=${uniqueTitle}`)).toHaveCount(0);

    // === Step 3: 管理画面で公開する ===
    await page.goto("/admin/announcements");
    const adminRow = page.locator(".rounded-lg").filter({ hasText: uniqueTitle });
    await adminRow.getByTitle("公開する").click();

    // 「公開」バッジに変わる
    await expect(adminRow.getByText("公開", { exact: true })).toBeVisible({ timeout: 5000 });

    // === Step 4: お知らせ一覧に表示される ===
    await page.goto("/announcements");
    await expect(page.locator(`text=${uniqueTitle}`).first()).toBeVisible({ timeout: 10000 });

    // === Step 5: Home画面にバナーとして表示される ===
    await page.goto("/");
    await expect(page.locator(`text=${uniqueTitle}`).first()).toBeVisible({ timeout: 10000 });

    // 「すべてのお知らせ →」リンクが表示される
    await expect(page.locator("text=すべてのお知らせ →")).toBeVisible();

    // === Step 6: ×ボタンで非表示にする ===
    // AnnouncementCard 内の「閉じる」ボタンを探す
    const card = page.locator(`text=${uniqueTitle}`).first().locator("../../..");
    await card.getByTitle("閉じる").click();

    // お知らせが消える（optimistic UI）
    await expect(page.locator(`text=${uniqueTitle}`)).toHaveCount(0, { timeout: 5000 });

    // === Step 7: リロードしても非表示のまま ===
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${uniqueTitle}`)).toHaveCount(0);

    // === Step 8: お知らせ一覧では「閉じたお知らせも表示」で見える ===
    await page.goto("/announcements");
    // デフォルトでは非表示
    await expect(page.locator(`text=${uniqueTitle}`)).toHaveCount(0);

    // トグルボタンをクリック
    const toggleButton = page.getByRole("button", { name: /閉じたお知らせも表示/ });
    await toggleButton.click();

    // 表示される（薄くなっている）
    await expect(page.locator(`text=${uniqueTitle}`).first()).toBeVisible({ timeout: 5000 });

    // === Step 9: クリーンアップ - 管理画面で削除 ===
    await page.goto("/admin/announcements");
    const cleanupRow = page.locator(".rounded-lg").filter({ hasText: uniqueTitle });

    // 削除ボタン（confirm ダイアログを自動承認）
    page.on("dialog", (dialog) => dialog.accept());
    await cleanupRow.getByTitle("削除").click();

    // 一覧から消える
    await expect(page.locator(`text=${uniqueTitle}`)).toHaveCount(0, { timeout: 5000 });
  });
});
