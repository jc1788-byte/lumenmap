import type { FlowTableNode, FlowTableEdge } from "@/components/dashboard/FlowDataTable";
import { FIXTURE_ACCOUNTS, FIXTURE_CONTRACTS } from "./raw-data";

/**
 * Flow graph fixture with known unequal activity for visual encoding verification.
 * 
 * This fixture creates nodes with deliberately different activity levels to test
 * that the node sizing function correctly maps activity to radius within the
 * clamped range (MIN_RADIUS=8, MAX_RADIUS=32).
 * 
 * Activity levels:
 * - Very high: 300,000 operations (should map to MAX_RADIUS)
 * - High: 150,000 operations
 * - Medium: 75,000 operations
 * - Low: 30,000 operations
 * - Very low: 10,000 operations (should map to MIN_RADIUS)
 */

export function getFlowFixtureNodes(): FlowTableNode[] {
  return [
    {
      id: FIXTURE_ACCOUNTS.kraken,
      label: "Kraken",
      category: "payments",
    },
    {
      id: FIXTURE_ACCOUNTS.lobstr,
      label: "LOBSTR",
      category: "payments",
    },
    {
      id: FIXTURE_ACCOUNTS.moneygram,
      label: "MoneyGram",
      category: "payments",
    },
    {
      id: FIXTURE_CONTRACTS.soroswap,
      label: "Soroswap",
      category: "dex",
    },
    {
      id: FIXTURE_CONTRACTS.soroswapPool,
      label: "Soroswap Pool",
      category: "dex",
    },
    {
      id: FIXTURE_CONTRACTS.soroswapRouter,
      label: "Soroswap Router",
      category: "dex",
    },
    {
      id: FIXTURE_ACCOUNTS.unknownA,
      label: "Unknown A",
      category: "account",
    },
    {
      id: FIXTURE_ACCOUNTS.unknownB,
      label: "Unknown B",
      category: "account",
    },
    {
      id: FIXTURE_ACCOUNTS.unknownC,
      label: "Unknown C",
      category: "account",
    },
  ];
}

export function getFlowFixtureEdges(): FlowTableEdge[] {
  const nodes = getFlowFixtureNodes();
  const kraken = nodes[0];
  const lobstr = nodes[1];
  const moneygram = nodes[2];
  const soroswap = nodes[3];
  const soroswapPool = nodes[4];
  const soroswapRouter = nodes[5];
  const unknownA = nodes[6];
  const unknownB = nodes[7];
  const unknownC = nodes[8];

  return [
    // High-volume payment edges
    {
      id: "edge-1",
      source: kraken.id,
      destination: lobstr.id,
      assetKey: "native:XLM",
      amount: "50000000000", // 5,000 XLM in stroops
      operationCount: 150_000,
    },
    {
      id: "edge-2",
      source: kraken.id,
      destination: moneygram.id,
      assetKey: "native:XLM",
      amount: "30000000000", // 3,000 XLM in stroops
      operationCount: 90_000,
    },
    // DEX edges
    {
      id: "edge-3",
      source: soroswap.id,
      destination: soroswapPool.id,
      assetKey: "native:XLM",
      amount: "20000000000", // 2,000 XLM in stroops
      operationCount: 80_000,
    },
    {
      id: "edge-4",
      source: soroswapPool.id,
      destination: soroswapRouter.id,
      assetKey: "native:XLM",
      amount: "15000000000", // 1,500 XLM in stroops
      operationCount: 60_000,
    },
    // Medium-volume edges
    {
      id: "edge-5",
      source: lobstr.id,
      destination: unknownA.id,
      assetKey: "native:XLM",
      amount: "10000000000", // 1,000 XLM in stroops
      operationCount: 40_000,
    },
    {
      id: "edge-6",
      source: moneygram.id,
      destination: unknownB.id,
      assetKey: "native:XLM",
      amount: "8000000000", // 800 XLM in stroops
      operationCount: 30_000,
    },
    // Low-volume edges
    {
      id: "edge-7",
      source: unknownA.id,
      destination: unknownC.id,
      assetKey: "native:XLM",
      amount: "5000000000", // 500 XLM in stroops
      operationCount: 20_000,
    },
    {
      id: "edge-8",
      source: unknownB.id,
      destination: unknownC.id,
      assetKey: "native:XLM",
      amount: "3000000000", // 300 XLM in stroops
      operationCount: 10_000,
    },
  ];
}

/**
 * Expected node activities (inflow + outflow operations) for verification:
 * - Kraken: 240,000 (150k + 90k) - should be largest
 * - LOBSTR: 190,000 (150k + 40k) - should be second largest
 * - MoneyGram: 120,000 (90k + 30k) - should be third
 * - Soroswap: 80,000 (80k) - medium
 * - Soroswap Pool: 140,000 (80k + 60k) - medium-high
 * - Soroswap Router: 60,000 (60k) - medium-low
 * - Unknown A: 60,000 (40k + 20k) - medium-low
 * - Unknown B: 40,000 (30k + 10k) - low
 * - Unknown C: 30,000 (20k + 10k) - lowest
 */
