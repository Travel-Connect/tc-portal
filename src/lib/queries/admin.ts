import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * 管理者判定（user を引数で受け取るバージョン）
 * auth.getUser() の重複呼び出しを防ぐため、上位で取得した user を渡す
 */
export async function isAdminByUser(user: User): Promise<boolean> {
  const adminEmails = process.env.TC_PORTAL_ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];
  if (adminEmails.includes(user.email || "")) {
    return true;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

/**
 * 管理者判定（既存互換 — 内部で auth.getUser() を呼ぶ）
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return isAdminByUser(user);
}

export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}
