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

// ツールをユーザー設定の並び順で取得
export async function getToolsWithUserOrder(): Promise<ToolWithCategory[]> {
  const supabase = await createClient();

  // ユーザー取得
  const { data: { user } } = await supabase.auth.getUser();

  // ツール取得
  const { data: tools, error: toolsError } = await supabase
    .from("tools")
    .select(`
      *,
      categories (*)
    `)
    .eq("is_archived", false);

  if (toolsError) {
    console.error("Error fetching tools:", toolsError);
    return [];
  }

  if (!tools || tools.length === 0) {
    return [];
  }

  // ユーザーがログインしていない場合はname順
  if (!user) {
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ユーザーの並び順を取得
  const { data: orders } = await supabase
    .from("tool_orders")
    .select("tool_id, sort_index")
    .eq("user_id", user.id);

  // 並び順マップを作成
  const orderMap = new Map<string, number>();
  if (orders) {
    orders.forEach((order) => {
      orderMap.set(order.tool_id, order.sort_index);
    });
  }

  // ソート: sort_indexがあるものは昇順、無いものは最後（name順）
  return tools.sort((a, b) => {
    const orderA = orderMap.get(a.id);
    const orderB = orderMap.get(b.id);

    // 両方に並び順がある場合
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }

    // aのみ並び順がある場合、aが先
    if (orderA !== undefined) {
      return -1;
    }

    // bのみ並び順がある場合、bが先
    if (orderB !== undefined) {
      return 1;
    }

    // どちらも並び順がない場合、name順
    return a.name.localeCompare(b.name);
  });
}

// ユーザーの並び順を取得
export async function getUserToolOrders(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Map();
  }

  const { data: orders } = await supabase
    .from("tool_orders")
    .select("tool_id, sort_index")
    .eq("user_id", user.id);

  const orderMap = new Map<string, number>();
  if (orders) {
    orders.forEach((order) => {
      orderMap.set(order.tool_id, order.sort_index);
    });
  }

  return orderMap;
}
