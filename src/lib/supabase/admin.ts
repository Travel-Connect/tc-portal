import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service Role Key を使用した管理者クライアントを作成
 * RLSをバイパスしてデータベースにアクセスできる
 * ※APIルートなどサーバーサイドでのみ使用すること
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for admin client");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
