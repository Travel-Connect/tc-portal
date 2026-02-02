import { test, expect } from "@playwright/test";

test.describe("Admin Channels", () => {
  test("管理画面からチャンネル管理へアクセスできる", async ({ page }) => {
    await page.goto("/admin");

    // チャンネル管理カードが存在する
    await expect(page.getByText("チャンネル管理")).toBeVisible();

    // 管理画面へボタンをクリック
    const manageButton = page
      .locator("a[href='/admin/channels']")
      .getByRole("button", { name: "管理画面へ" });
    await expect(manageButton).toBeVisible();
    await manageButton.click();

    // チャンネル管理ページに遷移
    await expect(page).toHaveURL("/admin/channels");
    await expect(page.getByRole("heading", { name: "チャンネル管理" })).toBeVisible();
  });

  test("チャンネル管理ページが正常に表示される", async ({ page }) => {
    await page.goto("/admin/channels");

    // ヘッダーが表示される
    await expect(page.getByRole("heading", { name: "チャンネル管理" })).toBeVisible();

    // 追加ボタンが存在する
    await expect(page.getByRole("button", { name: /チャンネルを追加/ })).toBeVisible();
  });

  test("チャンネル追加フォームが開ける", async ({ page }) => {
    await page.goto("/admin/channels");

    // 追加ボタンをクリック
    await page.getByRole("button", { name: /チャンネルを追加/ }).click();

    // フォームが表示される
    await expect(page.getByLabel("スラッグ")).toBeVisible();
    await expect(page.getByLabel("表示名")).toBeVisible();
    await expect(page.getByLabel("説明（任意）")).toBeVisible();

    // キャンセルボタンが表示される
    await expect(page.getByRole("button", { name: "キャンセル" })).toBeVisible();
    // 保存ボタンが表示される
    await expect(page.getByRole("button", { name: "保存" })).toBeVisible();
  });

  test("チャンネルを作成→編集→アーカイブできる", async ({ page }) => {
    const uniqueSlug = `e2e-test-${Date.now()}`;
    const uniqueName = `E2Eテストチャンネル_${Date.now()}`;
    const description = "E2Eテストで作成されたチャンネルです";

    // === Step 1: チャンネルを作成 ===
    await page.goto("/admin/channels");
    await page.getByRole("button", { name: /チャンネルを追加/ }).click();

    await page.getByLabel("スラッグ").fill(uniqueSlug);
    await page.getByLabel("表示名").fill(uniqueName);
    await page.getByLabel("説明（任意）").fill(description);

    await page.getByRole("button", { name: "保存" }).click();

    // チャンネルが一覧に表示される
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueSlug)).toBeVisible();

    // === Step 2: チャンネルを編集 ===
    // 編集前の行を特定してクリック
    const displayRow = page.locator(".rounded-lg").filter({ hasText: uniqueName });
    await displayRow.getByTitle("編集").click();

    // 編集フォームが開くのを待つ（「スラッグ（変更不可）」テキストが表示されるまで）
    await expect(page.getByText("スラッグ（変更不可）")).toBeVisible({ timeout: 5000 });

    const editedName = `${uniqueName}_編集済み`;
    // 編集フォームはページ内でユニークな「スラッグ（変更不可）」を持つので、それを起点に探す
    const editRow = page.locator(".rounded-lg").filter({ has: page.getByText("スラッグ（変更不可）") });
    const editNameInput = editRow.getByRole("textbox").nth(1); // 0=slug(disabled), 1=name
    await editNameInput.fill(editedName);

    // 保存ボタンをクリック（編集行の最後のボタン）
    await editRow.locator("button").last().click();

    // 編集後の名前が表示される
    await expect(page.getByText(editedName)).toBeVisible({ timeout: 10000 });

    // === Step 3: チャンネルをアーカイブ ===
    const editedRow = page.locator(".rounded-lg").filter({ hasText: editedName });
    await editedRow.getByTitle("アーカイブ").click();

    // アーカイブ済みバッジが表示される
    await expect(editedRow.getByText("アーカイブ済み")).toBeVisible({ timeout: 5000 });

    // === Step 4: アーカイブを解除 ===
    await editedRow.getByTitle("復元").click();

    // アーカイブ済みバッジが消える
    await expect(editedRow.getByText("アーカイブ済み")).not.toBeVisible({ timeout: 5000 });
  });

  test("チャンネル管理ページにエラーがない", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/admin/channels");
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(
      (e) => e.includes("Uncaught") || e.includes("React") || e.includes("hydration")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
