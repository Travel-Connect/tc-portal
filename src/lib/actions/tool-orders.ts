"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ToolOrderInput {
  tool_id: string;
  sort_index: number;
}

export async function saveToolOrders(orders: ToolOrderInput[]) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // 既存の並び順を削除して新しく挿入（upsert）
  const upsertData = orders.map((order) => ({
    user_id: user.id,
    tool_id: order.tool_id,
    sort_index: order.sort_index,
  }));

  const { error } = await supabase
    .from("tool_orders")
    .upsert(upsertData, {
      onConflict: "user_id,tool_id",
    });

  if (error) {
    console.error("Error saving tool orders:", error);
    return { success: false, error: "並び順の保存に失敗しました" };
  }

  revalidatePath("/tools");
  revalidatePath("/");

  return { success: true };
}

export async function resetToolOrders() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("tool_orders")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error resetting tool orders:", error);
    return { success: false, error: "並び順のリセットに失敗しました" };
  }

  revalidatePath("/tools");
  revalidatePath("/");

  return { success: true };
}
