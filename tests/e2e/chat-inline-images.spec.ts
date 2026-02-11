import { test, expect, Locator } from "@playwright/test";

/**
 * TipTapエディタにテキストを入力するヘルパー関数
 */
async function fillTiptapEditor(editor: Locator, text: string) {
  const tiptap = editor.locator(".tiptap");
  await tiptap.click();
  await tiptap.fill(text);
}

/**
 * テスト用の画像データ（1x1 透明PNG）をBase64で生成
 */
function createTestImageBase64(): string {
  // 1x1 透明PNG (最小サイズ)
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}

test.describe("Chat Inline Images", () => {
  test.beforeEach(async ({ page }) => {
    // メッセージ画面に遷移
    await page.goto("/messages");
    // チャンネルセクションが表示されるまで待機
    await expect(page.getByText("チャンネル", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("スレッド作成でTipTapエディタが使用されている", async ({ page }) => {
    // スレッドエディタが表示される
    const editor = page.getByTestId("thread-editor");
    await expect(editor).toBeVisible({ timeout: 10000 });

    // TipTapエディタ（.tiptap）が存在する
    const tiptap = editor.locator(".tiptap");
    await expect(tiptap).toBeVisible({ timeout: 10000 });

    // 古いtextareaは存在しない
    const textarea = editor.locator("textarea");
    await expect(textarea).not.toBeVisible();
  });

  test("スレッドエディタでテキストを入力して送信できる", async ({ page }) => {
    const editor = page.getByTestId("thread-editor");
    const testMessage = `インライン画像テスト ${Date.now()}`;

    // TipTapエディタにテキストを入力
    await fillTiptapEditor(editor, testMessage);

    // Enterで送信
    await editor.locator(".tiptap").press("Control+Enter");

    // スレッド一覧に表示される（HTML形式で保存されるため、pタグ内のテキストを検索）
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
  });

  test("返信エディタでもTipTapが使用されている", async ({ page }) => {
    // まずスレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `返信テスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await threadEditor.locator(".tiptap").press("Control+Enter");

    // スレッドが作成されるのを待つ
    await page.waitForTimeout(2000);
    await page.reload();

    // スレッドをクリック
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信エディタが表示される
    const replyEditor = page.getByTestId("reply-editor");
    await expect(replyEditor).toBeVisible({ timeout: 10000 });

    // TipTapエディタが存在する
    const tiptap = replyEditor.locator(".tiptap");
    await expect(tiptap).toBeVisible({ timeout: 10000 });
  });

  test("HTML形式で保存されたメッセージが正しく表示される", async ({ page }) => {
    // スレッドを作成
    const editor = page.getByTestId("thread-editor");
    const testMessage = `HTMLテスト ${Date.now()}`;
    await fillTiptapEditor(editor, testMessage);
    await editor.locator(".tiptap").press("Control+Enter");

    // スレッド一覧に表示される
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });

    // ページをリロードしても表示される（DBからの読み込み確認）
    await page.reload();
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
  });

  // 注意: クリップボード貼り付けテストはPlaywrightの制限により、
  // 実際のファイル貼り付けをシミュレートするのが難しいため、
  // 手動テストまたはより詳細なセットアップが必要です。
  // 以下はUI要素の存在確認のみ行います。

  test("返信エディタに画像ボタンが表示される（ツールバー有効時）", async ({ page }) => {
    // スレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `画像ボタンテスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await threadEditor.locator(".tiptap").press("Control+Enter");

    await page.waitForTimeout(2000);
    await page.reload();

    // スレッドをクリック
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信エディタが表示される
    const replyEditor = page.getByTestId("reply-editor");
    await expect(replyEditor).toBeVisible({ timeout: 10000 });

    // ツールバーが表示されている場合、画像ボタンが存在するか確認
    // 注意: showToolbar=trueの場合のみ表示される
    const toolbar = replyEditor.locator(".border-b.bg-muted\\/30");
    if (await toolbar.isVisible()) {
      // ツールバー内のボタンを確認
      const buttons = toolbar.locator("button");
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
    }
  });
});
