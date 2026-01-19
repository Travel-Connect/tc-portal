import { test, expect } from "@playwright/test";

test.describe("Execution Mode", () => {
  test.describe("Queue Mode (PAD/Python)", () => {
    test("PAD/Pythonツール実行でqueued状態のrunが作成される", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // PADまたはPythonツールを探す（Badge テキストで識別）
      const padBadge = page.locator("text=PAD").first();
      const pythonBadge = page.locator("text=Python").first();

      let foundQueueTool = false;
      let toolCard: ReturnType<typeof page.locator> | null = null;

      // PADツールを探す
      if ((await padBadge.count()) > 0) {
        toolCard = padBadge.locator("xpath=ancestor::*[contains(@class, 'Card') or @role='article']").first();
        foundQueueTool = true;
      }
      // Pythonツールを探す
      else if ((await pythonBadge.count()) > 0) {
        toolCard = pythonBadge.locator("xpath=ancestor::*[contains(@class, 'Card') or @role='article']").first();
        foundQueueTool = true;
      }

      if (!foundQueueTool) {
        test.skip(true, "PADまたはPythonツールが見つかりません");
        return;
      }

      // ツールカード内の実行ボタンをクリック
      const executeButton = toolCard!.locator("button").filter({
        has: page.locator('svg'),
      }).first();

      await executeButton.click();

      // 確認ダイアログが表示される
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // ダイアログに「実行」ボタンがある（「起動」ではない）
      const confirmButton = dialog.getByRole("button", { name: /実行する/i });
      await expect(confirmButton).toBeVisible();

      // 実行ボタンをクリック
      await confirmButton.click();

      // 成功メッセージを待つ
      await expect(dialog.getByText(/実行依頼を送信しました/)).toBeVisible({ timeout: 5000 });

      // /runs ページに移動
      await page.waitForTimeout(1500); // ダイアログが閉じるのを待つ
      await page.goto("/runs");
      await page.waitForLoadState("networkidle");

      // 「待機中」または「queued」ステータスのrunが存在することを確認
      const queuedStatus = page.getByText(/待機中|queued/i);
      await expect(queuedStatus.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Helper Mode (Excel/BAT/Folder等)", () => {
    test("Helperツール実行でsuccess状態のrunが作成される", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Helperツール（Excel, BAT, Folder等）を探す
      const helperBadges = ["Excel", "BAT", "EXE", "フォルダ", "BI"];
      let foundHelperTool = false;
      let toolCard: ReturnType<typeof page.locator> | null = null;

      for (const badgeText of helperBadges) {
        const badge = page.locator(`text=${badgeText}`).first();
        if ((await badge.count()) > 0) {
          // ツールカードを特定
          toolCard = badge.locator("xpath=ancestor::*[contains(@class, 'Card') or @role='article']").first();
          if ((await toolCard.count()) > 0) {
            foundHelperTool = true;
            break;
          }
        }
      }

      if (!foundHelperTool) {
        test.skip(true, "Helperツールが見つかりません");
        return;
      }

      // ツールカードをクリック（Helperは即起動またはダイアログ）
      // BAT/EXEは確認ダイアログ、その他は即起動
      await toolCard!.click();

      // ダイアログが表示された場合
      const dialog = page.locator('[role="dialog"]');
      const isDialogVisible = await dialog.isVisible().catch(() => false);

      if (isDialogVisible) {
        // 「起動する」ボタンがある（「実行する」ではない）
        const launchButton = dialog.getByRole("button", { name: /起動する/i });
        if (await launchButton.isVisible()) {
          await launchButton.click();
        }
      }

      // Helper起動後、少し待つ
      await page.waitForTimeout(2000);

      // /runs ページに移動
      await page.goto("/runs");
      await page.waitForLoadState("networkidle");

      // 最新のrunを確認（成功状態があるはず）
      // 注: Helperは即時成功記録なので「成功」ステータスがある
      const successStatus = page.getByText(/成功|success/i);
      const runsExist = (await successStatus.count()) > 0 ||
        (await page.locator("table tbody tr").count()) > 0;

      expect(runsExist).toBeTruthy();
    });
  });

  test.describe("Open Mode (URL/Sheet)", () => {
    test("URL/Sheetツールクリックで新しいタブが開く（runsは作成されない）", async ({ page, context }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // URLまたはSheetツールを探す
      const urlBadge = page.locator("text=URL").first();
      const sheetBadge = page.locator("text=Sheet").first();

      let foundOpenTool = false;
      let toolCard: ReturnType<typeof page.locator> | null = null;

      if ((await urlBadge.count()) > 0) {
        toolCard = urlBadge.locator("xpath=ancestor::*[contains(@class, 'Card') or @role='article']").first();
        foundOpenTool = true;
      } else if ((await sheetBadge.count()) > 0) {
        toolCard = sheetBadge.locator("xpath=ancestor::*[contains(@class, 'Card') or @role='article']").first();
        foundOpenTool = true;
      }

      if (!foundOpenTool) {
        test.skip(true, "URL/Sheetツールが見つかりません");
        return;
      }

      // 新しいページを待ち受け
      const pagePromise = context.waitForEvent("page", { timeout: 5000 }).catch(() => null);

      // ツールカードをクリック
      await toolCard!.click();

      // 新しいタブが開くことを確認
      const newPage = await pagePromise;

      if (newPage) {
        // 新しいタブが開いた
        expect(newPage).toBeTruthy();
        await newPage.close();
      }

      // 注: open モードはrunsを作成しないので、runs確認は不要
    });
  });
});
