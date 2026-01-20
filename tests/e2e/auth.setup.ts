import { test as setup, expect, Page } from "@playwright/test";

const authFileA = "tests/e2e/.auth/userA.json";
const authFileB = "tests/e2e/.auth/userB.json";

/**
 * 共通ログイン処理
 */
async function loginUser(page: Page, email: string, password: string, authFile: string) {
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
}

/**
 * UserA認証セットアップ
 */
setup("authenticate user A", async ({ page }) => {
  const email = process.env.E2E_USER_A_EMAIL;
  const password = process.env.E2E_USER_A_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_USER_A_EMAIL and E2E_USER_A_PASSWORD environment variables are required");
  }

  await loginUser(page, email, password, authFileA);
});

/**
 * UserB認証セットアップ
 */
setup("authenticate user B", async ({ page }) => {
  const email = process.env.E2E_USER_B_EMAIL;
  const password = process.env.E2E_USER_B_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_USER_B_EMAIL and E2E_USER_B_PASSWORD environment variables are required");
  }

  await loginUser(page, email, password, authFileB);
});
