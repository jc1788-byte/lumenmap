import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, getAllByRole, getByRole, getByText } from "@testing-library/dom";
import { vi } from "vitest";
import {
  FlowDataTable,
  FlowViewToggle,
  buildFlowCoverage,
  type FlowTableEdge,
  type FlowTableNode,
} from "./FlowDataTable";

const nodes: FlowTableNode[] = [
  { id: "GAAA", label: "Alpha Exchange", category: "exchange" },
  { id: "GBBB", label: "Beta Wallet" },
  { id: "GCCC", label: "Charlie Protocol", category: "protocol" },
];

const edges: FlowTableEdge[] = [
  { id: "GAAA->GBBB|native:XLM", source: "GAAA", destination: "GBBB", assetKey: "native:XLM", asset: { code: "XLM" }, amount: "50000000", operationCount: 2 },
  { id: "GBBB->GCCC|native:XLM", source: "GBBB", destination: "GCCC", assetKey: "native:XLM", asset: { code: "XLM" }, amount: "300000000", operationCount: 7 },
  { id: "GCCC->GAAA|USDC:GISS", source: "GCCC", destination: "GAAA", assetKey: "USDC:GISS", asset: { code: "USDC" }, amount: "10000000", operationCount: 1 },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function edgeBodyRows() {
  const table = getAllByRole(container, "table")[0];
  return Array.from(table.querySelectorAll("tbody tr"));
}

describe("FlowDataTable", () => {
  it("renders one row per edge with node labels and column headers", () => {
    act(() => root.render(<FlowDataTable nodes={nodes} edges={edges} />));

    expect(edgeBodyRows()).toHaveLength(edges.length);
    const headers = getAllByRole(container, "columnheader");
    expect(headers.every((h) => h.tagName === "TH" && h.getAttribute("scope") === "col")).toBe(true);
    expect(container.querySelector("caption")?.textContent).toContain("3 edges");
    expect(container.textContent).toContain("Alpha Exchange");
    expect(container.textContent).toContain("USDC");
  });

  it("sorts rows and updates aria-sort when a header is activated", () => {
    act(() => root.render(<FlowDataTable nodes={nodes} edges={edges} />));

    const amountHeader = getByRole(container, "columnheader", { name: /amount/i });
    expect(amountHeader.getAttribute("aria-sort")).toBe("descending");
    expect(edgeBodyRows()[0].getAttribute("data-row-id")).toBe("GBBB->GCCC|native:XLM");

    act(() => fireEvent.click(getByRole(amountHeader, "button")));
    expect(amountHeader.getAttribute("aria-sort")).toBe("ascending");
    expect(edgeBodyRows()[0].getAttribute("data-row-id")).toBe("GCCC->GAAA|USDC:GISS");

    const sourceHeader = getByRole(container, "columnheader", { name: /source/i });
    act(() => fireEvent.click(getByRole(sourceHeader, "button")));
    expect(sourceHeader.getAttribute("aria-sort")).toBe("descending");
    expect(amountHeader.getAttribute("aria-sort")).toBe("none");
    expect(edgeBodyRows()[0].getAttribute("data-row-id")).toBe("GCCC->GAAA|USDC:GISS");
  });

  it("selects a row with Enter and Space", () => {
    const onSelect = vi.fn();
    act(() =>
      root.render(<FlowDataTable nodes={nodes} edges={edges} onSelect={onSelect} selectedId="GAAA->GBBB|native:XLM" />),
    );

    const [first, second] = edgeBodyRows();
    expect(first.getAttribute("tabindex")).toBe("0");
    act(() => fireEvent.keyDown(first, { key: "Enter" }));
    act(() => fireEvent.keyDown(second, { key: " " }));

    expect(onSelect).toHaveBeenNthCalledWith(1, "GBBB->GCCC|native:XLM");
    expect(onSelect).toHaveBeenNthCalledWith(2, "GAAA->GBBB|native:XLM");
    expect(second.getAttribute("aria-selected")).toBe("true");
  });

  it("renders the optional nodes table", () => {
    act(() => root.render(<FlowDataTable nodes={nodes} edges={edges} showNodes />));

    const tables = getAllByRole(container, "table");
    expect(tables).toHaveLength(2);
    expect(tables[1].querySelectorAll("tbody tr")).toHaveLength(nodes.length);
  });
});

describe("FlowViewToggle", () => {
  it("exposes pressed state and reports changes", () => {
    const onChange = vi.fn();
    act(() => root.render(<FlowViewToggle view="graph" onChange={onChange} />));

    expect(getByRole(container, "button", { name: "Graph" }).getAttribute("aria-pressed")).toBe("true");
    const tableButton = getByRole(container, "button", { name: "Table" });
    expect(tableButton.getAttribute("aria-pressed")).toBe("false");
    act(() => fireEvent.click(tableButton));
    expect(onChange).toHaveBeenCalledWith("table");
  });
});

describe("buildFlowCoverage", () => {
  it("reports partial sampled coverage", () => {
    expect(
      buildFlowCoverage(edges, { totalEdges: 50, totalOperations: 40, configuredLimit: 3 }),
    ).toEqual({
      returnedEdges: 3,
      totalEdges: 50,
      returnedOperations: 10,
      totalOperations: 40,
      coveragePercent: 25,
      sampled: true,
      configuredLimit: 3,
    });
  });

  it("reports complete coverage as unsampled 100 percent", () => {
    expect(
      buildFlowCoverage(edges, { totalEdges: 3, totalOperations: 10, configuredLimit: 3 }),
    ).toMatchObject({ coveragePercent: 100, sampled: false });
  });

  it("yields zero percent without NaN for a zero-operation period", () => {
    expect(
      buildFlowCoverage(edges, { totalEdges: 3, totalOperations: 0, configuredLimit: 3 }),
    ).toMatchObject({ coveragePercent: 0 });
  });

  it("returns undefined when no edges were returned", () => {
    expect(
      buildFlowCoverage([], { totalEdges: 50, totalOperations: 40, configuredLimit: 3 }),
    ).toBeUndefined();
  });
});

describe("FlowCoverageBadge", () => {
  const sampledCoverage = buildFlowCoverage(edges, {
    totalEdges: 50,
    totalOperations: 40,
    configuredLimit: 3,
  })!;

  it("renders badge text with a methodology link when coverage is below 100%", () => {
    act(() => root.render(<FlowDataTable nodes={nodes} edges={edges} coverage={sampledCoverage} />));

    expect(container.textContent).toContain("top 3 of 50 edges");
    expect(container.textContent).toContain("25.0% of operations");
    const link = getByText(container, "Methodology").closest("a");
    expect(link?.getAttribute("href")).toBe("/methodology#flow-sampling");
  });

  it("hides the badge at full coverage", () => {
    const full = buildFlowCoverage(edges, {
      totalEdges: 3,
      totalOperations: 10,
      configuredLimit: 3,
    })!;
    act(() => root.render(<FlowDataTable nodes={nodes} edges={edges} coverage={full} />));

    expect(container.textContent).not.toContain("of operations");
  });

  it("hides the badge when coverage is absent", () => {
    act(() => root.render(<FlowDataTable nodes={nodes} edges={edges} />));

    expect(container.textContent).not.toContain("Methodology");
  });
});
