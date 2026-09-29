import { getDisplayName, lookupEntity } from "@/lib/entities/registry";

export interface FlowEdge {
  id: string;
  source: string;
  destination: string;
  assetKey: string;
  asset: { code: string };
  amount: string;
  /** False when any operation in this edge has no reliable amount. */
  amountComplete?: boolean;
  operationCount: number;
}

export interface FlowNode {
  id: string;
  label: string;
  category?: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** Build nodes only from returned edges. An empty ego graph still identifies its account. */
export function buildFlowGraph(edges: FlowEdge[], account?: string): FlowGraph {
  const visibleEdges = account
    ? edges.filter((edge) => edge.source === account || edge.destination === account)
    : edges;
  const ids = new Set<string>(account ? [account] : []);
  for (const edge of visibleEdges) {
    ids.add(edge.source);
    ids.add(edge.destination);
  }
  return {
    nodes: [...ids].map((id) => ({
      id,
      label: getDisplayName(id),
      category: lookupEntity(id)?.category,
    })),
    edges: visibleEdges,
  };
}
