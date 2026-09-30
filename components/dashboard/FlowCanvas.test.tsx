import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, getAllByRole, getByRole, getByTestId } from "@testing-library/dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FlowCanvas } from "./FlowCanvas";
import type { FlowTableNode, FlowTableEdge } from "./FlowDataTable";

const mockNodes: FlowTableNode[] = [
  { id: "GAAA", label: "Alpha Exchange", category: "exchange" },
  { id: "GBBB", label: "Beta Wallet", category: "wallet" },
  { id: "GCCC", label: "Charlie Protocol", category: "defi" },
];

const mockEdges: FlowTableEdge[] = [
  {
    id: "GAAA->GBBB|native:XLM",
    source: "GAAA",
    destination: "GBBB",
    assetKey: "native:XLM",
    asset: { code: "XLM" },
    amount: "50000000",
    operationCount: 5,
  },
  {
    id: "GBBB->GCCC|native:XLM",
    source: "GBBB",
    destination: "GCCC",
    assetKey: "native:XLM",
    asset: { code: "XLM" },
    amount: "30000000",
    operationCount: 3,
  },
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

describe("FlowCanvas", () => {
  it("renders SVG canvas with focusable node targets and edge paths", () => {
    act(() => {
      root.render(<FlowCanvas nodes={mockNodes} edges={mockEdges} />);
    });

    const svg = getByTestId(container, "flow-canvas");
    expect(svg).toBeDefined();

    // Verify all nodes are rendered as focusable buttons
    mockNodes.forEach((node) => {
      const nodeEl = getByTestId(container, `flow-node-${node.id}`);
      expect(nodeEl).toBeDefined();
      expect(nodeEl.getAttribute("tabindex")).toBe("0");
      expect(nodeEl.getAttribute("role")).toBe("button");
      expect(nodeEl.getAttribute("aria-label")).toContain(node.label);
    });

    // Verify edges layer
    const edgePaths = container.querySelectorAll(".flow-edges-layer path");
    expect(edgePaths.length).toBe(mockEdges.length);
  });

  it("supports keyboard navigation across nodes with Arrow keys", () => {
    act(() => {
      root.render(<FlowCanvas nodes={mockNodes} edges={mockEdges} />);
    });

    const firstNode = getByTestId(container, "flow-node-GAAA");
    const secondNode = getByTestId(container, "flow-node-GBBB");

    // Focus first node
    act(() => {
      firstNode.focus();
      fireEvent.focusIn(firstNode);
    });

    const announcement = getByTestId(container, "flow-canvas-announcement");
    expect(announcement.textContent).toContain("Focused Alpha Exchange");

    // ArrowRight moves to next node
    act(() => {
      fireEvent.keyDown(firstNode, { key: "ArrowRight" });
    });
    expect(document.activeElement).toBe(secondNode);

    // ArrowLeft moves back to previous node
    act(() => {
      fireEvent.keyDown(secondNode, { key: "ArrowLeft" });
    });
    expect(document.activeElement).toBe(firstNode);
  });

  it("activates node selection with Enter and Space", () => {
    const onSelect = vi.fn();
    act(() => {
      root.render(<FlowCanvas nodes={mockNodes} edges={mockEdges} onSelect={onSelect} />);
    });

    const firstNode = getByTestId(container, "flow-node-GAAA");

    // Enter selects node
    act(() => {
      fireEvent.keyDown(firstNode, { key: "Enter" });
    });
    expect(onSelect).toHaveBeenCalledWith("GAAA");

    // Space selects node
    act(() => {
      fireEvent.keyDown(firstNode, { key: " " });
    });
    expect(onSelect).toHaveBeenCalledWith("GAAA");
  });

  it("clears selection with Escape key", () => {
    const onSelect = vi.fn();
    act(() => {
      root.render(<FlowCanvas nodes={mockNodes} edges={mockEdges} selectedId="GAAA" onSelect={onSelect} />);
    });

    const firstNode = getByTestId(container, "flow-node-GAAA");
    act(() => {
      fireEvent.keyDown(firstNode, { key: "Escape" });
    });

    expect(onSelect).toHaveBeenCalledWith(null);
    const announcement = getByTestId(container, "flow-canvas-announcement");
    expect(announcement.textContent).toContain("Selection cleared");
  });

  it("displays high-contrast visible focus rings on focused or selected nodes", () => {
    act(() => {
      root.render(<FlowCanvas nodes={mockNodes} edges={mockEdges} selectedId="GAAA" />);
    });

    const firstNode = getByTestId(container, "flow-node-GAAA");
    const focusRing = firstNode.querySelector(".flow-focus-ring");
    expect(focusRing).toBeDefined();
    expect(focusRing?.getAttribute("stroke")).toBe("#ffffff");
    expect(focusRing?.getAttribute("stroke-width")).toBe("2.5");
  });

  it("renders parallel list navigation that mirrors selection", () => {
    const onSelect = vi.fn();
    act(() => {
      root.render(
        <FlowCanvas
          nodes={mockNodes}
          edges={mockEdges}
          selectedId="GAAA"
          onSelect={onSelect}
          showParallelList={true}
        />,
      );
    });

    const options = getAllByRole(container, "option");
    expect(options.length).toBe(mockNodes.length);
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    expect(options[1].getAttribute("aria-selected")).toBe("false");

    // Clicking second option triggers onSelect
    act(() => {
      fireEvent.click(options[1]);
    });
    expect(onSelect).toHaveBeenCalledWith("GBBB");
  });

  it("respects reduced motion when toggle button is pressed", () => {
    act(() => {
      root.render(<FlowCanvas nodes={mockNodes} edges={mockEdges} />);
    });

    const pauseBtn = getByRole(container, "button", { name: /pause layout animation/i });
    expect(pauseBtn).toBeDefined();

    act(() => {
      fireEvent.click(pauseBtn);
    });

    // Reduced motion badge should appear
    const badge = getByTestId(container, "reduced-motion-badge");
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain("Reduced motion active");

    // Button updates to resume
    expect(getByRole(container, "button", { name: /resume layout animation/i })).toBeDefined();
  });

  describe("Protocol cluster grouping overlay", () => {
    const protocolNodes: FlowTableNode[] = [
      { id: "G_CIRCLE_1", label: "Circle USDC", category: "issuer", protocol: "Circle" },
      { id: "G_CIRCLE_2", label: "Circle EURC", category: "issuer", protocol: "Circle" },
      { id: "C_SOROSWAP_1", label: "Soroswap Router", category: "defi", protocol: "Soroswap" },
      { id: "C_SOROSWAP_2", label: "Soroswap Pool", category: "defi", protocol: "Soroswap" },
      { id: "G_UNKNOWN_USER", label: "Unknown Trader", category: "account" },
    ];

    const protocolEdges: FlowTableEdge[] = [
      {
        id: "G_CIRCLE_1->G_CIRCLE_2|native:XLM",
        source: "G_CIRCLE_1",
        destination: "G_CIRCLE_2",
        assetKey: "native:XLM",
        amount: "1000",
        operationCount: 1,
      },
      {
        id: "C_SOROSWAP_1->C_SOROSWAP_2|native:XLM",
        source: "C_SOROSWAP_1",
        destination: "C_SOROSWAP_2",
        assetKey: "native:XLM",
        amount: "2000",
        operationCount: 2,
      },
      {
        id: "G_UNKNOWN_USER->G_CIRCLE_1|native:XLM",
        source: "G_UNKNOWN_USER",
        destination: "G_CIRCLE_1",
        assetKey: "native:XLM",
        amount: "500",
        operationCount: 1,
      },
    ];

    it("renders distinct visual groups for known protocols and leaves unknown nodes ungrouped", () => {
      act(() => {
        root.render(<FlowCanvas nodes={protocolNodes} edges={protocolEdges} showProtocolClusters={true} />);
      });

      const overlay = getByTestId(container, "protocol-clusters-overlay");
      expect(overlay).toBeDefined();

      // Check Circle cluster group
      const circleCluster = getByTestId(container, "protocol-cluster-circle");
      expect(circleCluster).toBeDefined();
      expect(circleCluster.querySelector("path")).toBeDefined();
      expect(circleCluster.textContent).toContain("Circle (2)");

      // Check Soroswap cluster group
      const soroswapCluster = getByTestId(container, "protocol-cluster-soroswap");
      expect(soroswapCluster).toBeDefined();
      expect(soroswapCluster.querySelector("path")).toBeDefined();
      expect(soroswapCluster.textContent).toContain("Soroswap (2)");

      // Verify unknown nodes remain ungrouped
      expect(container.querySelector('[data-testid="protocol-cluster-unknown"]')).toBeNull();
      expect(container.querySelector('[data-testid*="unknown-trader"]')).toBeNull();
    });

    it("toggles protocol cluster overlay on and off without breaking layout", () => {
      act(() => {
        root.render(<FlowCanvas nodes={protocolNodes} edges={protocolEdges} />);
      });

      expect(getByTestId(container, "protocol-clusters-overlay")).toBeDefined();
      const nodeEl = getByTestId(container, "flow-node-G_CIRCLE_1");
      const initialTransform = nodeEl.getAttribute("transform");
      expect(initialTransform).toBeTruthy();

      // Toggle off
      const toggleBtn = getByTestId(container, "flow-clusters-toggle");
      expect(toggleBtn.textContent).toContain("Protocol clusters: on");

      act(() => {
        fireEvent.click(toggleBtn);
      });

      // Overlay is hidden
      expect(container.querySelector('[data-testid="protocol-clusters-overlay"]')).toBeNull();
      expect(toggleBtn.textContent).toContain("Protocol clusters: off");

      // Node transform is preserved (layout not broken)
      expect(nodeEl.getAttribute("transform")).toBe(initialTransform);

      // Toggle back on
      act(() => {
        fireEvent.click(toggleBtn);
      });

      expect(getByTestId(container, "protocol-clusters-overlay")).toBeDefined();
      expect(nodeEl.getAttribute("transform")).toBe(initialTransform);
    });
  });
});
