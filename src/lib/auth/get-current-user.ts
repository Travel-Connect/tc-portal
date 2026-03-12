import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * リクエストスコープでキャッシュされる auth.getUser()
 *
 * React の cache() は Server Components / Server Actions 専用で、
 * 同一サーバーリクエスト内では2回目以降の呼び出しで
 * Supabase への通信をスキップしキャッシュ結果を返す。
 *
 * 注意: middleware では使えない（Edge Runtime なので React cache 非対応）
 */
export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
