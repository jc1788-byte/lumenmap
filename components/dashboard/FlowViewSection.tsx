"use client";

import {
  FlowDataTable,
  type FlowTableEdge,
  type FlowTableNode,
} from "@/components/dashboard/FlowDataTable";

export interface FlowViewSectionProps {
  nodes?: readonly FlowTableNode[];
  edges?: readonly FlowTableEdge[];
}

/**
 * Bridges the chart card to the Flow MVP component export.
 *
 * The Flow canvas and its dataset are built separately; this section only
 * wires the switcher to the exported `FlowDataTable` so the view is reachable
 * (and accessible) as soon as edge data is supplied. Until then it renders a
 * status message instead of an empty table.
 */
export function FlowViewSection({
  nodes = [],
  edges = [],
}: FlowViewSectionProps) {
  if (edges.length === 0) {
    return (
      <div
        role="status"
        className="flex h-[420px] flex-col items-center justify-center gap-1 rounded-xl border border-white/5 bg-black/20 p-6 text-center text-sm sm:h-[520px] lg:h-[600px]"
      >
        <p className="font-medium text-zinc-300">Wallet flow view</p>
        <p className="max-w-sm text-xs text-zinc-500">
          The Flow canvas is wired here. It renders the accessible flow table as
          soon as edge data is available; no edges to display yet.
        </p>
      </div>
    );
  }

  return (
    <FlowDataTable
      nodes={nodes}
      edges={edges}
      showNodes
      caption="Wallet flow edges"
    />
  );
}
