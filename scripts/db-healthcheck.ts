/**
 * TC Portal Database Health Check Script
 *
 * 使い方:
 *   npx tsx scripts/db-healthcheck.ts
 *
 * 結果は docs/db-healthcheck.md に保存されます
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_URL or SERVICE_ROLE_KEY not found in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface HealthCheckResult {
  section: string;
  data: unknown;
  error?: string;
}

const results: HealthCheckResult[] = [];

async function runQuery<T>(section: string, query: Promise<{ data: T | null; error: unknown }>) {
  const { data, error } = await query;
  if (error) {
    results.push({ section, data: null, error: String(error) });
  } else {
    results.push({ section, data });
  }
  return data;
}

async function main() {
  console.log("TC Portal Database Health Check");
  console.log("================================\n");

  const now = new Date().toISOString();

  // 1. tools: tool_type別の件数
  console.log("Checking tools by tool_type...");
  const toolsByType = await supabase
    .from("tools")
    .select("tool_type")
    .then(({ data }) => {
      if (!data) return [];
      const counts: Record<string, number> = {};
      for (const t of data) {
        counts[t.tool_type] = (counts[t.tool_type] || 0) + 1;
      }
      return Object.entries(counts).map(([type, count]) => ({ tool_type: type, count }));
    });
  results.push({ section: "1. tools by tool_type", data: toolsByType });

  // 2. tools: execution_mode別の件数
  console.log("Checking tools by execution_mode...");
  const toolsByMode = await supabase
    .from("tools")
    .select("execution_mode")
    .then(({ data }) => {
      if (!data) return [];
      const counts: Record<string, number> = {};
      for (const t of data) {
        counts[t.execution_mode] = (counts[t.execution_mode] || 0) + 1;
      }
      return Object.entries(counts).map(([mode, count]) => ({ execution_mode: mode, count }));
    });
  results.push({ section: "2. tools by execution_mode", data: toolsByMode });

  // 3. runs: status別の件数
  console.log("Checking runs by status...");
  const runsByStatus = await supabase
    .from("runs")
    .select("status")
    .then(({ data }) => {
      if (!data) return [];
      const counts: Record<string, number> = {};
      for (const r of data) {
        counts[r.status] = (counts[r.status] || 0) + 1;
      }
      return Object.entries(counts).map(([status, count]) => ({ status, count }));
    });
  results.push({ section: "3. runs by status", data: runsByStatus });

  // 4. runs: tool_type別のstatus分布
  console.log("Checking runs by tool_type and status...");
  const { data: runsWithTools } = await supabase
    .from("runs")
    .select("status, tool_id, tools(tool_type)");

  const runsByTypeStatus: Record<string, Record<string, number>> = {};
  if (runsWithTools) {
    for (const r of runsWithTools) {
      // tools は単一オブジェクトまたは配列として返される可能性がある
      const tools = r.tools as unknown as { tool_type: string } | { tool_type: string }[] | null;
      const toolType = (Array.isArray(tools) ? tools[0]?.tool_type : tools?.tool_type) || "unknown";
      if (!runsByTypeStatus[toolType]) runsByTypeStatus[toolType] = {};
      runsByTypeStatus[toolType][r.status] = (runsByTypeStatus[toolType][r.status] || 0) + 1;
    }
  }
  const runsByTypeStatusArray = Object.entries(runsByTypeStatus).flatMap(([type, statuses]) =>
    Object.entries(statuses).map(([status, count]) => ({ tool_type: type, status, count }))
  );
  results.push({ section: "4. runs by tool_type and status", data: runsByTypeStatusArray });

  // 5. runs: finished_atがNULLで終了状態（異常）
  console.log("Checking anomalous runs (finished_at NULL but terminal status)...");
  const { data: anomalousRuns } = await supabase
    .from("runs")
    .select("id, status, requested_at, started_at, error_message, tool_id, tools(name, tool_type)")
    .is("finished_at", null)
    .not("status", "in", "(queued,running)")
    .limit(10);
  results.push({ section: "5. anomalous runs (finished_at NULL)", data: anomalousRuns || [] });

  // 6. runs: 現在queued/running
  console.log("Checking currently pending runs...");
  const { data: pendingRuns } = await supabase
    .from("runs")
    .select("id, status, requested_at, started_at, tool_id, tools(name)")
    .in("status", ["queued", "running"])
    .order("requested_at", { ascending: true });
  results.push({ section: "6. currently pending runs", data: pendingRuns || [] });

  // 7. runs: exeタイプの最新10件
  console.log("Checking latest exe runs...");
  const { data: exeRuns } = await supabase
    .from("runs")
    .select("id, status, summary, error_message, requested_at, finished_at, tools!inner(name, tool_type)")
    .eq("tools.tool_type", "exe")
    .order("requested_at", { ascending: false })
    .limit(10);
  results.push({ section: "7. latest exe runs", data: exeRuns || [] });

  // 8. machines一覧
  console.log("Checking machines...");
  const { data: machines } = await supabase
    .from("machines")
    .select("id, name, enabled, last_seen_at, created_at")
    .order("last_seen_at", { ascending: false, nullsFirst: false });
  results.push({ section: "8. machines", data: machines || [] });

  // 9. categories一覧
  console.log("Checking categories...");
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_index")
    .order("sort_index", { ascending: true });

  // ツール数をカウント
  const { data: allTools } = await supabase.from("tools").select("category_id");
  const toolCountByCategory: Record<string, number> = {};
  if (allTools) {
    for (const t of allTools) {
      toolCountByCategory[t.category_id] = (toolCountByCategory[t.category_id] || 0) + 1;
    }
  }
  const categoriesWithCount = (categories || []).map((c) => ({
    ...c,
    tool_count: toolCountByCategory[c.id] || 0,
  }));
  results.push({ section: "9. categories", data: categoriesWithCount });

  // 10. tool_last_success VIEW
  console.log("Checking tool_last_success view...");
  const { data: lastSuccess } = await supabase
    .from("tool_last_success")
    .select("tool_id, last_success_at")
    .order("last_success_at", { ascending: false })
    .limit(20);

  // tool名を取得
  const toolIds = (lastSuccess || []).map((ls) => ls.tool_id);
  const { data: toolNames } = await supabase
    .from("tools")
    .select("id, name, tool_type")
    .in("id", toolIds);

  const toolNameMap: Record<string, { name: string; tool_type: string }> = {};
  if (toolNames) {
    for (const t of toolNames) {
      toolNameMap[t.id] = { name: t.name, tool_type: t.tool_type };
    }
  }
  const lastSuccessWithNames = (lastSuccess || []).map((ls) => ({
    ...ls,
    tool_name: toolNameMap[ls.tool_id]?.name || "unknown",
    tool_type: toolNameMap[ls.tool_id]?.tool_type || "unknown",
  }));
  results.push({ section: "10. tool_last_success", data: lastSuccessWithNames });

  // 11. runs.log_url統計（NOT NULL件数）
  console.log("Checking runs with log_url...");
  const { data: runsLogUrl } = await supabase
    .from("runs")
    .select("log_url, tool_id, tools(tool_type)");

  let logUrlNotNullTotal = 0;
  const logUrlByToolType: Record<string, { total: number; withLogUrl: number }> = {};

  if (runsLogUrl) {
    for (const r of runsLogUrl) {
      const tools = r.tools as unknown as { tool_type: string } | { tool_type: string }[] | null;
      const toolType = (Array.isArray(tools) ? tools[0]?.tool_type : tools?.tool_type) || "unknown";

      if (!logUrlByToolType[toolType]) {
        logUrlByToolType[toolType] = { total: 0, withLogUrl: 0 };
      }
      logUrlByToolType[toolType].total++;

      if (r.log_url) {
        logUrlNotNullTotal++;
        logUrlByToolType[toolType].withLogUrl++;
      }
    }
  }

  const logUrlStats = Object.entries(logUrlByToolType).map(([type, stats]) => ({
    tool_type: type,
    total_runs: stats.total,
    with_log_url: stats.withLogUrl,
    ratio: stats.total > 0 ? `${((stats.withLogUrl / stats.total) * 100).toFixed(1)}%` : "0%",
  }));
  results.push({
    section: "11. runs.log_url統計",
    data: {
      total_runs_with_log_url: logUrlNotNullTotal,
      by_tool_type: logUrlStats,
    },
  });

  // 12. runs.machine_id統計（NULL件数）
  console.log("Checking runs with machine_id...");
  const { data: runsMachineId } = await supabase
    .from("runs")
    .select("machine_id, tool_id, tools(tool_type)");

  let machineIdNullTotal = 0;
  const machineIdByToolType: Record<string, { total: number; withMachineId: number }> = {};

  if (runsMachineId) {
    for (const r of runsMachineId) {
      const tools = r.tools as unknown as { tool_type: string } | { tool_type: string }[] | null;
      const toolType = (Array.isArray(tools) ? tools[0]?.tool_type : tools?.tool_type) || "unknown";

      if (!machineIdByToolType[toolType]) {
        machineIdByToolType[toolType] = { total: 0, withMachineId: 0 };
      }
      machineIdByToolType[toolType].total++;

      if (r.machine_id) {
        machineIdByToolType[toolType].withMachineId++;
      } else {
        machineIdNullTotal++;
      }
    }
  }

  const machineIdStats = Object.entries(machineIdByToolType).map(([type, stats]) => ({
    tool_type: type,
    total_runs: stats.total,
    with_machine_id: stats.withMachineId,
    null_machine_id: stats.total - stats.withMachineId,
  }));
  results.push({
    section: "12. runs.machine_id統計",
    data: {
      total_runs_without_machine_id: machineIdNullTotal,
      by_tool_type: machineIdStats,
    },
  });

  // 13. execution_mode整合性チェック
  console.log("Checking execution_mode consistency...");
  // 想定されるexecution_mode
  const expectedModes: Record<string, string[]> = {
    python_runner: ["queue"],
    pad: ["queue"],
    exe: ["queue", "helper"],  // EXEはどちらも許容
    excel: ["helper"],
    bi: ["helper"],
    folder: ["helper"],
    folder_set: ["helper"],
    shortcut: ["helper"],
    bat: ["helper"],
    url: ["open"],
    sheet: ["open"],
  };

  const { data: toolsForModeCheck } = await supabase
    .from("tools")
    .select("id, name, tool_type, execution_mode");

  const modeMismatches: Array<{
    id: string;
    name: string;
    tool_type: string;
    actual_mode: string;
    expected_modes: string;
  }> = [];

  if (toolsForModeCheck) {
    for (const t of toolsForModeCheck) {
      const expected = expectedModes[t.tool_type];
      if (expected && !expected.includes(t.execution_mode)) {
        modeMismatches.push({
          id: t.id,
          name: t.name,
          tool_type: t.tool_type,
          actual_mode: t.execution_mode,
          expected_modes: expected.join(" or "),
        });
      }
    }
  }

  results.push({
    section: "13. execution_mode整合性チェック",
    data: {
      mismatch_count: modeMismatches.length,
      mismatches: modeMismatches,
    },
  });

  // 14. サマリー統計
  console.log("Generating summary statistics...");
  const { count: totalTools } = await supabase.from("tools").select("*", { count: "exact", head: true });
  const { count: activeTools } = await supabase
    .from("tools")
    .select("*", { count: "exact", head: true })
    .eq("is_archived", false);
  const { count: totalRuns } = await supabase.from("runs").select("*", { count: "exact", head: true });
  const { count: successRuns } = await supabase
    .from("runs")
    .select("*", { count: "exact", head: true })
    .eq("status", "success");
  const { count: failedRuns } = await supabase
    .from("runs")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");
  const { count: totalCategories } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });
  const { count: totalMachines } = await supabase.from("machines").select("*", { count: "exact", head: true });

  results.push({
    section: "14. Summary Statistics",
    data: {
      totalTools,
      activeTools,
      archivedTools: (totalTools || 0) - (activeTools || 0),
      totalRuns,
      successRuns,
      failedRuns,
      totalCategories,
      totalMachines,
      runsWithLogUrl: logUrlNotNullTotal,
      runsWithoutMachineId: machineIdNullTotal,
      executionModeMismatches: modeMismatches.length,
    },
  });

  // Markdownに出力
  console.log("\nGenerating markdown report...");
  let md = `# TC Portal Database Health Check\n\n`;
  md += `実行日時: ${now}\n\n`;
  md += `---\n\n`;

  for (const result of results) {
    md += `## ${result.section}\n\n`;
    if (result.error) {
      md += `**Error:** ${result.error}\n\n`;
    } else if (Array.isArray(result.data)) {
      if (result.data.length === 0) {
        md += `_データなし_\n\n`;
      } else {
        // テーブル形式で出力
        const keys = Object.keys(result.data[0]);
        md += `| ${keys.join(" | ")} |\n`;
        md += `| ${keys.map(() => "---").join(" | ")} |\n`;
        for (const row of result.data) {
          const values = keys.map((k) => {
            const v = (row as Record<string, unknown>)[k];
            if (v === null) return "_null_";
            if (typeof v === "object") return JSON.stringify(v);
            return String(v);
          });
          md += `| ${values.join(" | ")} |\n`;
        }
        md += `\n`;
      }
    } else if (typeof result.data === "object" && result.data !== null) {
      // オブジェクトの場合（ネストされた配列を含む可能性がある）
      for (const [key, value] of Object.entries(result.data)) {
        if (Array.isArray(value)) {
          md += `### ${key}\n\n`;
          if (value.length === 0) {
            md += `_データなし_\n\n`;
          } else {
            const keys = Object.keys(value[0]);
            md += `| ${keys.join(" | ")} |\n`;
            md += `| ${keys.map(() => "---").join(" | ")} |\n`;
            for (const row of value) {
              const values = keys.map((k) => {
                const v = (row as Record<string, unknown>)[k];
                if (v === null) return "_null_";
                if (typeof v === "object") return JSON.stringify(v);
                return String(v);
              });
              md += `| ${values.join(" | ")} |\n`;
            }
            md += `\n`;
          }
        } else {
          md += `- **${key}**: ${value}\n`;
        }
      }
      md += `\n`;
    }
  }

  // ファイル保存
  const outputPath = path.join(__dirname, "..", "docs", "db-healthcheck.md");
  fs.writeFileSync(outputPath, md, "utf-8");
  console.log(`\nReport saved to: ${outputPath}`);

  // コンソールにサマリーを出力
  console.log("\n================================");
  console.log("Summary:");
  const summary = results.find((r) => r.section === "14. Summary Statistics");
  if (summary && summary.data) {
    for (const [key, value] of Object.entries(summary.data as Record<string, unknown>)) {
      console.log(`  ${key}: ${value}`);
    }
  }

  // 異常検出
  const anomalies = results.find((r) => r.section === "5. anomalous runs (finished_at NULL)");
  if (anomalies && Array.isArray(anomalies.data) && anomalies.data.length > 0) {
    console.log("\n⚠️  WARNING: Found anomalous runs with finished_at NULL!");
    console.log(`   Count: ${anomalies.data.length}`);
  }

  const pending = results.find((r) => r.section === "6. currently pending runs");
  if (pending && Array.isArray(pending.data) && pending.data.length > 0) {
    console.log(`\n📋 Currently pending runs: ${pending.data.length}`);
  }

  // execution_mode整合性警告
  if (modeMismatches.length > 0) {
    console.log(`\n⚠️  WARNING: Found ${modeMismatches.length} execution_mode mismatches!`);
    for (const m of modeMismatches.slice(0, 5)) {
      console.log(`   - ${m.name}: ${m.tool_type} has ${m.actual_mode}, expected ${m.expected_modes}`);
    }
    if (modeMismatches.length > 5) {
      console.log(`   ... and ${modeMismatches.length - 5} more`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
