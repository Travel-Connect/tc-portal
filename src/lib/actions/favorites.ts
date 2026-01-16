"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function togglePin(toolId: string): Promise<{ success: boolean; isPinned: boolean }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, isPinned: false };
  }

  // Check if already pinned
  const { data: existing } = await supabase
    .from("pins")
    .select("tool_id")
    .eq("user_id", user.id)
    .eq("tool_id", toolId)
    .single();

  if (existing) {
    // Remove pin
    const { error } = await supabase
      .from("pins")
      .delete()
      .eq("user_id", user.id)
      .eq("tool_id", toolId);

    if (error) {
      console.error("Error removing pin:", error);
      return { success: false, isPinned: true };
    }

    revalidatePath("/");
    revalidatePath("/tools");
    return { success: true, isPinned: false };
  } else {
    // Get max sort_order for new pin
    const { data: maxOrderData } = await supabase
      .from("pins")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const newSortOrder = (maxOrderData?.sort_order ?? -1) + 1;

    // Add pin with sort_order
    const { error } = await supabase
      .from("pins")
      .insert({ user_id: user.id, tool_id: toolId, sort_order: newSortOrder });

    if (error) {
      console.error("Error adding pin:", error);
      return { success: false, isPinned: false };
    }

    revalidatePath("/");
    revalidatePath("/tools");
    return { success: true, isPinned: true };
  }
}

interface PinOrder {
  tool_id: string;
  sort_order: number;
}

export async function savePinOrders(
  orders: PinOrder[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  // Update each pin's sort_order
  for (const order of orders) {
    const { error } = await supabase
      .from("pins")
      .update({ sort_order: order.sort_order })
      .eq("user_id", user.id)
      .eq("tool_id", order.tool_id);

    if (error) {
      console.error("Error updating pin order:", error);
      return { success: false, error: `並び順の保存に失敗しました: ${error.message}` };
    }
  }

  revalidatePath("/");
  return { success: true };
}
