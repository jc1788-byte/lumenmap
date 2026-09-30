"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { FlowCanvas } from "@/components/dashboard/FlowCanvas";
import {
  FlowDataTable,
  FlowViewToggle,
  type FlowView as FlowViewMode,
} from "@/components/dashboard/FlowDataTable";
import { getFixtureFlowGraph } from "@/lib/flow/flow-fixture";
import {
  FLOW_METHODOLOGY_ANCHORS,
  flowMethodologyHref,
} from "@/lib/metrics/flow-methodology-anchors";
import { formatExactNumber, formatNumber, useReducedMotion } from "@/lib/utils";

export interface FlowViewProps {
  initialViewMode?: FlowViewMode;
  className?: string;
}

export function FlowView({ initialViewMode = "graph", className }: FlowViewProps) {
  const { period, selectedNode, setSelectedNode } = useDashboard();
  const [viewMode, setViewMode] = useState<FlowViewMode>(initialViewMode);
  const prefersReducedMotion = useReducedMotion();

  // Load fixture graph for current period
  const flowResponse = useMemo(() => {
    return getFixtureFlowGraph(period);
  }, [period]);

  const { nodes, edges, coverage } = flowResponse.graph;

  const activeSelectedId = useMemo(() => {
    if (!selectedNode) return null;
    return (selectedNode.meta?.id as string) ?? null;
  }, [selectedNode]);

  const handleSelectNode = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelectedNode(null);
        return;
      }

      // Check if it matches an edge id
      const matchedEdge = edges.find((e) => e.id === id);
      if (matchedEdge) {
        setSelectedNode({
          name: `${matchedEdge.source.slice(0, 4)}… → ${matchedEdge.destination.slice(0, 4)}…`,
          value: matchedEdge.operationCount,
          share: 0,
          meta: {
            id: matchedEdge.id,
            type: "account",
            opCount: matchedEdge.operationCount,
            nodeId: matchedEdge.source,
          },
        });
        return;
      }

      const matchedNode = nodes.find((n) => n.id === id);
      if (matchedNode) {
        const totalOps =
          matchedNode.metrics.inOperationCount +
          matchedNode.metrics.outOperationCount;

        setSelectedNode({
          name: matchedNode.label,
          value: totalOps,
          share: 0,
          meta: {
            id: matchedNode.id,
            type: "account",
            category: matchedNode.category,
            opCount: totalOps,
            nodeId: matchedNode.id,
          },
        });
      } else {
        setSelectedNode(null);
      }
    },
    [nodes, edges, setSelectedNode],
  );

  return (
    <div
      data-testid="flow-view"
      className={`rounded-xl border border-white/5 bg-surface p-4 sm:p-6 ${className ?? ""}`}
    >
      {/* Header bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              Payment Flow
            </h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
              {formatExactNumber(nodes.length)} accounts · {formatExactNumber(edges.length)} flows
            </span>
            {prefersReducedMotion && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                Reduced motion active
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">
            Directed value movement across top payment and funding counterparties.
            {" · "}
            <Link
              href={flowMethodologyHref(FLOW_METHODOLOGY_ANCHORS.flow)}
              className="inline-flex items-center gap-0.5 text-stellar-light hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stellar"
            >
              Methodology & limitations
              <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </div>

        {/* View toggle (Graph / Table) */}
        <div className="flex items-center gap-2">
          <FlowViewToggle view={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Main content body */}
      {viewMode === "graph" ? (
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          selectedId={activeSelectedId}
          onSelect={handleSelectNode}
          showParallelList={true}
        />
      ) : (
        <FlowDataTable
          nodes={nodes}
          edges={edges}
          selectedId={activeSelectedId}
          onSelect={handleSelectNode}
          showNodes={true}
          caption="Payment-flow graph edges"
        />
      )}

      {/* Coverage summary footer */}
      {coverage && (
        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-white/5 pt-3 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            
            <span>
              Sampled top {coverage.edgeCount} of {coverage.totalEdgeCount} flow edges (
              {formatNumber(coverage.operationCount)} operations represented).
            </span>
          </div>
          <Link
            href={flowMethodologyHref(FLOW_METHODOLOGY_ANCHORS.sampling)}
            className="text-xs text-zinc-400 underline hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stellar"
          >
            About flow sampling
          </Link>
        </div>
      )}
    </div>
  );
}
