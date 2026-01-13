import { createClient } from "@/lib/supabase/server";
import type { Tool, Category } from "@/types/database";

export interface ToolWithCategory extends Tool {
  categories: Category | null;
}

export async function getTools(): Promise<ToolWithCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tools")
    .select(`
      *,
      categories (*)
    `)
    .eq("is_archived", false)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching tools:", error);
    return [];
  }

  return data || [];
}

export async function getToolsByCategory(categoryId: string): Promise<Tool[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tools")
    .select("*")
    .eq("category_id", categoryId)
    .eq("is_archived", false)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching tools by category:", error);
    return [];
  }

  return data || [];
}

export async function searchTools(query: string): Promise<ToolWithCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tools")
    .select(`
      *,
      categories (*)
    `)
    .eq("is_archived", false)
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error searching tools:", error);
    return [];
  }

  return data || [];
}
