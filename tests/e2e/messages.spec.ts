import { test, expect } from "@playwright/test";

test.describe("Messages Page", () => {
  test("メッセージ画面に遷移できる", async ({ page }) => {
    await page.goto("/messages");

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/messages/);

    // チャンネルセクションが表示される
    await expect(page.getByText("チャンネル")).toBeVisible();
  });

  test("チャンネル一覧が表示される", async ({ page }) => {
    await page.goto("/messages");

    // チャンネルセクションが表示される
    await expect(page.getByText("チャンネル")).toBeVisible();

    // チャンネルボタンが存在する（全体、料金関連、障害情報など）
    await expect(page.getByRole("button", { name: "全体" })).toBeVisible();
  });

  test("スレッド作成フォームが表示される", async ({ page }) => {
    await page.goto("/messages");

    // 新規スレッド作成のテキストエリアが表示される
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    await expect(textarea).toBeVisible();
  });

  test("新規スレッドを投稿できる", async ({ page }) => {
    await page.goto("/messages");

    // テキストエリアを探す
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    await expect(textarea).toBeVisible();

    // テスト用のメッセージを入力
    const testMessage = `テストスレッド ${Date.now()}`;
    await textarea.fill(testMessage);

    // 送信ボタンをクリック
    const sendButton = page.locator("button").filter({ has: page.locator("svg") }).last();
    await sendButton.click();

    // スレッド一覧に投稿が表示されるまで待つ
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
  });

  test("スレッドを開いて返信できる", async ({ page }) => {
    await page.goto("/messages");

    // スレッドを作成
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    const testMessage = `返信テスト ${Date.now()}`;
    await textarea.fill(testMessage);
    await textarea.press("Enter");

    // スレッドが作成されるのを待つ（リロードして確認）
    await page.waitForTimeout(2000);
    await page.reload();

    // スレッドリストにスレッドが表示されるまで待つ（「スレッドがありません」が消える）
    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });

    // スレッドアイテムをクリック（チャンネルリストのボタンと区別するため、本文でフィルター）
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信用テキストエリアが表示される（詳細パネルが開いた証拠）
    const replyTextarea = page.getByPlaceholder("返信を入力...");
    await expect(replyTextarea).toBeVisible({ timeout: 10000 });

    // 返信を入力して送信
    const replyMessage = `返信メッセージ ${Date.now()}`;
    await replyTextarea.fill(replyMessage);
    await replyTextarea.press("Enter");

    // 返信が表示される
    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });
  });

  test("サイドバーにメッセージリンクがある", async ({ page }) => {
    await page.goto("/");

    // サイドバーにメッセージリンクが存在する
    const messagesLink = page.getByRole("link", { name: /メッセージ/ });
    await expect(messagesLink).toBeVisible();

    // クリックしてメッセージページに遷移
    await messagesLink.click();
    await expect(page).toHaveURL(/\/messages/);
  });

  test("ページがエラーなく表示される", async ({ page }) => {
    await page.goto("/messages");

    // ページがエラーなく読み込まれる
    await expect(page).not.toHaveTitle(/error/i);

    // コンソールエラーを収集
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
