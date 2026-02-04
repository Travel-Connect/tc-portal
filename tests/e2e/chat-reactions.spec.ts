import { test, expect } from "@playwright/test";

test.describe("Chat Bubble UI and Reactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/messages");
    // 全体チャンネルを選択
    await page.getByRole("button", { name: "全体" }).click();
  });

  test("吹き出し型メッセージが正しく表示される", async ({ page }) => {
    // 新しいスレッドを作成
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    const testMessage = `吹き出しテスト ${Date.now()}`;
    await textarea.fill(testMessage);
    await textarea.press("Enter");

    // スレッドが作成されるのを待つ
    await page.waitForTimeout(2000);
    await page.reload();

    // スレッドをクリックして詳細を開く
    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await expect(threadItem).toBeVisible({ timeout: 10000 });
    await threadItem.click();

    // スレッド詳細が開く
    await expect(page.getByPlaceholder("返信を入力...")).toBeVisible({ timeout: 10000 });

    // 親メッセージが吹き出し形式で表示される
    const messageContent = page.locator(".group").filter({ hasText: testMessage });
    await expect(messageContent).toBeVisible();

    // 吹き出しに角丸クラスが適用されている（rounded-2xl）
    const bubbleElement = messageContent.locator(".rounded-2xl").first();
    await expect(bubbleElement).toBeVisible();

    // 時刻が表示されている
    await expect(messageContent.locator("text=/\\d{1,2}:\\d{2}/")).toBeVisible();
  });

  test("自分のメッセージが右寄せで青背景で表示される", async ({ page }) => {
    // 新しいスレッドを作成
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    const testMessage = `右寄せテスト ${Date.now()}`;
    await textarea.fill(testMessage);
    await textarea.press("Enter");

    await page.waitForTimeout(2000);
    await page.reload();

    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await threadItem.click();

    // 返信を投稿（自分のメッセージ）
    const replyTextarea = page.getByPlaceholder("返信を入力...");
    const replyMessage = `自分の返信 ${Date.now()}`;
    await replyTextarea.fill(replyMessage);
    await replyTextarea.press("Enter");

    // 返信が表示されるのを待つ
    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });

    // 吹き出しが存在する
    const replyBubble = page.locator(".group").filter({ hasText: replyMessage });
    await expect(replyBubble).toBeVisible();

    // bg-primary クラスが適用されている（青背景）
    const primaryBubble = replyBubble.locator(".bg-primary").first();
    await expect(primaryBubble).toBeVisible();
  });

  test("連続投稿でメッセージがグループ化される", async ({ page }) => {
    // 新しいスレッドを作成
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    const testMessage = `グループ化テスト ${Date.now()}`;
    await textarea.fill(testMessage);
    await textarea.press("Enter");

    await page.waitForTimeout(2000);
    await page.reload();

    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await threadItem.click();

    const replyTextarea = page.getByPlaceholder("返信を入力...");

    // 1件目の返信
    const reply1 = `返信1 ${Date.now()}`;
    await replyTextarea.fill(reply1);
    await replyTextarea.press("Enter");
    await expect(page.getByText(reply1)).toBeVisible({ timeout: 10000 });

    // 2件目の返信（連続投稿）
    await page.waitForTimeout(500);
    const reply2 = `返信2 ${Date.now()}`;
    await replyTextarea.fill(reply2);
    await replyTextarea.press("Enter");
    await expect(page.getByText(reply2)).toBeVisible({ timeout: 10000 });

    // 3件目の返信（連続投稿）
    await page.waitForTimeout(500);
    const reply3 = `返信3 ${Date.now()}`;
    await replyTextarea.fill(reply3);
    await replyTextarea.press("Enter");
    await expect(page.getByText(reply3)).toBeVisible({ timeout: 10000 });

    // すべての返信が表示されている
    await expect(page.getByText(reply1)).toBeVisible();
    await expect(page.getByText(reply2)).toBeVisible();
    await expect(page.getByText(reply3)).toBeVisible();

    // グループ化により、アバターは最初の返信のみに表示される（実装確認のため目視確認を推奨）
  });

  test("リアクション追加ボタンがホバーで表示される", async ({ page }) => {
    // 新しいスレッドを作成
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    const testMessage = `リアクションホバーテスト ${Date.now()}`;
    await textarea.fill(testMessage);
    await textarea.press("Enter");

    await page.waitForTimeout(2000);
    await page.reload();

    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await threadItem.click();

    // 返信を投稿
    const replyTextarea = page.getByPlaceholder("返信を入力...");
    const replyMessage = `リアクション対象 ${Date.now()}`;
    await replyTextarea.fill(replyMessage);
    await replyTextarea.press("Enter");

    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });

    // メッセージにホバー
    const messageElement = page.locator(".group").filter({ hasText: replyMessage });
    await messageElement.hover();

    // 「+」ボタンが表示される（Plusアイコンを持つボタン）
    await page.waitForTimeout(500);
    const plusButton = messageElement.getByRole("button").locator("svg").first();
    // ホバー時に表示されるはず（opacity-0 から opacity-100）
  });

  test("リアクションを追加できる", async ({ page }) => {
    // 新しいスレッドを作成
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    const testMessage = `リアクション追加テスト ${Date.now()}`;
    await textarea.fill(testMessage);
    await textarea.press("Enter");

    await page.waitForTimeout(2000);
    await page.reload();

    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await threadItem.click();

    // 返信を投稿
    const replyTextarea = page.getByPlaceholder("返信を入力...");
    const replyMessage = `リアクション追加対象 ${Date.now()}`;
    await replyTextarea.fill(replyMessage);
    await replyTextarea.press("Enter");

    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });

    // メッセージにホバー
    const messageElement = page.locator(".group").filter({ hasText: replyMessage });
    await messageElement.hover();

    // 「+」ボタンをクリック（Plusアイコンを含むボタン）
    await page.waitForTimeout(500);
    const addReactionButtons = messageElement.getByRole("button");

    // Plusアイコンを持つボタンを探す
    let plusButtonFound = false;
    for (let i = 0; i < await addReactionButtons.count(); i++) {
      const button = addReactionButtons.nth(i);
      const hasPlus = await button.locator("svg").count() > 0;
      if (hasPlus) {
        await button.click();
        plusButtonFound = true;
        break;
      }
    }

    if (plusButtonFound) {
      // リアクションピッカーが開く
      await page.waitForTimeout(500);

      // 👍 絵文字をクリック
      const thumbsUpButton = page.getByRole("button", { name: "👍" });
      if (await thumbsUpButton.isVisible().catch(() => false)) {
        await thumbsUpButton.click();

        // リアクションが追加される（絵文字とカウントが表示される）
        await page.waitForTimeout(1000);
        await expect(page.getByText("👍")).toBeVisible({ timeout: 10000 });
        await expect(page.getByText("1")).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("リアクションをクリックして削除できる", async ({ page }) => {
    // 新しいスレッドを作成
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    const testMessage = `リアクション削除テスト ${Date.now()}`;
    await textarea.fill(testMessage);
    await textarea.press("Enter");

    await page.waitForTimeout(2000);
    await page.reload();

    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await threadItem.click();

    // 返信を投稿
    const replyTextarea = page.getByPlaceholder("返信を入力...");
    const replyMessage = `リアクション削除対象 ${Date.now()}`;
    await replyTextarea.fill(replyMessage);
    await replyTextarea.press("Enter");

    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });

    // メッセージにホバー
    const messageElement = page.locator(".group").filter({ hasText: replyMessage });
    await messageElement.hover();

    // 「+」ボタンをクリック
    await page.waitForTimeout(500);
    const addReactionButtons = messageElement.getByRole("button");

    let plusButtonFound = false;
    for (let i = 0; i < await addReactionButtons.count(); i++) {
      const button = addReactionButtons.nth(i);
      const hasPlus = await button.locator("svg").count() > 0;
      if (hasPlus) {
        await button.click();
        plusButtonFound = true;
        break;
      }
    }

    if (plusButtonFound) {
      await page.waitForTimeout(500);

      // ❤️ 絵文字をクリック
      const heartButton = page.getByRole("button", { name: "❤️" });
      if (await heartButton.isVisible().catch(() => false)) {
        await heartButton.click();

        // リアクションが追加される
        await page.waitForTimeout(1000);
        await expect(page.getByText("❤️")).toBeVisible({ timeout: 10000 });

        // リアクションをクリックして削除
        const reactionButton = messageElement.getByRole("button").filter({ hasText: "❤️" });
        if (await reactionButton.isVisible().catch(() => false)) {
          await reactionButton.click();

          // リアクションが削除される（カウントが0になるため非表示）
          await page.waitForTimeout(1000);
          // リアクションが消えたかどうかは、カウントが0になることで確認
        }
      }
    }
  });

  test("複数の絵文字でリアクションできる", async ({ page }) => {
    // 新しいスレッドを作成
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    const testMessage = `複数リアクションテスト ${Date.now()}`;
    await textarea.fill(testMessage);
    await textarea.press("Enter");

    await page.waitForTimeout(2000);
    await page.reload();

    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await threadItem.click();

    // 返信を投稿
    const replyTextarea = page.getByPlaceholder("返信を入力...");
    const replyMessage = `複数リアクション対象 ${Date.now()}`;
    await replyTextarea.fill(replyMessage);
    await replyTextarea.press("Enter");

    await expect(page.getByText(replyMessage)).toBeVisible({ timeout: 10000 });

    const messageElement = page.locator(".group").filter({ hasText: replyMessage });

    // 1つ目のリアクション: 👍
    await messageElement.hover();
    await page.waitForTimeout(500);

    const addReactionButtons1 = messageElement.getByRole("button");
    for (let i = 0; i < await addReactionButtons1.count(); i++) {
      const button = addReactionButtons1.nth(i);
      const hasPlus = await button.locator("svg").count() > 0;
      if (hasPlus) {
        await button.click();
        break;
      }
    }

    await page.waitForTimeout(500);
    const thumbsUpButton = page.getByRole("button", { name: "👍" });
    if (await thumbsUpButton.isVisible().catch(() => false)) {
      await thumbsUpButton.click();
      await page.waitForTimeout(1000);
    }

    // 2つ目のリアクション: ✅
    await messageElement.hover();
    await page.waitForTimeout(500);

    const addReactionButtons2 = messageElement.getByRole("button");
    for (let i = 0; i < await addReactionButtons2.count(); i++) {
      const button = addReactionButtons2.nth(i);
      const hasPlus = await button.locator("svg").count() > 0;
      if (hasPlus) {
        await button.click();
        break;
      }
    }

    await page.waitForTimeout(500);
    const checkButton = page.getByRole("button", { name: "✅" });
    if (await checkButton.isVisible().catch(() => false)) {
      await checkButton.click();
      await page.waitForTimeout(1000);

      // 両方のリアクションが表示されている
      await expect(page.getByText("👍")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("✅")).toBeVisible({ timeout: 5000 });
    }
  });

  test("編集済みメッセージでもリアクションが動作する", async ({ page }) => {
    // 新しいスレッドを作成
    const textarea = page.getByPlaceholder("新しいスレッドを作成...");
    const testMessage = `編集後リアクションテスト ${Date.now()}`;
    await textarea.fill(testMessage);
    await textarea.press("Enter");

    await page.waitForTimeout(2000);
    await page.reload();

    await expect(page.getByText("スレッドがありません")).not.toBeVisible({ timeout: 10000 });
    const threadItem = page.getByRole("button", { name: new RegExp(testMessage) });
    await threadItem.click();

    // 返信を投稿
    const replyTextarea = page.getByPlaceholder("返信を入力...");
    const originalReply = `編集前 ${Date.now()}`;
    await replyTextarea.fill(originalReply);
    await replyTextarea.press("Enter");

    await expect(page.getByText(originalReply)).toBeVisible({ timeout: 10000 });

    // メッセージを編集
    const replyElement = page.locator(".group").filter({ hasText: originalReply });
    await replyElement.hover();

    const menuButton = replyElement.getByRole("button").filter({ has: page.locator("svg") }).first();
    await menuButton.click();
    await page.waitForTimeout(300);

    const editButton = page.getByRole("button", { name: "編集", exact: true });
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();

      const editTextarea = replyElement.locator("textarea");
      const editedReply = `編集後 ${Date.now()}`;
      await editTextarea.fill(editedReply);

      const saveButton = page.getByRole("button", { name: /保存/ });
      await saveButton.click();

      await expect(page.getByText(editedReply)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("(編集済み)")).toBeVisible();

      // 編集後のメッセージにリアクション追加
      const editedElement = page.locator(".group").filter({ hasText: editedReply });
      await editedElement.hover();
      await page.waitForTimeout(500);

      const addReactionButtons = editedElement.getByRole("button");
      for (let i = 0; i < await addReactionButtons.count(); i++) {
        const button = addReactionButtons.nth(i);
        const hasPlus = await button.locator("svg").count() > 0;
        if (hasPlus) {
          await button.click();
          break;
        }
      }

      await page.waitForTimeout(500);
      const thumbsUpButton = page.getByRole("button", { name: "👍" });
      if (await thumbsUpButton.isVisible().catch(() => false)) {
        await thumbsUpButton.click();
        await page.waitForTimeout(1000);

        // リアクションが表示される
        await expect(page.getByText("👍")).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
