import { ToolsFilter } from "@/components/tools";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries/categories";
import { getToolsWithUserOrder } from "@/lib/queries/tools";
import { getFavoriteToolIds } from "@/lib/queries/favorites";
import { getPinnedToolIds } from "@/lib/queries/pins";

interface ToolsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const params = await searchParams;
  const searchQuery = params.q || "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all data in parallel
  const [categories, tools, favoriteIds, pinnedIds] = await Promise.all([
    getCategories(),
    getToolsWithUserOrder(),
    user ? getFavoriteToolIds(user.id) : Promise.resolve([]),
    user ? getPinnedToolIds(user.id) : Promise.resolve([]),
  ]);

  return (
    <ToolsFilter
      tools={tools}
      categories={categories}
      favoriteIds={favoriteIds}
      pinnedIds={pinnedIds}
      searchQuery={searchQuery}
    />
  );
}
