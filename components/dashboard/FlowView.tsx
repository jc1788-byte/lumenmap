"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FlowDataTable,
  FlowViewToggle,
  type FlowView as FlowDisplay,
  type FlowTableEdge,
  type FlowTableNode,
} from "./FlowDataTable";
import { FlowExportButton } from "./FlowExportButton";
import { FLOW_FIXTURE } from "@/lib/fixtures/flow";
import type { Period } from "@/lib/types";

export interface FlowViewProps {
  fixture?: boolean;
  nodes?: readonly FlowTableNode[];
  edges?: readonly FlowTableEdge[];
  period?: Period;
}

export function FlowView({
  fixture = true,
  nodes: propNodes,
  edges: propEdges,
  period,
}: FlowViewProps) {
  const [display, setDisplay] = useState<FlowDisplay>("table");
  const nodes = propNodes ?? (fixture ? FLOW_FIXTURE.nodes : []);
  const edges = propEdges ?? (fixture ? FLOW_FIXTURE.edges : []);

  return (
    <Card data-testid="flow-view" className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Payment Flow</CardTitle>
          <p className="mt-1 text-xs text-zinc-400">
            {fixture
              ? "Directed account connections · illustrative fixture sample (same for each period)"
              : "Directed account connections"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fixture && <FlowViewToggle view={display} onChange={setDisplay} />}
          <FlowExportButton edges={edges} period={period} />
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        {!fixture && edges.length === 0 ? (
          <p role="status" className="py-16 text-center text-sm text-zinc-400">
            Flow graph data is available in fixture mode only.
          </p>
        ) : (
          <FlowDataTable
            nodes={nodes}
            edges={edges}
            showNodes
            period={period}
            hideExport
          />
        )}
      </CardContent>
    </Card>
  );
}
