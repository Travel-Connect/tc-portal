import { test, expect } from "@playwright/test";

/**
 * パフォーマンスベースライン計測テスト
 *
 * 目的: 各ページの表示速度を数値化して記録する
 * 実行: npx playwright test perf-baseline
 *
 * 注意: このテストは「閾値でfailさせる」のではなく、
 *       「現状の数値を記録する」ことが目的です。
 *       閾値は Before/After 比較後に設定します。
 */

interface PerfResult {
  page: string;
  navigationMs: number;
  contentVisibleMs: number;
}

const results: PerfResult[] = [];

test.afterAll(() => {
  console.log("\n====== PERFORMANCE BASELINE REPORT ======");
  console.log("Page                  | Navigation | Content Visible");
  console.log("----------------------|------------|----------------");
  for (const r of results) {
    const pg = r.page.padEnd(22);
    const nav = `${r.navigationMs}ms`.padStart(10);
    const vis = `${r.contentVisibleMs}ms`.padStart(14);
    console.log(`${pg}|${nav} |${vis}`);
  }
  console.log("==========================================\n");
});

test.describe("Performance Baseline", () => {
  test("/ (Home) 表示速度", async ({ page }) => {
    const start = Date.now();
    const response = await page.goto("/");
    const navigationMs = Date.now() - start;

    // メインコンテンツが表示されるまで
    await page.getByRole("heading", { name: /ツール|ピン留め|カテゴリ/ }).first().waitFor({ timeout: 15000 });
    const contentVisibleMs = Date.now() - start;

    results.push({ page: "/ (Home)", navigationMs, contentVisibleMs });

    console.log(`[PERF-E2E] Home: navigation=${navigationMs}ms, contentVisible=${contentVisibleMs}ms, status=${response?.status()}`);
    expect(response?.status()).toBe(200);
  });

  test("/messages 表示速度", async ({ page }) => {
    const start = Date.now();
    const response = await page.goto("/messages");
    const navigationMs = Date.now() - start;

    // チャンネルリストが表示されるまで
    await page.getByText("チャンネル").first().waitFor({ timeout: 15000 });
    const contentVisibleMs = Date.now() - start;

    results.push({ page: "/messages", navigationMs, contentVisibleMs });

    console.log(`[PERF-E2E] Messages: navigation=${navigationMs}ms, contentVisible=${contentVisibleMs}ms, status=${response?.status()}`);
    expect(response?.status()).toBe(200);
  });

  test("/announcements 表示速度", async ({ page }) => {
    const start = Date.now();
    const response = await page.goto("/announcements");
    const navigationMs = Date.now() - start;

    // お知らせ見出しが表示されるまで
    await page.getByRole("heading", { name: "お知らせ" }).waitFor({ timeout: 15000 });
    const contentVisibleMs = Date.now() - start;

    results.push({ page: "/announcements", navigationMs, contentVisibleMs });

    console.log(`[PERF-E2E] Announcements: navigation=${navigationMs}ms, contentVisible=${contentVisibleMs}ms, status=${response?.status()}`);
    expect(response?.status()).toBe(200);
  });

  test("/tools 表示速度", async ({ page }) => {
    const start = Date.now();
    const response = await page.goto("/tools");
    const navigationMs = Date.now() - start;

    // ツール一覧が表示されるまで（カードまたはフィルターUI）
    await page.locator("input[placeholder*='検索'], input[placeholder*='ツール']").first().waitFor({ timeout: 15000 }).catch(() => {
      return page.getByRole("heading", { name: /ツール/ }).first().waitFor({ timeout: 10000 });
    });
    const contentVisibleMs = Date.now() - start;

    results.push({ page: "/tools", navigationMs, contentVisibleMs });

    console.log(`[PERF-E2E] Tools: navigation=${navigationMs}ms, contentVisible=${contentVisibleMs}ms, status=${response?.status()}`);
    expect(response?.status()).toBe(200);
  });

  test("/messages チャンネル切替速度", async ({ page }) => {
    await page.goto("/messages");

    // 初期表示を待つ
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // 2番目のチャンネルがあればクリックして切替速度を計測
    const channels = page.locator("[data-testid='channel-item'], a[href*='/messages']").filter({ hasNotText: /メッセージ/ });
    const channelCount = await channels.count();

    if (channelCount >= 2) {
      const start = Date.now();
      await channels.nth(1).click();

      // スレッドリストが更新されるまで
      await page.waitForLoadState("networkidle");
      const switchMs = Date.now() - start;

      console.log(`[PERF-E2E] Channel Switch: ${switchMs}ms`);
    } else {
      console.log("[PERF-E2E] Channel Switch: skipped (< 2 channels)");
    }
  });
});
