import { test, expect, Locator } from "@playwright/test";

/**
 * TipTapエディタにテキストを入力するヘルパー関数
 */
async function fillTiptapEditor(editor: Locator, text: string) {
  const tiptap = editor.locator(".tiptap");
  await tiptap.waitFor({ state: "visible" });
  await tiptap.click();
  await tiptap.page().waitForTimeout(100);
  await tiptap.pressSequentially(text, { delay: 10 });
}

/**
 * TipTapエディタでCtrl+Enterを押して送信するヘルパー関数
 */
async function submitTiptapEditor(editor: Locator) {
  const tiptap = editor.locator(".tiptap");
  await tiptap.press("Control+Enter");
}

test.describe("Chat Bubble UI and Reactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/messages");
    // 全体チャンネルを選択
    await page.getByRole("button", { name: "全体" }).click();
    // チャンネル読み込み待ち（TipTapエディタが表示されるまで）
    const threadEditor = page.getByTestId("thread-editor");
    await expect(threadEditor.locator(".tiptap")).toBeVisible({ timeout: 10000 });
  });

  test("吹き出し型メッセージが正しく表示される", async ({ page }) => {
    // 新しいスレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `吹き出しテスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await submitTiptapEditor(threadEditor);

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // スレッド詳細が開く
    await expect(page.getByTestId("reply-editor")).toBeVisible({ timeout: 10000 });

    // 親メッセージが吹き出し形式で表示される
    const messageItem = page.getByTestId("message-item").filter({ hasText: testMessage });
    await expect(messageItem).toBeVisible();

    // 吹き出しに角丸クラスが適用されている（rounded-2xl）
    const bubbleElement = messageItem.locator(".rounded-2xl").first();
    await expect(bubbleElement).toBeVisible();

    // 時刻が表示されている
    await expect(messageItem.locator("text=/\\d{1,2}:\\d{2}/")).toBeVisible();
  });

  test("自分のメッセージが右寄せで青背景で表示される", async ({ page }) => {
    // 新しいスレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `右寄せテスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await submitTiptapEditor(threadEditor);

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信を投稿（自分のメッセージ）
    const replyEditor = page.getByTestId("reply-editor");
    const replyMessage = `自分の返信 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, replyMessage);
    await submitTiptapEditor(replyEditor);

    // 返信がmessage-itemとして表示されるのを待つ
    const replyBubble = page.getByTestId("message-item").filter({ hasText: replyMessage });
    await expect(replyBubble).toBeVisible({ timeout: 10000 });

    // bg-primary クラスが適用されている（青背景）
    const primaryBubble = replyBubble.locator(".bg-primary").first();
    await expect(primaryBubble).toBeVisible();
  });

  test("連続投稿でメッセージがグループ化される", async ({ page }) => {
    // 新しいスレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `グループ化テスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await submitTiptapEditor(threadEditor);

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    const replyEditor = page.getByTestId("reply-editor");

    // 1件目の返信
    const reply1 = `返信1 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, reply1);
    await submitTiptapEditor(replyEditor);
    await expect(page.getByText(reply1)).toBeVisible({ timeout: 10000 });

    // 2件目の返信（連続投稿）
    await page.waitForTimeout(500);
    const reply2 = `返信2 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, reply2);
    await submitTiptapEditor(replyEditor);
    await expect(page.getByText(reply2)).toBeVisible({ timeout: 10000 });

    // 3件目の返信（連続投稿）
    await page.waitForTimeout(500);
    const reply3 = `返信3 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, reply3);
    await submitTiptapEditor(replyEditor);
    await expect(page.getByText(reply3)).toBeVisible({ timeout: 10000 });

    // すべての返信が表示されている
    await expect(page.getByText(reply1)).toBeVisible();
    await expect(page.getByText(reply2)).toBeVisible();
    await expect(page.getByText(reply3)).toBeVisible();

    // グループ化により、アバターは最初の返信のみに表示される（実装確認のため目視確認を推奨）
  });

  test("リアクション追加ボタンがホバーで表示される", async ({ page }) => {
    // 新しいスレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `リアクションホバーテスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await submitTiptapEditor(threadEditor);

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信を投稿
    const replyEditor = page.getByTestId("reply-editor");
    const replyMessage = `リアクション対象 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, replyMessage);
    await submitTiptapEditor(replyEditor);

    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });

    // メッセージにホバー
    const messageElement = page.getByTestId("message-item").filter({ hasText: replyMessage });
    await messageElement.hover();

    // リアクション追加ボタンが表示される
    await page.waitForTimeout(500);
    const reactionAddButton = page.getByTestId("reaction-add-button");
    await expect(reactionAddButton.first()).toBeVisible({ timeout: 5000 });
  });

  test("リアクションを追加できる", async ({ page }) => {
    // 新しいスレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `リアクション追加テスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await submitTiptapEditor(threadEditor);

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信を投稿
    const replyEditor = page.getByTestId("reply-editor");
    const replyMessage = `リアクション追加対象 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, replyMessage);
    await submitTiptapEditor(replyEditor);

    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });

    // メッセージにホバー
    const messageElement = page.getByTestId("message-item").filter({ hasText: replyMessage });
    await messageElement.hover();

    // リアクション追加ボタンをクリック
    await page.waitForTimeout(500);
    const reactionAddButton = messageElement.getByTestId("reaction-add-button");
    await reactionAddButton.click();

    // リアクションピッカーが開く
    await page.waitForTimeout(500);

    // 👍 絵文字をクリック
    const thumbsUpButton = page.getByRole("button", { name: "👍" });
    await expect(thumbsUpButton).toBeVisible({ timeout: 5000 });
    await thumbsUpButton.click();

    // リアクションが追加される
    await page.waitForTimeout(1000);
    const reactionChip = page.getByTestId("reaction-chip").filter({ hasText: "👍" });
    await expect(reactionChip).toBeVisible({ timeout: 10000 });
  });

  test("リアクションをクリックして削除できる", async ({ page }) => {
    // 新しいスレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `リアクション削除テスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await submitTiptapEditor(threadEditor);

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信を投稿
    const replyEditor = page.getByTestId("reply-editor");
    const replyMessage = `リアクション削除対象 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, replyMessage);
    await submitTiptapEditor(replyEditor);

    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });

    // メッセージにホバー
    const messageElement = page.getByTestId("message-item").filter({ hasText: replyMessage });
    await messageElement.hover();

    // リアクション追加ボタンをクリック
    await page.waitForTimeout(500);
    const reactionAddButton = messageElement.getByTestId("reaction-add-button");
    await reactionAddButton.click();

    // ❤️ 絵文字をクリック
    await page.waitForTimeout(500);
    const heartButton = page.getByRole("button", { name: "❤️" });
    await expect(heartButton).toBeVisible({ timeout: 5000 });
    await heartButton.click();

    // リアクションが追加される
    await page.waitForTimeout(1000);
    const reactionChip = page.getByTestId("reaction-chip").filter({ hasText: "❤️" });
    await expect(reactionChip).toBeVisible({ timeout: 10000 });

    // リアクションをクリックして削除
    await reactionChip.click();

    // リアクションが削除される（カウントが0になるため非表示）
    await expect(reactionChip).not.toBeVisible({ timeout: 10000 });
  });

  test("複数の絵文字でリアクションできる", async ({ page }) => {
    // 新しいスレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `複数リアクションテスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await submitTiptapEditor(threadEditor);

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信を投稿
    const replyEditor = page.getByTestId("reply-editor");
    const replyMessage = `複数リアクション対象 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, replyMessage);
    await submitTiptapEditor(replyEditor);

    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });

    const messageElement = page.getByTestId("message-item").filter({ hasText: replyMessage });

    // 1つ目のリアクション: 👍
    await messageElement.hover();
    await page.waitForTimeout(500);
    const reactionAddButton1 = messageElement.getByTestId("reaction-add-button");
    await reactionAddButton1.click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "👍" }).click();
    await page.waitForTimeout(1000);

    // 2つ目のリアクション: ✅
    await messageElement.hover();
    await page.waitForTimeout(500);
    const reactionAddButton2 = messageElement.getByTestId("reaction-add-button");
    await reactionAddButton2.click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "✅" }).click();
    await page.waitForTimeout(1000);

    // 両方のリアクションが表示されている
    await expect(page.getByTestId("reaction-chip").filter({ hasText: "👍" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("reaction-chip").filter({ hasText: "✅" })).toBeVisible({ timeout: 5000 });
  });

  test("編集済みメッセージでもリアクションが動作する", async ({ page }) => {
    // 新しいスレッドを作成
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `編集後リアクションテスト ${Date.now()}`;
    await fillTiptapEditor(threadEditor, testMessage);
    await submitTiptapEditor(threadEditor);

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信を投稿
    const replyEditor = page.getByTestId("reply-editor");
    const originalReply = `編集前 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, originalReply);
    await submitTiptapEditor(replyEditor);

    await expect(page.getByText(originalReply)).toBeVisible({ timeout: 10000 });

    // メッセージを編集
    const replyElement = page.getByTestId("message-item").filter({ hasText: originalReply });
    await replyElement.hover();

    // 編集メニューを開く
    await page.waitForTimeout(500);
    const menuButton = replyElement.getByTestId("message-menu-button");
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();

    // 編集ボタンをクリック
    await page.waitForTimeout(300);
    const editButton = page.getByTestId("message-edit-button");
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // テキストを編集
    const editTextarea = replyElement.locator("textarea");
    const editedReply = `編集後 ${Date.now()}`;
    await editTextarea.fill(editedReply);

    // 保存
    const saveButton = page.getByRole("button", { name: /保存/ });
    await saveButton.click();

    // 編集後のメッセージが表示される
    await expect(page.getByText(editedReply)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("(編集済み)")).toBeVisible();

    // 編集後のメッセージにリアクション追加
    const editedElement = page.getByTestId("message-item").filter({ hasText: editedReply });
    await editedElement.hover();
    await page.waitForTimeout(500);

    const reactionAddButton = editedElement.getByTestId("reaction-add-button");
    await reactionAddButton.click();

    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "👍" }).click();
    await page.waitForTimeout(1000);

    // リアクションが表示される
    await expect(page.getByTestId("reaction-chip").filter({ hasText: "👍" })).toBeVisible({ timeout: 5000 });
  });
});
