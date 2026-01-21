import { Wrench } from "lucide-react";
import { getCategories } from "@/lib/queries/categories";
import { createClient } from "@/lib/supabase/server";
import { getUserToolPreferences } from "@/lib/actions/tool-preferences";
import { ToolList } from "./ToolList";
import type { Tool, Category, ToolUserPreference } from "@/types/database";

interface ToolWithCategory extends Tool {
  categories: Category | null;
}

async function getAllTools(): Promise<ToolWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tools")
    .select(`
      *,
      categories (*)
    `)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching tools:", error);
    return [];
  }

  return data || [];
}

export default async function ToolsAdminPage() {
  const [categories, tools, prefsResult] = await Promise.all([
    getCategories(),
    getAllTools(),
    getUserToolPreferences(),
  ]);

  const colorPreferences: Record<string, ToolUserPreference> = prefsResult.preferences || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wrench className="w-6 h-6" />
        <h1 className="text-2xl font-bold">ツール管理</h1>
      </div>

      <ToolList initialTools={tools} categories={categories} colorPreferences={colorPreferences} />
    </div>
  );
}
