import { test as setup, expect } from "@playwright/test";

const authFile = "tests/e2e/.auth/user.json";

/**
 * グローバルセットアップ: ログイン状態を保存
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_EMAIL and E2E_PASSWORD environment variables are required");
  }

  // ログインページへ
  await page.goto("/login");

  // メールアドレス入力
  await page.getByLabel("メールアドレス").fill(email);

  // パスワード入力（パスワード認証が有効な場合）
  const passwordInput = page.getByLabel("パスワード");
  if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await passwordInput.fill(password);
  }

  // ログインボタンクリック
  await page.getByRole("button", { name: /ログイン/i }).click();

  // ホーム画面に遷移するまで待機
  await expect(page).toHaveURL("/", { timeout: 30000 });

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
});
