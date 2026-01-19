import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// .env.local を読み込み
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

/**
 * TC Portal E2E Test Configuration
 *
 * 環境変数:
 * - E2E_BASE_URL: テスト対象URL (default: http://localhost:3000)
 * - E2E_EMAIL: テストユーザーのメールアドレス
 * - E2E_PASSWORD: テストユーザーのパスワード
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // ログイン状態を共有するため順次実行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 順次実行
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry", // 失敗時にtraceを記録
    video: "on-first-retry", // 失敗時にvideoを記録
    screenshot: "only-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    // 認証状態をセットアップ
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },
    // メインテスト（認証済み状態を使用）
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  // ローカル開発時のみdevサーバーを起動
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120000,
      },

  // 出力設定
  outputDir: "test-results",
});
