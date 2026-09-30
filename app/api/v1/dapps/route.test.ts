import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  handleDappsRequest,
  parseDappsPeriod,
} from "./_handler";
import { BigQueryLimitExceededError } from "@/lib/hubble/errors";
import { buildProtocolSummary } from "@/lib/entities/build-treemap";
import { toDappsLeaderboardResponse } from "@/lib/hubble/dapps-data";
import type { ActivityDataset, Period } from "@/lib/types";
import type { DappsResponse } from "@/lib/schemas/dapps-response";

const supportedPeriods: Period[] = ["1d", "7d", "30d", "month"];

function mockDappsResponse(
  period: Period,
  overrides?: Partial<DappsResponse>,
): DappsResponse {
  return {
    period,
    start: "2026-08-03T00:00:00.000Z",
    end: "2026-08-03T23:59:59.999Z",
    source: "hubble",
    sourceTimestamp: "2026-08-03T12:00:00.000Z",
    isPeriodComplete: false,
    total_ops: 1000,
    rankings: [
      {
        rank: 1,
        protocol: "Soroswap",
        op_count: 600,
        share: 60,
      },
      {
        rank: 2,
        protocol: "Circle",
        op_count: 400,
        share: 40,
      },
    ],
    ...overrides,
  };
}

describe("parseDappsPeriod", () => {
  test("defaults to 1d when absent", () => {
    assert.deepEqual(parseDappsPeriod(null), { ok: true, period: "1d" });
  });

  test("accepts all valid periods", () => {
    for (const period of supportedPeriods) {
      assert.deepEqual(parseDappsPeriod(period), { ok: true, period });
    }
  });

  test("rejects invalid periods", () => {
    assert.equal(parseDappsPeriod("1y").ok, false);
    assert.equal(parseDappsPeriod("invalid").ok, false);
  });
});

