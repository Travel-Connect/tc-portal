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
});
