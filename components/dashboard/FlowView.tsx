"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FlowDataTable, FlowViewToggle, type FlowView as FlowDisplay } from "./FlowDataTable";
import { useDashboard } from "./DashboardProvider";
import type { FlowResponse } from "@/lib/flow/data";
import type { FlowNode } from "@/lib/flow/graph";
import { truncateAddress } from "@/lib/utils";

async function fetchFlow(period: string, network: string, account: string | null): Promise<FlowResponse> {
  const params = new URLSearchParams({ period, network });
  if (account) params.set("account", account);
  const response = await fetch(`/api/v1/flow?${params}`);
  if (!response.ok) {
    const body = await response.json() as { message?: string };
    throw new Error(body.message ?? "Failed to load flow data.");
  }
  return response.json() as Promise<FlowResponse>;
}

function FlowGraph({
  nodes,
  edges,
  account,
  selectedId,
  onSelect,
  onFocus,
}: {
  nodes: FlowResponse["nodes"];
  edges: FlowResponse["edges"];
  account: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const center = { x: 320, y: 210 };
  const others = account ? nodes.filter((node) => node.id !== account) : nodes;
  const positions = new Map<string, { x: number; y: number }>();
  if (account) positions.set(account, center);
  others.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / Math.max(others.length, 1) - Math.PI / 2;
    positions.set(node.id, {
      x: center.x + 245 * Math.cos(angle),
      y: center.y + 155 * Math.sin(angle),
    });
  });

  return (
    <svg
      viewBox="0 0 640 420"
      className="h-auto w-full rounded-xl border border-white/10 bg-black/20"
      role="group"
      aria-label={account ? `One-hop flow graph for ${account}` : "Period flow overview graph"}
    >
      <defs>
        <marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#818cf8" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const from = positions.get(edge.source);
        const to = positions.get(edge.destination);
        if (!from || !to) return null;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        if (length === 0) return null;
        const fromRadius = edge.source === account ? 31 : 25;
        const toRadius = edge.destination === account ? 33 : 27;
        return (
          <line
            key={edge.id}
            x1={from.x + (dx / length) * fromRadius}
            y1={from.y + (dy / length) * fromRadius}
            x2={to.x - (dx / length) * toRadius}
            y2={to.y - (dy / length) * toRadius}
            stroke="#818cf8" strokeWidth="2" opacity="0.65" markerEnd="url(#flow-arrow)"
          >
            <title>{`${edge.source} → ${edge.destination}: ${edge.operationCount} operations`}</title>
          </line>
        );
      })}
      {nodes.map((node) => {
        const point = positions.get(node.id);
        if (!point) return null;
        return (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            aria-label={`Select ${node.label}`}
            aria-pressed={selectedId === node.id}
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => onFocus(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.id);
              }
            }}
            className="cursor-pointer focus:outline-none"
          >
            <title>{node.id}</title>
            <circle
              cx={point.x} cy={point.y} r={account === node.id ? 27 : 21}
              fill={account === node.id ? "#6366f1" : "#27272a"}
              stroke={selectedId === node.id ? "#fff" : "#a5b4fc"}
              strokeWidth="2"
            />
            <text x={point.x} y={point.y + 37} textAnchor="middle" fill="#e4e4e7" fontSize="11">
              {node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function FlowView({
  account,
  onAccountChange,
}: {
  account: string | null;
  onAccountChange: (account: string | null) => void;
}) {
  const { period, network } = useDashboard();
  const [display, setDisplay] = useState<FlowDisplay>("graph");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["flow", period, network, account],
    queryFn: () => fetchFlow(period, network, account),
    staleTime: 60_000,
  });
  const selectedNode: FlowNode | undefined = query.data?.nodes.find((node) => node.id === selectedId);

  return (
    <section data-testid="flow-view" className="space-y-4" aria-label="Payment flow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Payment flow</h2>
          <p className="text-sm text-zinc-400">
            {account ? `1-hop counterparties of ${truncateAddress(account)}` : "Period overview"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {account && (
            <button type="button" onClick={() => onAccountChange(null)} className="rounded-lg border border-white/20 px-3 py-1 text-sm text-white hover:bg-white/10">
              Back to period overview
            </button>
          )}
          <FlowViewToggle view={display} onChange={setDisplay} />
        </div>
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm text-zinc-400">Loading flow graph…</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-red-300">{query.error.message}</p>
      ) : query.data.edges.length === 0 ? (
        <p role="status" className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-zinc-300">
          {account ? "This account has no counterparties in the selected period." : "No payment flows in the selected period."}
        </p>
      ) : (
        <>
          {query.data.sampled && <p className="text-xs text-amber-200">Showing the top 100 edges for this view.</p>}
          {display === "graph" ? (
            <FlowGraph
              nodes={query.data.nodes}
              edges={query.data.edges}
              account={account}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onFocus={onAccountChange}
            />
          ) : (
            <FlowDataTable
              nodes={query.data.nodes}
              edges={query.data.edges}
              showNodes
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
          {selectedNode && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
              <p className="font-medium text-white">{selectedNode.label}</p>
              <p className="break-all font-mono text-xs">{selectedNode.id}</p>
              <button type="button" onClick={() => onAccountChange(selectedNode.id)} className="mt-2 text-stellar-light underline">
                View 1-hop flow
              </button>
            </div>
          )}
          <p className="text-xs text-zinc-500">Double-click an account node to focus on its direct counterparties.</p>
        </>
      )}
    </section>
  );
}
