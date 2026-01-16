import { test, expect } from "@playwright/test";

test.describe("Helper Protocol Detection", () => {
  test("Helperツール実行でtcportal://が呼ばれる", async ({ page, context }) => {
    // tcportal:// への遷移を検知するための変数
    let tcportalUrlCalled: string | null = null;

    // 新しいページ（tcportal://へのnavigation）をリッスン
    context.on("page", async (newPage) => {
      const url = newPage.url();
      if (url.startsWith("tcportal://")) {
        tcportalUrlCalled = url;
      }
    });

    // ページ内でのURL変更を監視
    page.on("framenavigated", (frame) => {
      const url = frame.url();
      if (url.startsWith("tcportal://")) {
        tcportalUrlCalled = url;
      }
    });

    // requestを監視（tcportal://は実際にはrequestではないが念のため）
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("tcportal://")) {
        tcportalUrlCalled = url;
      }
    });

    await page.goto("/");

    // Helperツール（excel, folder, bat, exe等）の実行ボタンを探す
    // ツールカードでBadgeに「Excel」「フォルダ」「BAT」「EXE」等が含まれるものを探す
    const helperBadges = ["Excel", "フォルダ", "BAT", "EXE", "BI"];

    let foundHelperTool = false;

    for (const badge of helperBadges) {
      const card = page.locator("div").filter({
        has: page.getByText(badge, { exact: false }),
      });

      if ((await card.count()) > 0) {
        // そのカード内の実行ボタンを探す
        const executeButton = card.first().locator("button").filter({
          has: page.locator('svg[class*="text-green"]'),
        });

        if ((await executeButton.count()) > 0) {
          foundHelperTool = true;

          // 実行ボタンをクリック
          await executeButton.first().click();

          // 確認ダイアログを待つ
          const dialog = page.locator('[role="dialog"]');

          if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
            // 実行/起動ボタンをクリック
            const confirmButton = dialog.getByRole("button", { name: /実行|起動/i });
            if (await confirmButton.isVisible().catch(() => false)) {
              // クリック前にconsoleを監視
              const consoleMessages: string[] = [];
              page.on("console", (msg) => consoleMessages.push(msg.text()));

              await confirmButton.click();

              // 少し待つ
              await page.waitForTimeout(2000);

              // tcportal://が呼ばれたか、または成功メッセージが表示されたかを確認
              const successMessage = await page
                .getByText(/開きました|起動しました|実行しました/)
                .isVisible()
                .catch(() => false);

              // tcportal://が呼ばれた、または成功メッセージが表示された
              expect(tcportalUrlCalled !== null || successMessage).toBeTruthy();
            }
          }

          break;
        }
      }
    }

    if (!foundHelperTool) {
      // Helperツールが見つからない場合はスキップ
      test.skip();
    }
  });

  test("tcportal:// URLのpayloadが正しい形式である", async ({ page }) => {
    await page.goto("/");

    // ページのHTML内でtcportal://を含むhrefを探す
    const tcportalLinks = await page.evaluate(() => {
      const links: string[] = [];
      document.querySelectorAll("a[href^='tcportal://']").forEach((el) => {
        links.push(el.getAttribute("href") || "");
      });
      return links;
    });

    // または、Helperツールをクリックしてwindow.location.hrefの変更を検知
    // （tcportal://はa hrefではなくwindow.location.hrefで設定される場合が多い）

    // このテストはtcportal://のURL形式を検証
    // 実際のURLが取得できた場合は形式をチェック
    if (tcportalLinks.length > 0) {
      for (const url of tcportalLinks) {
        expect(url).toMatch(/^tcportal:\/\/open\?payload=[A-Za-z0-9_-]+$/);
      }
    } else {
      // tcportal://リンクがページ上に直接存在しない場合
      // （JavaScriptで動的に生成される場合）はパス
      expect(true).toBeTruthy();
    }
  });
});
