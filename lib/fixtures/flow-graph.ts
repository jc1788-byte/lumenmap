/**
 * Illustrative flow-graph fixture for opt-in local/e2e mode
 * (LUMENMA_DATA_SOURCE=fixture). Values do not reflect real network state
 * and must never be selected silently in production.
 */

import { buildFlowGraph } from "@/lib/flow/build-graph";
import type {
  FlowEdgeRow,
  FlowGraphResponse,
} from "@/lib/flow/types";

export const FIXTURE_FLOW_EDGE_ROWS: FlowEdgeRow[] = [
  {
    source_id: "GA5ZSEJYB37JRC5AVCIA5MOP4RGHTM335XKKX3IHOJAPP5RE34K4KZVN",
    target_id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2",
    op_count: 42000,
    txn_count: 31000,
    xlm_volume: 12000,
    asset_keys: ["xlm:native"],
  },
  {
    source_id: "GA5ZSEJYB37JRC5AVCIA5MOP4RGHTM335XKKX3IHOJAPP5RE34K4ZVN",
    target_id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2",
    op_count: 18000,
    txn_count: 12000,
    usdc_volume: 80000,
    asset_keys: [
      "usdc:GA5ZSEJYB37JRC5AVCIA5MOP4RGHTM335XKKX3IHOJAPR5RE34K4KZVN",
    ],
  },
  {
    source_id: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNKNLXLTCV",
    target_id: "CA2TZIB56KYKD46F7IFBF6XPO5TDNK6N2U6BRTGZ5AF4WUSBN6BKZMGF",
    op_count: 22000,
    txn_count: 15000,
    xlm_volume: 4500,
    asset_keys: ["xlm:native"],
  },
  {
    source_id: "GA5ZSEJYB37JRC5AVCIA5MOP4RGHTM335XKKX3IHOJAPP5RE34K4KZVN",
    target_id: "CA2TZIB56KYKD46F7IFBF6XPO5TDNK6N2U6BRTGZ5AF4WUSBN6BKZMGF",
    op_count: 9500,
    txn_count: 7200,
    usdc_volume: 9200,
    asset_keys: [
      "usdc:GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNKNLXLTCV",
    ],
  },
];

export function buildFixtureFlowGraph(): FlowGraphResponse {
  return buildFlowGraph(FIXTURE_FLOW_EDGE_ROWS);
}
