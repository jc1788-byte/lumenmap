import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  generateSafeFilename,
  flattenTreemapForCsv,
  getStructuredRowsForExport,
  buildDashboardPdfDocument,
  buildTextPdf,
  serializeFlowEdgesToCsv,
  generateFlowEdgesFilename,
  type FlowExportEdge,
} from "./export-utils";
import type { TreemapNode } from "@/lib/types";

describe("export-utils", () => {
  test("generateSafeFilename sanitizes metric and period", () => {
    const name = generateSafeFilename("lumenmap", "Network Activity", "7d", "csv", "20260101");
    assert.equal(name, "lumenmap-network-activity-7d-20260101.csv");
  });

  test("flattenTreemapForCsv walks hierarchy", () => {
    const root: TreemapNode = {
      name: "root",
      value: 10,
      children: [
        { name: "a", value: 6 },
        { name: "other", value: 4 },
      ],
    };
    const rows = flattenTreemapForCsv(root);
    assert.ok(rows.length >= 2);
    assert.ok(rows.some((r) => r.name === "a"));
  });

  test("getStructuredRowsForExport uses treemap view", () => {
    const data = {
      period: "1d" as const,
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-01T23:59:59.999Z",
      source: "hubble" as const,
      sourceTimestamp: "2026-01-02T00:00:00.000Z",
      isPeriodComplete: true,
      kpis: {} as never,
      treemaps: {
        events: { name: "events", value: 3, children: [{ name: "payment", value: 3 }] },
      } as never,
      metricProvenance: {} as never,
    };
    const { rows, syntheticIdentifiers } = getStructuredRowsForExport(data as never, "events");
    assert.ok(Array.isArray(rows));
    assert.ok(syntheticIdentifiers.includes("other"));
  });

  test("buildTextPdf produces a PDF header", async () => {
    const blob = buildTextPdf(["hello", "world"]);
    const text = await blob.text();
    assert.ok(text.startsWith("%PDF-1.4"));
    assert.ok(text.includes("hello"));
  });

  test("buildDashboardPdfDocument fails while loading and names period in body", async () => {
    assert.throws(
      () =>
        buildDashboardPdfDocument({
          metadata: {
            metric: "Network Activity",
            unit: "operations",
            period: "1d",
            timezone: "UTC",
            freshness: "2026-01-01T00:00:00.000Z",
            filters: { period: "1d", view: "events", source: "fixture" },
            generatedAt: "2026-01-02T00:00:00.000Z",
            view: "events",
          },
          kpiLines: ["ops: 1"],
          chartTitle: "Operation Types",
          loading: true,
        }),
      /still loading/i,
    );

    const blob = buildDashboardPdfDocument({
      metadata: {
        metric: "Network Activity",
        unit: "operations",
        period: "1d",
        timezone: "UTC",
        freshness: "2026-01-01T00:00:00.000Z",
        filters: { period: "1d", view: "events", source: "fixture" },
        generatedAt: "2026-01-02T00:00:00.000Z",
        view: "events",
      },
      kpiLines: ["ops: 12"],
      chartTitle: "Operation Types",
      loading: false,
    });
    const text = await blob.text();
    assert.ok(text.includes("Period: 1d"));
    assert.ok(text.includes("ops: 12"));
    assert.ok(text.includes("Operation Types"));
  });

  test("generateFlowEdgesFilename includes period and timestamp", () => {
    const filename = generateFlowEdgesFilename("7d", "20260929");
    assert.equal(filename, "lumenmap-flow-edges-7d-20260929.csv");

    const sanitized = generateFlowEdgesFilename("30d-all!", "20260930");
    assert.equal(sanitized, "lumenmap-flow-edges-30dall-20260930.csv");
  });

  test("serializeFlowEdgesToCsv outputs header row when empty", () => {
    const csv = serializeFlowEdgesToCsv([]);
    assert.equal(csv, "from,to,asset,amount,op_count\n");
  });

  test("serializeFlowEdgesToCsv serializes flow edges with from, to, asset, amount, op_count", () => {
    const edges: FlowExportEdge[] = [
      {
        source: "G-FIXTURE-EXCHANGE",
        destination: "G-FIXTURE-WALLET-A",
        assetKey: "native:XLM",
        asset: { code: "XLM" },
        amount: "800000000",
        operationCount: 8,
      },
      {
        source: "G-FIXTURE-ANCHOR",
        destination: "G-FIXTURE-WALLET-B",
        assetKey: "USDC:FIXTURE",
        asset: { code: "USDC" },
        amount: "500000000",
        operationCount: 5,
      },
      {
        from: "G-CUSTOM-SOURCE",
        to: "G-CUSTOM-DEST",
        asset: "AQUA",
        amount: "1234567890123456789",
        op_count: 42,
      },
    ];

    const csv = serializeFlowEdgesToCsv(edges);
    const lines = csv.split("\n");

    assert.equal(lines.length, 4);
    assert.equal(lines[0], "from,to,asset,amount,op_count");
    assert.equal(lines[1], "G-FIXTURE-EXCHANGE,G-FIXTURE-WALLET-A,XLM,800000000,8");
    assert.equal(lines[2], "G-FIXTURE-ANCHOR,G-FIXTURE-WALLET-B,USDC,500000000,5");
    assert.equal(lines[3], "G-CUSTOM-SOURCE,G-CUSTOM-DEST,AQUA,1234567890123456789,42");
  });

  test("serializeFlowEdgesToCsv properly escapes special characters in CSV values", () => {
    const edges: FlowExportEdge[] = [
      {
        from: 'G"QUOTED"',
        to: "G,COMMA",
        asset: "LINE\nBREAK",
        amount: "1000",
        op_count: 1,
      },
    ];

    const csv = serializeFlowEdgesToCsv(edges);
    assert.equal(
      csv,
      'from,to,asset,amount,op_count\n"G""QUOTED""","G,COMMA","LINE\nBREAK",1000,1'
    );
  });
});

