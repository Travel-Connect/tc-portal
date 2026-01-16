"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface ToolOrderInput {
  tool_id: string;
  sort_index: number;
}

export async function saveToolOrders(orders: ToolOrderInput[]) {
  console.log("saveToolOrders called with", orders.length, "orders");

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  console.log("User:", user?.id ? "authenticated" : "not authenticated");

  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // 既存の並び順を削除して新しく挿入（upsert）
  const upsertData = orders.map((order) => ({
    user_id: user.id,
    tool_id: order.tool_id,
    sort_index: order.sort_index,
  }));

  console.log("Upserting", upsertData.length, "records to tool_orders");

  const { error } = await supabase
    .from("tool_orders")
    .upsert(upsertData, {
      onConflict: "user_id,tool_id",
    });

  if (error) {
    console.error("Error saving tool orders:", error);
    console.error("Error details - code:", error.code, "message:", error.message, "details:", error.details, "hint:", error.hint);
    // Check if table doesn't exist (42P01)
    if (error.code === "42P01") {
      return { success: false, error: "tool_ordersテーブルが存在しません。マイグレーションを実行してください。" };
    }
    return { success: false, error: `並び順の保存に失敗しました: ${error.message}` };
  }

  console.log("Tool orders saved successfully");

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
