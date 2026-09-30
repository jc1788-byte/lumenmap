import type {
  FlowEdge,
  FlowEdgeMetrics,
  FlowEdgeRow,
  FlowGraphResponse,
  FlowNode,
  FlowNodeKind,
  FlowNodeMetrics,
} from "./types";

export interface BuildGraphOptions {
  /** Optional label overrides keyed by node id. */
  labels?: Record<string, string>;
  /** Optional kind overrides keyed by node id. */
  kinds?: Record<string, FlowNodeKind>;
}

function deriveKind(id: string): FlowNodeKind {
  if (id.startsWith("G")) return "account";
  if (id.startsWith("C")) return "contract";
  if (id.includes(":")) return "asset";
  return "protocol";
}

function deriveLabel(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-6)}`;
}

function ensureNode(
  nodes: Map<string, FlowNode>,
  id: string,
  options: BuildGraphOptions,
): FlowNode {
  const existing = nodes.get(id);
  if (existing) return existing;
  const node: FlowNode = {
    id: id,
    label: options.labels?.[id] ?? deriveLabel(id),
    kind: options.kinds?.[id] ?? deriveKind(id),
    metrics: { opCount: 0 },
  };
  nodes.set(id, node);
  return node;
}

function addNodeMetrics(target: FlowNodeMetrics, delta: FlowEdgeMetrics): void {
  target.opCount += delta.opCount;
  if (delta.txnCount !== undefined) {
    target.txnCount = (target.txnCount ?? 0) + delta.txnCount;
  }
  if (delta.xlmVolume !== undefined) {
    target.xlmVolume = (target.xlmVolume ?? 0) + delta.xlmVolume;
  }
  if (delta.usdcVolume !== undefined) {
    target.usdcVolume = (target.usdcVolume ?? 0) + delta.usdcVolume;
  }
}

function mergeEdgeMetrics(
  target: FlowEdgeMetrics,
  delta: FlowEdgeMetrics,
): void {
  target.opCount += delta.opCount;
  if (delta.txnCount !== undefined) {
    target.txnCount = (target.txnCount ?? 0) + delta.txnCount;
  }
  if (delta.xlmVolume !== undefined) {
    target.xlmVolume = (target.xlmVolume ?? 0) + delta.xlmVolume;
  }
  if (delta.usdcVolume !== undefined) {
    target.usdcVolume = (target.usdcVolume ?? 0) + delta.usdcVolume;
  }
}

function mergeAssetKeys(
  target: Set<string>,
  keys: string[] | undefined,
): void {
  if (!keys) return;
  for (const key of keys) target.add(key);
}

/**
 * Turn raw edge rows into a typed graph.
 *
 * - Nodes are deduped by id; the first occurrence wins for label/kind.
 * - Parallel edges between the same ordered (source, target) pair are aggregated
 *   by summing opCount/txnCount/xlmVolume/usdcVolume and unioning asset keys.
 * - Node metrics are derived from the aggregated edges (inbound + outbound).
 */
export function buildFlowGraph(
  rows: FlowEdgeRow[],
  options: BuildGraphOptions = {},
): FlowGraphResponse {
  const nodes = new Map<string, FlowNode>();
  const edges = new Map<string, FlowEdge>();
  const edgeAssetKeys = new Map<string, Set<string>>();
  const nodeAssetKeys = new Map<string, Set<string>>();

  for (const row of rows) {
    const source = ensureNode(nodes, row.source_id, options);
    const target = ensureNode(nodes, row.target_id, options);

    const delta: FlowEdgeMetrics = { opCount: row.op_count };
    if (row.txn_count !== undefined) delta.txnCount = row.txn_count;
    if (row.xlm_volume !== undefined) delta.xlmVolume = row.xlm_volume;
    if (row.usdc_volume !== undefined) delta.usdcVolume = row.usdc_volume;

    const edgeId = `${row.source_id}->${row.target_id}`;
    const existing = edges.get(edgeId);
    if (existing) {
      mergeEdgeMetrics(existing.metrics, delta);
    } else {
      edges.set(edgeId, {
        id: edgeId,
        source: row.source_id,
        target: row.target_id,
        metrics: delta,
      });
    }

    if (row.asset_keys) {
      let edgeSet = edgeAssetKeys.get(edgeId);
      if (!edgeSet) {
        edgeSet = new Set<string>();
        edgeAssetKeys.set(edgeId, edgeSet);
      }
      mergeAssetKeys(edgeSet, row.asset_keys);
    }

    addNodeMetrics(source.metrics, delta);
    addNodeMetrics(target.metrics, delta);

    for (const nodeId of [row.source_id, row.target_id]) {
      if (!row.asset_keys) continue;
      let nodeSet = nodeAssetKeys.get(nodeId);
      if (!nodeSet) {
        nodeSet = new Set<string>();
        nodeAssetKeys.set(nodeId, nodeSet);
      }
      mergeAssetKeys(nodeSet, row.asset_keys);
    }
  }

  for (const [edgeId, set] of edgeAssetKeys) {
    const edge = edges.get(edgeId);
    if (edge && set.size > 0) edge.assetKeys = Array.from(set).sort();
  }

  for (const [nodeId, set] of nodeAssetKeys) {
    const node = nodes.get(nodeId);
    if (node && set.size > 0) node.assetKeys = Array.from(set).sort();
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}
