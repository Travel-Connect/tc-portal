import { ToolsFilter } from "@/components/tools";
import { getCachedUser } from "@/lib/auth/get-current-user";
import { getCategories } from "@/lib/queries/categories";
import { getToolsWithUserOrder } from "@/lib/queries/tools";
import { getPinnedToolIds } from "@/lib/queries/pins";
import { createPerfContext, measure, logPerfSummary } from "@/lib/perf/measure";

interface ToolsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const ctx = createPerfContext();

  const params = await searchParams;
  const searchQuery = params.q || "";

  const user = await measure("tools.getCachedUser", () => getCachedUser(), ctx);

  // Fetch all data in parallel
  const [categories, tools, pinnedIds] = await measure("tools.parallelQueries", () => Promise.all([
    getCategories(),
    getToolsWithUserOrder(),
    user ? getPinnedToolIds(user.id) : Promise.resolve([]),
  ]), ctx);

  logPerfSummary(ctx);

  return (
    <ToolsFilter
      tools={tools}
      categories={categories}
      pinnedIds={pinnedIds}
      searchQuery={searchQuery}
    />
  );
}
