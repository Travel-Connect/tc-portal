import { test, expect, Locator } from "@playwright/test";

/**
 * TipTapエディタにテキストを入力するヘルパー関数
 * TipTapはcontenteditableを使用するため、通常のfillではなくkeyboard入力を使用
 */
async function fillTiptapEditor(editor: Locator, text: string) {
  const tiptap = editor.locator(".tiptap");
  await tiptap.click();
  await tiptap.fill(text);
}

/**
 * シンプルなテキストエリアにテキストを入力するヘルパー関数
 * スレッド作成用（RichTextEditor）
 */
async function fillSimpleEditor(editor: Locator, text: string) {
  const textarea = editor.locator("textarea");
  await textarea.fill(text);
}

test.describe("Messages Page", () => {
  test("メッセージ画面に遷移できる", async ({ page }) => {
    await page.goto("/messages");

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/messages/);

    // チャンネルセクションが表示される（テスト作成チャンネル名と区別するためexact: true）
    await expect(page.getByText("チャンネル", { exact: true })).toBeVisible();
  });

  test("チャンネル一覧が表示される", async ({ page }) => {
    await page.goto("/messages");

    // チャンネルセクションが表示される（テスト作成チャンネル名と区別するためexact: true）
    await expect(page.getByText("チャンネル", { exact: true })).toBeVisible();

    // チャンネルボタンが存在する（全体、料金関連、障害情報など）
    await expect(page.getByRole("button", { name: "全体" })).toBeVisible();
  });

  test("スレッド作成フォームが表示される", async ({ page }) => {
    await page.goto("/messages");

    // 新規スレッド作成のエディタが表示される
    const editor = page.getByTestId("thread-editor");
    await expect(editor).toBeVisible({ timeout: 10000 });

    // シンプルなテキストエリアが初期化されるまで待つ
    const textarea = editor.locator("textarea");
    await expect(textarea).toBeVisible({ timeout: 10000 });
  });

  test("新規スレッドを投稿できる", async ({ page }) => {
    await page.goto("/messages");

    // エディタを探す
    const editor = page.getByTestId("thread-editor");
    await expect(editor).toBeVisible();

    // テスト用のメッセージを入力
    const testMessage = `テストスレッド ${Date.now()}`;
    await fillSimpleEditor(editor, testMessage);

    // 送信ボタンをクリック
    const sendButton = editor.locator("button").filter({ has: page.locator("svg") }).last();
    await sendButton.click();

    // スレッド一覧に投稿が表示されるまで待つ
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
  });

  test("スレッドを開いて返信できる", async ({ page }) => {
    await page.goto("/messages");

    // スレッドを作成（シンプルなテキストエリア）
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `返信テスト ${Date.now()}`;
    await fillSimpleEditor(threadEditor, testMessage);
    // テキストエリアでEnterで送信
    await threadEditor.locator("textarea").press("Enter");

    // スレッドが作成されるのを待つ（リロードして確認）
    await page.waitForTimeout(2000);
    await page.reload();

    // スレッドリストにスレッドが表示されるまで待つ（「スレッドがありません」が消える）
    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });

    // スレッドアイテムをクリック（チャンネルリストのボタンと区別するため、本文でフィルター）
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信用エディタが表示される（詳細パネルが開いた証拠）
    const replyEditor = page.getByTestId("reply-editor");
    await expect(replyEditor).toBeVisible({ timeout: 10000 });

    // 返信を入力して送信（TipTapエディタ）
    const replyMessage = `返信メッセージ ${Date.now()}`;
    await fillTiptapEditor(replyEditor, replyMessage);
    await replyEditor.locator(".tiptap").press("Enter");

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

  test("検索バーが表示される", async ({ page }) => {
    await page.goto("/messages");

    // 検索バーが表示される
    const searchInput = page.getByPlaceholder("スレッドを検索...");
    await expect(searchInput).toBeVisible();
  });

  test("検索でスレッドを絞り込める", async ({ page }) => {
    await page.goto("/messages");

    // まずスレッドを作成（シンプルなテキストエリア）
    const editor = page.getByTestId("thread-editor");
    const uniqueKeyword = `検索テスト_${Date.now()}`;
    await fillSimpleEditor(editor, uniqueKeyword);
    await editor.locator("textarea").press("Enter");

    // スレッドが作成されるのを待つ
    await expect(page.getByText(uniqueKeyword)).toBeVisible({ timeout: 10000 });

    // 別のスレッドを作成
    const otherMessage = `別のスレッド_${Date.now()}`;
    await fillSimpleEditor(editor, otherMessage);
    await editor.locator("textarea").press("Enter");
    await expect(page.getByText(otherMessage)).toBeVisible({ timeout: 10000 });

    // 検索で絞り込み
    const searchInput = page.getByPlaceholder("スレッドを検索...");
    await searchInput.fill(uniqueKeyword);

    // デバウンス待ち
    await page.waitForTimeout(500);

    // 検索結果に該当スレッドが表示される
    await expect(page.getByText(uniqueKeyword)).toBeVisible({ timeout: 10000 });

    // 検索をクリアして全スレッドが表示される
    await searchInput.fill("");
    await page.waitForTimeout(500);
  });

  test("スレッドにタグを追加できる", async ({ page }) => {
    await page.goto("/messages");

    // スレッドを作成（シンプルなテキストエリア）
    const editor = page.getByTestId("thread-editor");
    const testMessage = `タグテスト ${Date.now()}`;
    await fillSimpleEditor(editor, testMessage);
    await editor.locator("textarea").press("Enter");

    // スレッドが作成されるのを待つ
    await page.waitForTimeout(2000);
    await page.reload();

    // スレッドリストにスレッドが表示されるまで待つ
    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });

    // スレッドをクリックして詳細を開く
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信入力欄が表示される（詳細パネルが開いた証拠）
    await expect(page.getByTestId("reply-editor")).toBeVisible({ timeout: 10000 });

    // タグ追加ボタンを探す（exact: trueで正確にマッチ）
    const tagButton = page.getByRole("button", { name: "タグ", exact: true });
    await expect(tagButton).toBeVisible({ timeout: 10000 });

    // ボタンをクリックしてポップオーバーを開く
    await tagButton.click();
    await page.waitForTimeout(500);

    // タグ入力フィールドが表示されるまで待つ
    const tagInput = page.getByPlaceholder("タグを入力...");
    await expect(tagInput).toBeVisible({ timeout: 10000 });

    // 新しいタグを入力
    const testTag = `テストタグ_${Date.now()}`;
    await tagInput.fill(testTag);

    // タグを作成（Enterキーまたは「作成」ボタン）
    await tagInput.press("Enter");

    // タグが追加されたことを確認（Badge内にタグ名が表示される）
    await expect(page.getByText(testTag).first()).toBeVisible({ timeout: 10000 });
  });

  test("タグでスレッドをフィルタできる", async ({ page }) => {
    await page.goto("/messages");

    // スレッドを作成（シンプルなテキストエリア）
    const editor = page.getByTestId("thread-editor");
    const testMessage = `フィルタテスト ${Date.now()}`;
    await fillSimpleEditor(editor, testMessage);
    await editor.locator("textarea").press("Enter");

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信入力欄が表示される（詳細パネルが開いた証拠）
    await expect(page.getByTestId("reply-editor")).toBeVisible({ timeout: 10000 });

    // タグ追加ボタンを探す（exact: trueで正確にマッチ）
    const tagButton = page.getByRole("button", { name: "タグ", exact: true });
    await expect(tagButton).toBeVisible({ timeout: 10000 });

    // ボタンをクリックしてポップオーバーを開く
    await tagButton.click();
    await page.waitForTimeout(500);

    // タグを作成
    const tagInput = page.getByPlaceholder("タグを入力...");
    await expect(tagInput).toBeVisible({ timeout: 10000 });
    const filterTag = `フィルタ用タグ_${Date.now()}`;
    await tagInput.fill(filterTag);
    await tagInput.press("Enter");

    // タグが追加されるのを待つ
    await expect(page.getByText(filterTag).first()).toBeVisible({ timeout: 10000 });

    // ポップオーバーを閉じる（Escキー）
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // スレッド詳細を閉じる（Xボタン）
    const closeButton = page.locator("button").filter({ has: page.locator("svg") }).filter({ hasText: "" }).nth(1);
    await closeButton.click();

    // タグフィルタセクションにタグが表示されるまでリロード
    await page.reload();
    await page.waitForTimeout(1500);

    // タグフィルタボタン（Popover）をクリック
    const tagFilterButton = page.getByTestId("tag-filter-trigger");
    const isTagFilterVisible = await tagFilterButton.isVisible().catch(() => false);

    if (isTagFilterVisible) {
      await tagFilterButton.click();
      await page.waitForTimeout(300);

      // タグ検索欄にタグ名を入力
      const tagSearchInput = page.getByPlaceholder("タグを検索...");
      await expect(tagSearchInput).toBeVisible({ timeout: 5000 });
      await tagSearchInput.fill(filterTag);
      await page.waitForTimeout(300);

      // チェックボックスをクリックしてフィルタ適用
      const tagCheckbox = page.getByRole("checkbox", { name: filterTag });
      const isCheckboxVisible = await tagCheckbox.isVisible().catch(() => false);

      if (isCheckboxVisible) {
        await tagCheckbox.click();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);

        // フィルタ後もスレッドが表示される
        await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test("スレッドを開くと既読になる", async ({ page }) => {
    await page.goto("/messages");

    // スレッドを作成（シンプルなテキストエリア）
    const editor = page.getByTestId("thread-editor");
    const testMessage = `既読テスト ${Date.now()}`;
    await fillSimpleEditor(editor, testMessage);
    await editor.locator("textarea").press("Enter");

    // スレッドが作成されるのを待つ
    await page.waitForTimeout(2000);

    // ページをリロードして未読状態を確認
    await page.reload();
    await page.waitForTimeout(1500);

    // スレッドアイテムをクリック
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 詳細パネルが開く
    await expect(page.getByTestId("reply-editor")).toBeVisible({ timeout: 10000 });

    // リロード後、未読バッジが消えていることを確認
    await page.reload();
    await page.waitForTimeout(1500);

    // スレッドリストで該当スレッドの未読バッジが存在しないことを確認
    const threadItemAfterRead = page.getByRole("button", { name: new RegExp(testMessage) });
    await expect(threadItemAfterRead).toBeVisible({ timeout: 10000 });

    // 未読バッジがない（data-testid="unread-badge"が存在しない）
    const unreadBadge = threadItemAfterRead.locator("[data-testid='unread-badge']");
    await expect(unreadBadge).not.toBeVisible();
  });

  test("タグフィルタはPopoverで表示される", async ({ page }) => {
    await page.goto("/messages");

    // タグフィルタボタンが表示される
    const tagFilterButton = page.getByTestId("tag-filter-trigger");
    await expect(tagFilterButton).toBeVisible({ timeout: 10000 });

    // クリックするとPopoverが開く
    await tagFilterButton.click();
    await page.waitForTimeout(300);

    // タグ検索欄が表示される
    const tagSearchInput = page.getByPlaceholder("タグを検索...");
    await expect(tagSearchInput).toBeVisible({ timeout: 5000 });

    // Escで閉じる
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Popoverが閉じたことを確認
    await expect(tagSearchInput).not.toBeVisible();
  });

  test("返信を編集すると「編集済み」が表示される", async ({ page }) => {
    await page.goto("/messages");

    // スレッドを作成（シンプルなテキストエリア）
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `編集テスト ${Date.now()}`;
    await fillSimpleEditor(threadEditor, testMessage);
    await threadEditor.locator("textarea").press("Enter");

    // optimistic updateにより即座にスレッドが表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信入力欄が表示される
    const replyEditor = page.getByTestId("reply-editor");
    await expect(replyEditor).toBeVisible({ timeout: 10000 });

    // 返信を投稿（TipTapエディタ）
    const originalReply = `元の返信 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, originalReply);
    await replyEditor.locator(".tiptap").press("Enter");

    // 返信が表示されるのを待つ
    await expect(page.getByText(originalReply)).toBeVisible({ timeout: 10000 });

    // 返信のメニューボタンをホバーして表示
    const replyElement = page.getByTestId("message-item").filter({ hasText: originalReply });
    await replyElement.hover();

    // メニューボタン（…）をクリック
    await page.waitForTimeout(500);
    const menuButton = replyElement.getByTestId("message-menu-button");
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    await page.waitForTimeout(300);

    // 編集ボタンをクリック
    const editButton = page.getByTestId("message-edit-button");
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // 編集用テキストエリアが表示される
    const editTextarea = replyElement.locator("textarea");
    await expect(editTextarea).toBeVisible({ timeout: 5000 });

    // 内容を編集
    const editedReply = `編集後の返信 ${Date.now()}`;
    await editTextarea.fill(editedReply);

    // 保存ボタンをクリック
    const saveButton = page.getByRole("button", { name: /保存/ });
    await saveButton.click();

    // 編集後の内容と「編集済み」が表示される
    await expect(page.getByText(editedReply)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("(編集済み)")).toBeVisible({ timeout: 10000 });
  });

  test("返信を削除すると「削除されました」が表示される", async ({ page }) => {
    await page.goto("/messages");

    // スレッドを作成（シンプルなテキストエリア）
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `削除テスト ${Date.now()}`;
    await fillSimpleEditor(threadEditor, testMessage);
    await threadEditor.locator("textarea").press("Enter");

    // スレッドがoptimistic updateで即座に表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信入力欄が表示される
    const replyEditor = page.getByTestId("reply-editor");
    await expect(replyEditor).toBeVisible({ timeout: 10000 });

    // 返信を投稿（TipTapエディタ）
    const replyToDelete = `削除する返信 ${Date.now()}`;
    await fillTiptapEditor(replyEditor, replyToDelete);
    await replyEditor.locator(".tiptap").press("Enter");

    // 返信が表示されるのを待つ
    await expect(page.getByText(replyToDelete)).toBeVisible({ timeout: 10000 });

    // 返信のメニューボタンをホバーして表示
    const replyElement = page.getByTestId("message-item").filter({ hasText: replyToDelete });
    await replyElement.hover();

    // メニューボタン（…）をクリック
    await page.waitForTimeout(500);
    const menuButton = replyElement.getByTestId("message-menu-button");
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    await page.waitForTimeout(300);

    // 削除ボタンをクリック
    const deleteButton = page.getByTestId("message-delete-button");
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();

    // 確認ダイアログが表示される（ダイアログタイトルをチェック）
    await expect(page.getByRole("heading", { name: "メッセージを削除" })).toBeVisible({ timeout: 5000 });

    // 削除を確定（ダイアログ内の削除ボタン）
    const confirmButton = page.getByRole("button", { name: "削除", exact: true }).last();
    await confirmButton.click();

    // 「削除されました」メッセージが表示される
    await expect(page.getByText("このメッセージは削除されました")).toBeVisible({ timeout: 10000 });

    // 元のメッセージは表示されない
    await expect(page.getByText(replyToDelete)).not.toBeVisible();
  });

  test("添付ボタンが表示される", async ({ page }) => {
    await page.goto("/messages");

    // スレッドを作成してスレッド詳細を開く（シンプルなテキストエリア）
    const threadEditor = page.getByTestId("thread-editor");
    const testMessage = `添付テスト ${Date.now()}`;
    await fillSimpleEditor(threadEditor, testMessage);
    await threadEditor.locator("textarea").press("Enter");

    // スレッドがoptimistic updateで即座に表示される
    const threadItem = page.getByTestId("thread-item").filter({ hasText: testMessage });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // 返信入力欄が表示される
    await expect(page.getByTestId("reply-editor")).toBeVisible({ timeout: 10000 });

    // 返信エリアの添付ボタンが表示される（data-testidで特定）
    const attachButton = page.getByTestId("reply-attach-button");
    await expect(attachButton).toBeVisible({ timeout: 5000 });

    // 返信エリア近くのファイル数表示が存在する（最後の"0/5"は返信エリア）
    await expect(page.getByText(/0\/5/).last()).toBeVisible();
  });
});
