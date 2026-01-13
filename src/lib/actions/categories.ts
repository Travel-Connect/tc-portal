"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isCurrentUserAdmin } from "@/lib/queries/admin";

export interface CategoryFormData {
  name: string;
  sort_index: number;
}

export async function createCategory(data: CategoryFormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "権限がありません" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({
      name: data.name,
      sort_index: data.sort_index,
    });

  if (error) {
    console.error("Error creating category:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/categories");
  return { success: true };
}

export async function updateCategory(id: string, data: CategoryFormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "権限がありません" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: data.name,
      sort_index: data.sort_index,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating category:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/categories");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "権限がありません" };
  }

  const supabase = await createClient();

  // Check if category has tools
  const { data: tools } = await supabase
    .from("tools")
    .select("id")
    .eq("category_id", id)
    .limit(1);

  if (tools && tools.length > 0) {
    return { success: false, error: "このカテゴリにはツールが存在するため削除できません" };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/categories");
  return { success: true };
}
