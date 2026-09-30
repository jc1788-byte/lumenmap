import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, getAllByRole, getByRole } from "@testing-library/dom";
import { vi } from "vitest";
import {
  FlowDataTable,
  FlowViewToggle,
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

describe("FlowDataTable async states", () => {
  it("renders skeletons with aria-busy when loading", () => {
    act(() => root.render(<FlowDataTable nodes={nodes} edges={edges} isLoading />));

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelector("table")).toBeNull();
  });

  it("renders an alert with retry that fires onRetry once", () => {
    const onRetry = vi.fn();
    act(() =>
      root.render(
        <FlowDataTable nodes={nodes} edges={edges} isError onRetry={onRetry} errorMessage="Flow request failed" />,
      ),
    );

    expect(getByRole(container, "alert").textContent).toContain("Flow request failed");
    const retry = getByRole(container, "button", { name: /retry loading flow data/i });
    act(() => {
      fireEvent.click(retry);
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("guards double-clicks while retryPending", () => {
    const onRetry = vi.fn();
    act(() =>
      root.render(
        <FlowDataTable nodes={nodes} edges={edges} isError onRetry={onRetry} retryPending />,
      ),
    );

    const retry = getByRole(container, "button", { name: /retrying flow data/i });
    expect(retry.hasAttribute("disabled")).toBe(true);
    act(() => {
      fireEvent.click(retry);
      fireEvent.click(retry);
    });
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("renders a polite status when there are no edges", () => {
    act(() => root.render(<FlowDataTable nodes={[]} edges={[]} />));

    const status = getByRole(container, "status");
    expect(status.textContent).toContain("No flow edges to display.");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });

  it("renders a nodes-empty status when showNodes has no nodes", () => {
    act(() => root.render(<FlowDataTable nodes={[]} edges={edges} showNodes />));

    const statuses = getAllByRole(container, "status");
    expect(statuses.some((s) => s.textContent?.includes("No flow nodes to display."))).toBe(true);
    expect(statuses.every((s) => s.getAttribute("aria-live") === "polite")).toBe(true);
  });
});
