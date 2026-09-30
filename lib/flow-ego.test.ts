import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEgoGraph } from "@/lib/flow-ego";
import type {
  FlowTableEdge,
  FlowTableNode,
} from "@/components/dashboard/FlowDataTable";

const NODES: FlowTableNode[] = [
  { id: "GA", label: "Alice", category: "wallet" },
  { id: "GB", label: "Bob", category: "exchange" },
  { id: "GC", label: "Carol" },
];

function edge(
  id: string,
  source: string,
  destination: string,
  amount: string,
  operationCount: number
): FlowTableEdge {
  return { id, source, destination, assetKey: "XLM", amount, operationCount };
}

describe("buildEgoGraph", () => {
  it("aggregates counterparties touching the center account", () => {
    const graph = buildEgoGraph("GA", "Alice", NODES, [
      edge("e1", "GA", "GB", "100", 2),
      edge("e2", "GB", "GA", "40", 1),
      edge("e3", "GB", "GC", "999", 9),
    ]);

    assert.equal(graph.centerId, "GA");
    assert.deepEqual(
      graph.counterparties.map((c) => c.id),
      ["GB"]
    );
    assert.equal(graph.counterparties[0]?.outflow, BigInt(100));
    assert.equal(graph.counterparties[0]?.inflow, BigInt(40));
    assert.equal(graph.counterparties[0]?.operationCount, 3);
    assert.equal(graph.counterparties[0]?.label, "Bob");
  });

  it("ignores self-edges and orders by operation count", () => {
    const graph = buildEgoGraph("GA", "Alice", NODES, [
      edge("e1", "GA", "GA", "50", 5),
      edge("e2", "GA", "GB", "10", 1),
      edge("e3", "GA", "GC", "10", 4),
    ]);

    assert.deepEqual(
      graph.counterparties.map((c) => c.id),
      ["GC", "GB"]
    );
  });

  it("treats malformed amounts as zero instead of throwing", () => {
    const graph = buildEgoGraph("GA", "Alice", NODES, [
      edge("e1", "GA", "GB", "not-a-number", 1),
    ]);

    assert.equal(graph.counterparties.length, 1);
    assert.equal(graph.counterparties[0]?.outflow, BigInt(0));
    assert.equal(graph.counterparties[0]?.operationCount, 1);
  });

  it("returns an empty counterparty list when nothing touches the center", () => {
    const graph = buildEgoGraph("GA", "Alice", NODES, [
      edge("e1", "GB", "GC", "10", 1),
    ]);

    assert.deepEqual(graph.counterparties, []);
  });
});
