"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(toolId: string): Promise<{ success: boolean; isFavorite: boolean }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, isFavorite: false };
  }

  // Check if already favorited
  const { data: existing } = await supabase
    .from("favorites")
    .select("tool_id")
    .eq("user_id", user.id)
    .eq("tool_id", toolId)
    .single();

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("tool_id", toolId);

    if (error) {
      console.error("Error removing favorite:", error);
      return { success: false, isFavorite: true };
    }

    revalidatePath("/");
    revalidatePath("/tools");
    return { success: true, isFavorite: false };
  } else {
    // Add favorite
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: user.id, tool_id: toolId });

    if (error) {
      console.error("Error adding favorite:", error);
      return { success: false, isFavorite: false };
    }

    revalidatePath("/");
    revalidatePath("/tools");
    return { success: true, isFavorite: true };
  }
}

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
    // Add pin
    const { error } = await supabase
      .from("pins")
      .insert({ user_id: user.id, tool_id: toolId });

    if (error) {
      console.error("Error adding pin:", error);
      return { success: false, isPinned: false };
    }

    revalidatePath("/");
    revalidatePath("/tools");
    return { success: true, isPinned: true };
  }
}
