"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  exportFlowEdgesToCsv,
  type FlowExportEdge,
} from "@/lib/export-utils";
import type { Period } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface FlowExportButtonProps {
  edges: readonly FlowExportEdge[];
  period?: Period | string;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

export function FlowExportButton({
  edges,
  period: propPeriod,
  disabled = false,
  className,
  size = "sm",
  variant = "outline",
}: FlowExportButtonProps) {
  let dashboardPeriod: Period | undefined;
  try {
    const dashboard = useDashboard();
    dashboardPeriod = dashboard?.period;
  } catch {
    dashboardPeriod = undefined;
  }

  const activePeriod = (propPeriod ?? dashboardPeriod ?? "24h") as Period;
  const isEmpty = !edges || edges.length === 0;
  const isDisabled = disabled || isEmpty;

  const handleExport = () => {
    if (isEmpty) return;
    try {
      exportFlowEdgesToCsv(edges, activePeriod);
    } catch (error) {
      console.error("Flow CSV export failed:", error);
      alert("Failed to export Flow edges CSV. Please try again.");
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={isDisabled}
      onClick={handleExport}
      className={cn("gap-1.5 text-xs", className)}
      title={
        isEmpty
          ? "No flow edges to export"
          : "Export current Flow graph edges as CSV"
      }
      aria-label="Export Flow edges as CSV"
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      Export CSV
    </Button>
  );
}
