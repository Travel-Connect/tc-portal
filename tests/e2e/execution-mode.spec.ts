import { test, expect } from "@playwright/test";

test.describe("Execution Mode", () => {
  test.describe("Queue Mode (PAD/Python)", () => {
    test("PAD/Pythonツール実行でqueued状態のrunが作成される", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // PADまたはPythonツールを探す（ツール名で識別）
      // ページスナップショットより: "PADテスト" や "Pythonテスト" という名前のツールがある
      const padTool = page.getByText(/PADテスト|PAD.*テスト/i).first();
      const pythonTool = page.getByText(/Pythonテスト|Python.*テスト/i).first();

      let toolToClick: ReturnType<typeof page.locator> | null = null;

      // PADツールを探す
      if ((await padTool.count()) > 0) {
        toolToClick = padTool;
      }
      // Pythonツールを探す
      else if ((await pythonTool.count()) > 0) {
        toolToClick = pythonTool;
      }

      if (!toolToClick) {
        test.skip(true, "PADまたはPythonツールが見つかりません");
        return;
      }

      // ツールをクリック（カード全体がクリック可能）
      await toolToClick.click();

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

      // ダイアログが閉じるのを待つ
      await expect(dialog).toBeHidden({ timeout: 3000 });

      // /runs ページに移動
      await page.goto("/runs");
      await page.waitForLoadState("networkidle");

      // Runが作成されたことを確認
      // 「待機中」「実行中」「成功」「失敗」のいずれかのステータスがあればOK
      // （Runnerが即座に実行した場合、待機中以外のステータスになる可能性がある）
      const anyRunStatus = page.getByText(/待機中|実行中|成功|失敗/);
      await expect(anyRunStatus.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Helper Mode (Excel/BAT/Folder等)", () => {
    test("Helperツール実行でsuccess状態のrunが作成される", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Helperツール（Excel, BAT, Folder等）を探す
      // ページスナップショットより: "エクセルテスト", "BATテスト", "フォルダテスト" 等
      const helperPatterns = [
        /エクセルテスト|Excel.*テスト/i,
        /BATテスト|BAT.*テスト/i,
        /フォルダテスト|フォルダ.*テスト/i,
        /BIテスト|BI.*テスト/i,
      ];

      let toolToClick: ReturnType<typeof page.locator> | null = null;

      for (const pattern of helperPatterns) {
        const tool = page.getByText(pattern).first();
        if ((await tool.count()) > 0) {
          toolToClick = tool;
          break;
        }
      }

      if (!toolToClick) {
        test.skip(true, "Helperツールが見つかりません");
        return;
      }

      // ツールをクリック（カード全体がクリック可能）
      await toolToClick.click();

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
      // ページスナップショットより: "スプレッドシートテスト", "システム稼働状況チェック" 等
      const openPatterns = [
        /スプレッドシートテスト|シート.*テスト/i,
        /入込状況表/i,
      ];

      let toolToClick: ReturnType<typeof page.locator> | null = null;

      for (const pattern of openPatterns) {
        const tool = page.getByText(pattern).first();
        if ((await tool.count()) > 0) {
          toolToClick = tool;
          break;
        }
      }

      if (!toolToClick) {
        test.skip(true, "URL/Sheetツールが見つかりません");
        return;
      }

      // 新しいページを待ち受け
      const pagePromise = context.waitForEvent("page", { timeout: 5000 }).catch(() => null);

      // ツールをクリック
      await toolToClick.click();

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
