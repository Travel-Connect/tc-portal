import { ToolsFilter } from "@/components/tools";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries/categories";
import { getToolsWithUserOrder } from "@/lib/queries/tools";
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
  const [categories, tools, pinnedIds] = await Promise.all([
    getCategories(),
    getToolsWithUserOrder(),
    user ? getPinnedToolIds(user.id) : Promise.resolve([]),
  ]);

  return (
    <ToolsFilter
      tools={tools}
      categories={categories}
      pinnedIds={pinnedIds}
      searchQuery={searchQuery}
    />
  );
}