describe("GET /api/v1/dapps", () => {
  test("returns 200 for supported periods", async () => {
    for (const period of supportedPeriods) {
      const response = await handleDappsRequest(
        new Request(`http://localhost/api/v1/dapps?period=${period}`),
        async (requestedPeriod) => mockDappsResponse(requestedPeriod),
      );

      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("Cache-Control"),
        "public, max-age=900, s-maxage=900",
      );
      const body = (await response.json()) as DappsResponse;
      assert.equal(body.period, period);
      assert.ok(Array.isArray(body.rankings));
      assert.equal(body.rankings.length, 2);
      assert.equal(body.rankings[0].rank, 1);
      assert.equal(body.rankings[0].protocol, "Soroswap");
      assert.equal(body.rankings[0].op_count, 600);
      assert.equal(body.rankings[0].share, 60);
    }
  });

  test("defaults to 1d when period param is missing", async () => {
    const response = await handleDappsRequest(
      new Request("http://localhost/api/v1/dapps"),
      async (requestedPeriod) => mockDappsResponse(requestedPeriod),
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as DappsResponse;
    assert.equal(body.period, "1d");
  });

  test("returns 400 for invalid period without invoking provider", async () => {
    let calls = 0;
    const response = await handleDappsRequest(
      new Request("http://localhost/api/v1/dapps?period=1y"),
      async () => {
        calls += 1;
        return mockDappsResponse("1d");
      },
    );

    assert.equal(response.status, 400);
    assert.equal(calls, 0);
    const body = await response.json();
    assert.equal(body.code, "INVALID_PERIOD");
    assert.ok(Array.isArray(body.supported));
  });

  test("returns 400 for invalid network param", async () => {
    const response = await handleDappsRequest(
      new Request("http://localhost/api/v1/dapps?network=kovan"),
      async () => mockDappsResponse("1d"),
    );

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, "INVALID_NETWORK");
  });

  test("handles empty rankings gracefully", async () => {
    const emptyResponse = mockDappsResponse("1d", {
      total_ops: 0,
      rankings: [],
    });

    const response = await handleDappsRequest(
      new Request("http://localhost/api/v1/dapps?period=1d"),
      async () => emptyResponse,
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as DappsResponse;
    assert.equal(body.total_ops, 0);
    assert.deepEqual(body.rankings, []);
  });

  test("derives empty rankings from empty dataset protocol summary", () => {
    const summary = buildProtocolSummary([], []);
    const dataset = {
      period: "1d" as Period,
      start: "2026-08-03T00:00:00.000Z",
      end: "2026-08-03T23:59:59.999Z",
      source: "hubble" as const,
      sourceTimestamp: "2026-08-03T12:00:00.000Z",
      isPeriodComplete: true,
      protocols: summary,
    } as ActivityDataset;

    const dapps = toDappsLeaderboardResponse(dataset);
    assert.equal(dapps.total_ops, 0);
    assert.deepEqual(dapps.rankings, []);
  });

  test("verifies stable sort order and deterministic tie-breaking", () => {
    const summary = buildProtocolSummary(
      [
        { account_id: "GA5XIGA5C7QTPTWXQHY6MCJRMTRZDOSHR6EFIBNDQTCQHG262N4GGKTM", type_string: "payment", op_count: 50 }, // Kraken
        { account_id: "GDKJ3ZXB5RA2MV5T2Y3Z5D3D3VKR5F7EFRB2A3BMBC3IHGBOK5GDI2LQ", type_string: "payment", op_count: 50 }, // LOBSTR
        { account_id: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNKNLXLTCV", type_string: "payment", op_count: 100 }, // MoneyGram
      ],
      [],
    );

    const dataset = {
      period: "1d" as Period,
      start: "2026-08-03T00:00:00.000Z",
      end: "2026-08-03T23:59:59.999Z",
      source: "hubble" as const,
      sourceTimestamp: "2026-08-03T12:00:00.000Z",
      isPeriodComplete: true,
      protocols: summary,
    } as ActivityDataset;

    const dapps = toDappsLeaderboardResponse(dataset);
    assert.equal(dapps.rankings.length, 3);
    // Highest op_count first: MoneyGram (100)
    assert.equal(dapps.rankings[0].protocol, "MoneyGram");
    assert.equal(dapps.rankings[0].op_count, 100);
    assert.equal(dapps.rankings[0].rank, 1);

    // Tie-breaker: Kraken (50) and LOBSTR (50) -> Alphabetical: Kraken comes before LOBSTR
    assert.equal(dapps.rankings[1].protocol, "Kraken");
    assert.equal(dapps.rankings[1].op_count, 50);
    assert.equal(dapps.rankings[1].rank, 2);

    assert.equal(dapps.rankings[2].protocol, "LOBSTR");
    assert.equal(dapps.rankings[2].op_count, 50);
    assert.equal(dapps.rankings[2].rank, 3);
  });

  test("serves fixture mode response with source fixture", async () => {
    const originalEnv = process.env.LUMENMAP_DATA_SOURCE;
    process.env.LUMENMAP_DATA_SOURCE = "fixture";

    try {
      const response = await handleDappsRequest(
        new Request("http://localhost/api/v1/dapps?period=7d"),
      );

      assert.equal(response.status, 200);
      const body = (await response.json()) as DappsResponse;
      assert.equal(body.source, "fixture");
      assert.equal(body.fixture, true);
      assert.equal(body.period, "7d");
      assert.ok(body.rankings.length > 0);
      assert.ok(body.rankings[0].op_count > 0);
    } finally {
      if (originalEnv !== undefined) {
        process.env.LUMENMAP_DATA_SOURCE = originalEnv;
      } else {
        delete process.env.LUMENMAP_DATA_SOURCE;
      }
    }
  });

  test("returns safe provider error on unexpected error", async () => {
    const response = await handleDappsRequest(
      new Request("http://localhost/api/v1/dapps?period=30d"),
      async () => {
        throw new Error("BigQuery backend query internal error with secret tokens");
      },
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    });
  });

  test("returns safe limit exceeded error on BigQueryLimitExceededError", async () => {
    const response = await handleDappsRequest(
      new Request("http://localhost/api/v1/dapps?period=30d"),
      async () => {
        throw new BigQueryLimitExceededError(
          "Query scan bytes limit exceeded",
          1000,
          "SELECT 1",
          {},
        );
      },
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      code: "LIMIT_EXCEEDED",
      message: "Query scan bytes limit exceeded",
    });
  });
});
