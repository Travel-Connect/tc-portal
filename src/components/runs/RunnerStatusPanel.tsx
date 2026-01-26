"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Power, Square, Loader2 } from "lucide-react";
import { stopRunner } from "@/lib/actions/machines";
import type { Machine } from "@/types/database";

type MachineInfo = Pick<Machine, "id" | "name" | "hostname" | "last_seen_at">;

interface RunnerStatusPanelProps {
  machines: MachineInfo[];
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const threshold = new Date();
  threshold.setMinutes(threshold.getMinutes() - 2);
  return new Date(lastSeenAt) >= threshold;
}

export function RunnerStatusPanel({ machines }: RunnerStatusPanelProps) {
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStop = async (machineId: string) => {
    setStoppingId(machineId);
    setError(null);
    try {
      const result = await stopRunner(machineId);
      if (!result.success) {
        setError(result.error || "停止に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setStoppingId(null);
    }
  };

  if (machines.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Power className="w-4 h-4" />
          Runnerステータス
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {machines.map((machine) => {
            const online = isOnline(machine.last_seen_at);
            return (
              <div
                key={machine.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      online ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span className="font-medium text-sm">{machine.name}</span>
                  {machine.hostname && (
                    <span className="text-xs text-muted-foreground">
                      ({machine.hostname})
                    </span>
                  )}
                  <Badge variant={online ? "default" : "secondary"} className="text-xs">
                    {online ? "オンライン" : "オフライン"}
                  </Badge>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!online || stoppingId === machine.id}
                  onClick={() => handleStop(machine.id)}
                >
                  {stoppingId === machine.id ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Square className="w-3.5 h-3.5 mr-1" />
                  )}
                  停止
                </Button>
              </div>
            );
          })}
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
