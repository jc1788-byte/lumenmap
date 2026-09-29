import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, getAllByRole, getByRole, getByText, queryByText } from "@testing-library/dom";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FlowEgoView } from "./FlowEgoView";
import { buildEgoGraph } from "@/lib/flow-ego";
import type { FlowTableEdge, FlowTableNode } from "./FlowDataTable";

const NODES: FlowTableNode[] = [
  { id: "GA", label: "Alice" },
  { id: "GB", label: "Bob" },
];

const EDGES: FlowTableEdge[] = [
  { id: "e1", source: "GA", destination: "GB", assetKey: "native:XLM", amount: "100", operationCount: 2 },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function renderView(accountId = "GA", accountLabel = "Alice", edges = EDGES) {
  const graph = buildEgoGraph(accountId, accountLabel, NODES, edges);
  act(() => {
    root.render(<FlowEgoView accountId={graph.centerId} accountLabel={graph.centerLabel} graph={graph} />);
  });
}

describe("FlowEgoView (#311)", () => {
  it("renders the flow view landmark with the account context", () => {
    renderView();
    expect(getByRole(container, "region", { name: /flow ego view/i })).toBeTruthy();
    expect(getByText(container, "Alice")).toBeTruthy();
  });

  it("lists counterparties with aggregates", () => {
    renderView();
    expect(getByText(container, "Bob")).toBeTruthy();
    expect(getAllByRole(container, "option")).toHaveLength(1);
  });

  it("selects a counterparty with mouse and keyboard", () => {
    renderView();
    const [option] = getAllByRole(container, "option");
    act(() => {
      fireEvent.click(option!);
    });
    expect(option!.getAttribute("aria-selected")).toBe("true");

    act(() => {
      fireEvent.keyDown(getAllByRole(container, "option")[0]!, { key: "Enter" });
    });
    expect(getAllByRole(container, "option")[0]!.getAttribute("aria-selected")).toBe("true");
  });

  it("shows an explicit empty state with no edges", () => {
    renderView("GA", "Alice", []);
    expect(getByRole(container, "region", { name: /flow ego view/i })).toBeTruthy();
    expect(getByText(container, /no counterparties/i)).toBeTruthy();
    expect(queryByText(container, "Bob")).toBeNull();
  });
});
