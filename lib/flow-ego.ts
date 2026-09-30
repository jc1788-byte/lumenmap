/**
 * flow-ego.ts — ego-graph model for the Flow view (issue #311).
 *
 * A Flow ego graph centers one account/contract and lists its direct
 * counterparties aggregated from payment edges. Pure functions (no DOM, no
 * network) so the computation is unit-testable and reusable by both the
 * ego view component and future API routes.
 */
import type {
  FlowTableEdge,
  FlowTableNode,
} from "@/components/dashboard/FlowDataTable";

export interface EgoCounterparty {
  id: string;
  label: string;
  category?: string;
  /** Total received from the center account, in minor units (stroops). */
  outflow: bigint;
  /** Total sent to the center account, in minor units (stroops). */
  inflow: bigint;
  operationCount: number;
}

export interface EgoGraph {
  centerId: string;
  centerLabel: string;
  counterparties: EgoCounterparty[];
}

function toBigInt(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function nodeLabel(nodes: readonly FlowTableNode[], id: string): string {
  return nodes.find((node) => node.id === id)?.label ?? id;
}

/**
 * Build the ego graph for `centerId` from payment edges.
 *
 * Only edges touching the center account are considered; self-edges are
 * ignored. Counterparties sort by total operation count (descending), then
 * by id for determinism. Malformed amounts count as zero rather than
 * throwing, so one bad edge can never blank the whole view.
 */
export function buildEgoGraph(
  centerId: string,
  centerLabel: string,
  nodes: readonly FlowTableNode[],
  edges: readonly FlowTableEdge[]
): EgoGraph {
  const byId = new Map<string, EgoCounterparty>();

  for (const edge of edges) {
    if (edge.source === edge.destination) continue;
    const counterpartyId =
      edge.source === centerId
        ? edge.destination
        : edge.destination === centerId
          ? edge.source
          : null;
    if (counterpartyId === null) continue;

    const existing = byId.get(counterpartyId) ?? {
      id: counterpartyId,
      label: nodeLabel(nodes, counterpartyId),
      category: nodes.find((node) => node.id === counterpartyId)?.category,
      outflow: BigInt(0),
      inflow: BigInt(0),
      operationCount: 0,
    };
    const amount = toBigInt(edge.amount);
    if (edge.source === centerId) {
      existing.outflow += amount;
    } else {
      existing.inflow += amount;
    }
    existing.operationCount += edge.operationCount;
    byId.set(counterpartyId, existing);
  }

  const counterparties = [...byId.values()].sort(
    (a, b) => b.operationCount - a.operationCount || (a.id < b.id ? -1 : 1)
  );

  return { centerId, centerLabel, counterparties };
}

export interface FixtureAccount {
  id: string;
  name: string;
  category?: string;
  protocol?: string;
}
