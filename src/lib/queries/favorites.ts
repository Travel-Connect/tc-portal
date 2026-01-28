import { createClient } from "@/lib/supabase/server";
import type { Tool, Category } from "@/types/database";

export interface FavoriteToolWithCategory extends Tool {
  categories: Category | null;
}

export async function getFavoriteTools(userId: string): Promise<FavoriteToolWithCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("favorites")
    .select(`
      tool_id,
      tools (
        *,
        categories (*)
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching favorites:", error);
    return [];
  }

  // Extract tools from the joined data
  return (data || [])
    .map((f) => f.tools as unknown as FavoriteToolWithCategory)
    .filter((t): t is FavoriteToolWithCategory => t !== null && !t.is_archived && !t.deleted_at);
}

export async function getFavoriteToolIds(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("favorites")
    .select("tool_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching favorite ids:", error);
    return [];
  }

  return (data || []).map((f) => f.tool_id);
}
