import { FolderTree } from "lucide-react";
import { getCategories } from "@/lib/queries/categories";
import { CategoryList } from "./CategoryList";

export default async function CategoriesAdminPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderTree className="w-6 h-6" />
        <h1 className="text-2xl font-bold">カテゴリ管理</h1>
      </div>

      <CategoryList initialCategories={categories} />
    </div>
  );
}
