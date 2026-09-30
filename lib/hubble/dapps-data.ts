import { getActivityData } from "@/lib/hubble/activity";
import { getFixtureActivityData } from "@/lib/fixtures/activity";
import { resolveDashboardNetwork, type DashboardNetworkId } from "@/lib/network";
import type { ActivityDataset, Period } from "@/lib/types";
import type { DappLeaderboardEntry, DappsResponse } from "@/lib/schemas/dapps-response";

/**
 * Transforms an ActivityDataset into a public DappsLeaderboardResponse.
 * Derived from the existing buildProtocolSummary builder.
 */
export function toDappsLeaderboardResponse(
  data: ActivityDataset,
): DappsResponse {
  const bars = data.protocols?.bars ?? [];
  const rankings: DappLeaderboardEntry[] = bars.map((bar) => ({
    rank: bar.rank,
    protocol: bar.protocol,
    op_count: bar.opCount,
    share: bar.share,
    opCount: bar.opCount,
    entity_count: bar.entityCount,
  }));

  const totalOps = data.protocols?.totalOps ?? 0;

  return {
    period: data.period,
    start: data.start,
    end: data.end,
    source: data.source,
    sourceTimestamp: data.sourceTimestamp,
    isPeriodComplete: data.isPeriodComplete,
    total_ops: totalOps,
    totalOps,
    rankings,
    protocols: rankings,
    coverage: data.protocols?.coverage,
    ...(data.source === "fixture" ? { fixture: true } : {}),
  };
}

/**
 * Fetches protocol leaderboard data for live mode or cached activity.
 */
export async function getDappsData(
  period: Period = "1d",
  correlationId?: string,
  network: DashboardNetworkId = resolveDashboardNetwork(),
): Promise<DappsResponse> {
  const activityData = await getActivityData(period, correlationId, network);
  return toDappsLeaderboardResponse(activityData);
}

/**
 * Returns deterministic fixture leaderboard data without BigQuery calls.
 */
export function getFixtureDappsResponse(
  period: Period,
  network: DashboardNetworkId = resolveDashboardNetwork(),
): DappsResponse {
  const data = getFixtureActivityData(period, network);
  return {
    ...toDappsLeaderboardResponse(data),
    source: "fixture",
    fixture: true,
  };
}
