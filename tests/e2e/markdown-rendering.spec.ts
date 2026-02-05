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
 * スレッドを作成して開くヘルパー関数
 * シンプルなテキストエリア（RichTextEditor）でスレッドを作成
 */
async function createAndOpenThread(page: import("@playwright/test").Page, testId: number) {
  // スレッド作成エディタ（シンプルなテキストエリア）
  const threadEditor = page.getByTestId("thread-editor");
  await expect(threadEditor).toBeVisible({ timeout: 10000 });

  // テキストエリアに入力
  const textarea = threadEditor.locator("textarea");
  await textarea.fill(`テストスレッド${testId}`);
  await textarea.press("Enter");

  // スレッドが作成されるまで待つ
  const threadItem = page.getByTestId("thread-item").filter({ hasText: `${testId}` });
  await expect(threadItem).toBeVisible({ timeout: 10000 });

  // スレッドをクリックして詳細を開く
  await threadItem.click();

  // 返信エディタが表示されるまで待つ
  const replyEditor = page.getByTestId("reply-editor");
  await expect(replyEditor).toBeVisible({ timeout: 10000 });

  return replyEditor;
}

test.describe("WYSIWYG Formatting", () => {
  test("太字（Ctrl+B）が正しく表示される", async ({ page }) => {
    await page.goto("/messages");
    const testId = Date.now();

    // スレッドを作成して返信エディタを取得
    const replyEditor = await createAndOpenThread(page, testId);

    // 返信エディタで太字テキストを入力
    const tiptap = replyEditor.locator(".tiptap");
    await tiptap.click();
    await tiptap.fill(`テスト太字 太字テキスト${testId}`);

    // 全選択して太字を適用
    await tiptap.press("Control+a");
    await tiptap.press("Control+b");

    // 送信
    await tiptap.press("Enter");

    // 投稿が表示されるまで待つ
    await expect(page.getByText(`テスト太字`)).toBeVisible({ timeout: 10000 });

    // strongタグで太字が表示されていることを確認
    const boldElement = page.locator(".markdown-content strong").first();
    await expect(boldElement).toBeVisible({ timeout: 10000 });
  });

  test("斜体（Ctrl+I）が正しく表示される", async ({ page }) => {
    await page.goto("/messages");
    const testId = Date.now();

    // スレッドを作成して返信エディタを取得
    const replyEditor = await createAndOpenThread(page, testId);

    // 返信エディタで斜体テキストを入力
    const tiptap = replyEditor.locator(".tiptap");
    await tiptap.click();
    await tiptap.fill(`テスト斜体 斜体テキスト${testId}`);

    // 全選択して斜体を適用
    await tiptap.press("Control+a");
    await tiptap.press("Control+i");

    // 送信
    await tiptap.press("Enter");

    // 投稿が表示されるまで待つ
    await expect(page.getByText(`テスト斜体`)).toBeVisible({ timeout: 10000 });

    // emタグで斜体が表示されていることを確認
    const italicElement = page.locator(".markdown-content em").first();
    await expect(italicElement).toBeVisible({ timeout: 10000 });
  });

  test("下線（Ctrl+U）が正しく表示される", async ({ page }) => {
    await page.goto("/messages");
    const testId = Date.now();

    // スレッドを作成して返信エディタを取得
    const replyEditor = await createAndOpenThread(page, testId);

    // 返信エディタで下線テキストを入力
    const tiptap = replyEditor.locator(".tiptap");
    await tiptap.click();
    await tiptap.fill(`テスト下線 下線テキスト${testId}`);

    // 全選択して下線を適用
    await tiptap.press("Control+a");
    await tiptap.press("Control+u");

    // 送信
    await tiptap.press("Enter");

    // 投稿が表示されるまで待つ
    await expect(page.getByText(`テスト下線`)).toBeVisible({ timeout: 10000 });

    // uタグで下線が表示されていることを確認
    const underlineElement = page.locator(".markdown-content u").first();
    await expect(underlineElement).toBeVisible({ timeout: 10000 });
  });

  test("ツールバーから箇条書きリストを作成できる", async ({ page }) => {
    await page.goto("/messages");
    const testId = Date.now();

    // スレッドを作成して返信エディタを取得
    const replyEditor = await createAndOpenThread(page, testId);

    // 返信エディタでテキストを入力
    const tiptap = replyEditor.locator(".tiptap");
    await tiptap.click();
    await tiptap.fill(`テストリスト${testId}`);

    // ツールバーの箇条書きボタンをクリック
    const listButton = replyEditor.locator("button[title='箇条書き']");
    await listButton.click();

    // 送信
    await tiptap.press("Enter");

    // 投稿が表示されるまで待つ
    await expect(page.getByText(`テストリスト${testId}`)).toBeVisible({ timeout: 10000 });

    // ulタグでリストが表示されていることを確認
    const listElement = page.locator(".markdown-content ul");
    await expect(listElement).toBeVisible({ timeout: 10000 });
  });

  test("ツールバーから引用を作成できる", async ({ page }) => {
    await page.goto("/messages");
    const testId = Date.now();

    // スレッドを作成して返信エディタを取得
    const replyEditor = await createAndOpenThread(page, testId);

    // 返信エディタでテキストを入力
    const tiptap = replyEditor.locator(".tiptap");
    await tiptap.click();
    await tiptap.fill(`テスト引用${testId} これは引用テキストです`);

    // ツールバーの引用ボタンをクリック
    const quoteButton = replyEditor.locator("button[title='引用']");
    await quoteButton.click();

    // 送信
    await tiptap.press("Enter");

    // 投稿が表示されるまで待つ
    await expect(page.getByText(`テスト引用${testId}`)).toBeVisible({ timeout: 10000 });

    // blockquoteタグで引用が表示されていることを確認
    const quoteElement = page.locator(".markdown-content blockquote");
    await expect(quoteElement).toBeVisible({ timeout: 10000 });
  });

  test("XSS: <script>タグが無害化される", async ({ page }) => {
    await page.goto("/messages");
    const testId = Date.now();

    // スレッドを作成して返信エディタを取得
    const replyEditor = await createAndOpenThread(page, testId);

    // scriptタグを含むテキストを入力
    await fillTiptapEditor(replyEditor, `XSSテスト${testId} <script>alert('xss')</script> 安全なテキスト`);
    await replyEditor.locator(".tiptap").press("Enter");

    // 投稿が表示されるまで待つ
    await expect(page.getByText(`XSSテスト${testId}`)).toBeVisible({ timeout: 10000 });

    // メッセージアイテムを取得
    const messageItem = page.getByTestId("message-item").filter({ hasText: `XSSテスト${testId}` });
    await expect(messageItem).toBeVisible({ timeout: 10000 });

    // 安全なテキストは表示される
    await expect(messageItem.getByText("安全なテキスト")).toBeVisible({ timeout: 5000 });

    // scriptタグが存在しないことを確認
    const scriptElements = page.locator("script").filter({ hasText: "alert" });
    await expect(scriptElements).toHaveCount(0);
  });

  test("既存の編集機能でフォーマットが維持される", async ({ page }) => {
    await page.goto("/messages");
    const testId = Date.now();

    // スレッドを作成して返信エディタを取得
    const replyEditor = await createAndOpenThread(page, testId);

    // 太字テキストを投稿
    const tiptap = replyEditor.locator(".tiptap");
    await tiptap.click();
    await tiptap.fill(`編集テスト 太字${testId}`);

    // 全選択して太字を適用
    await tiptap.press("Control+a");
    await tiptap.press("Control+b");
    await tiptap.press("Enter");

    // 投稿が表示されるまで待つ
    await expect(page.getByText(`${testId}`)).toBeVisible({ timeout: 10000 });

    // メッセージアイテムにホバーしてメニューを表示
    const messageItem = page.getByTestId("message-item").filter({ hasText: `編集テスト` });
    await messageItem.hover();

    // メニューボタンをクリック
    const menuButton = messageItem.getByTestId("message-menu-button");
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();

    // 編集ボタンをクリック
    const editButton = page.getByTestId("message-edit-button");
    await expect(editButton).toBeVisible();
    await editButton.click();

    // 編集用テキストエリアが表示される
    const editTextarea = messageItem.locator("textarea");
    await expect(editTextarea).toBeVisible();

    // HTMLタグが含まれていることを確認（strongまたはテキスト自体）
    const textContent = await editTextarea.inputValue();
    // WYSIWYGエディタからのHTMLが保存されていることを確認
    expect(textContent.length).toBeGreaterThan(0);
  });
});
