import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, getByRole, getByTestId, getByText } from "@testing-library/dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { FlowView } from "./FlowView";

const mockSetSelectedNode = vi.fn();
let mockSelectedNode: { name: string; value: number; share: number; meta?: Record<string, unknown> } | null = null;
let mockPeriod = "24h";

vi.mock("@/components/dashboard/DashboardProvider", () => ({
  useDashboard: () => ({
    period: mockPeriod,
    selectedNode: mockSelectedNode,
    setSelectedNode: mockSetSelectedNode,
    treemapView: "flow",
    setTreemapView: vi.fn(),
    data: null,
    isLoading: false,
    error: null,
  }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockSetSelectedNode.mockClear();
  mockSelectedNode = null;
  mockPeriod = "24h";
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

describe("FlowView", () => {
  it("renders with data-testid flow-view, header and graph canvas by default", () => {
    act(() => {
      root.render(<FlowView />);
    });

    const flowView = getByTestId(container, "flow-view");
    expect(flowView).toBeDefined();

    expect(getByText(container, "Payment Flow")).toBeDefined();
    expect(getByTestId(container, "flow-canvas")).toBeDefined();

    // Methodology link
    const methodologyLink = container.querySelector("a[href*='#flow']");
    expect(methodologyLink).toBeDefined();
  });

  it("toggles between graph canvas and data table view", () => {
    act(() => {
      root.render(<FlowView />);
    });

    // Initially graph canvas is visible
    expect(getByTestId(container, "flow-canvas")).toBeDefined();
    expect(container.querySelector("table")).toBeNull();

    // Toggle to Table view
    const tableButton = getByRole(container, "button", { name: /table/i });
    act(() => {
      fireEvent.click(tableButton);
    });

    // Now table is visible and canvas is not
    expect(container.querySelector("table")).toBeDefined();
    expect(container.querySelector("[data-testid='flow-canvas']")).toBeNull();

    // Toggle back to Graph view
    const graphButton = getByRole(container, "button", { name: /graph/i });
    act(() => {
      fireEvent.click(graphButton);
    });

    expect(getByTestId(container, "flow-canvas")).toBeDefined();
    expect(container.querySelector("table")).toBeNull();
  });

  it("respects initialViewMode prop", () => {
    act(() => {
      root.render(<FlowView initialViewMode="table" />);
    });

    expect(container.querySelector("table")).toBeDefined();
    expect(container.querySelector("[data-testid='flow-canvas']")).toBeNull();
  });

  it("wires node activation to setSelectedNode", () => {
    act(() => {
      root.render(<FlowView />);
    });

    // Find the first node on canvas and click it
    const firstNode = container.querySelector("[data-testid^='flow-node-']");
    expect(firstNode).not.toBeNull();

    act(() => {
      fireEvent.click(firstNode!);
    });

    expect(mockSetSelectedNode).toHaveBeenCalledTimes(1);
    const calledArg = mockSetSelectedNode.mock.calls[0][0];
    expect(calledArg).not.toBeNull();
    expect(calledArg.meta).toBeDefined();
    expect(calledArg.meta.type).toBe("account");
  });

  it("clears selection when active node is deselected", () => {
    // First render to get the ID of a real node from the fixture
    act(() => {
      root.render(<FlowView />);
    });
    const firstNode = container.querySelector("[data-testid^='flow-node-']");
    expect(firstNode).not.toBeNull();
    const nodeId = firstNode!.getAttribute("id")!.replace("node-", "");

    // Now set mockSelectedNode to that node
    mockSelectedNode = {
      name: "Selected Account",
      value: 100,
      share: 0,
      meta: {
        id: nodeId,
        type: "account",
      },
    };

    // Re-render with selectedNode populated
    act(() => {
      root.render(<FlowView />);
    });

    const activeNode = container.querySelector(`[data-testid="flow-node-${nodeId}"]`);
    expect(activeNode).not.toBeNull();

    // Clicking it again should deselect and call setSelectedNode(null)
    act(() => {
      fireEvent.click(activeNode!);
    });

    expect(mockSetSelectedNode).toHaveBeenCalledWith(null);
  });
});
