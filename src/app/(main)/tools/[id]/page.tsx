import { notFound } from "next/navigation";
import { getToolById } from "@/lib/queries/tools";
import { getRunsByToolId, getToolLastSuccess } from "@/lib/queries/runs";
import { getCachedUser } from "@/lib/auth/get-current-user";
import { ToolDetailClient } from "./ToolDetailClient";

interface ToolDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { id } = await params;

  const [tool, user] = await Promise.all([
    getToolById(id),
    getCachedUser(),
  ]);

  if (!tool) {
    notFound();
  }

  const [runs, lastSuccess] = await Promise.all([
    getRunsByToolId(id, 20),
    getToolLastSuccess(id),
  ]);

  return (
    <ToolDetailClient
      tool={tool}
      category={tool.categories}
      runs={runs}
      lastSuccess={lastSuccess}
      userId={user?.id ?? null}
    />
  );
}
