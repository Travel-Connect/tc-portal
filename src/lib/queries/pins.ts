import { createClient } from "@/lib/supabase/server";
import type { Tool, Category } from "@/types/database";

export interface PinnedToolWithCategory extends Tool {
  categories: Category | null;
}

export async function getPinnedTools(userId: string): Promise<PinnedToolWithCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pins")
    .select(`
      tool_id,
      sort_order,
      tools (
        *,
        categories (*)
      )
    `)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching pins:", error);
    return [];
  }

  // Extract tools from the joined data (already sorted by sort_order)
  return (data || [])
    .map((p) => p.tools as unknown as PinnedToolWithCategory)
    .filter((t): t is PinnedToolWithCategory => t !== null && !t.is_archived);
}

export async function getPinnedToolIds(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pins")
    .select("tool_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching pin ids:", error);
    return [];
  }

  return (data || []).map((p) => p.tool_id);
}
