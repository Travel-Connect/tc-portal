import { Monitor } from "lucide-react";
import { getAllTaskMonitorsAdmin } from "@/lib/actions/task-monitor";
import { MonitorList } from "./MonitorList";

export default async function MonitorsAdminPage() {
  const monitors = await getAllTaskMonitorsAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Monitor className="w-6 h-6" />
        <h1 className="text-2xl font-bold">監視管理（BAT/Python）</h1>
      </div>

      <MonitorList initialMonitors={monitors} />
    </div>
  );
}
