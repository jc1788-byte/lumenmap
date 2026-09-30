import { act } from "react";
import { createRoot } from "react-dom/client";
import { getByTestId } from "@testing-library/dom";
import { KpiCards } from "./KpiCards";

const { mockUseDashboard } = vi.hoisted(() => ({
  mockUseDashboard: vi.fn(),
}));

vi.mock("@/components/dashboard/DashboardProvider", () => ({
  useDashboard: mockUseDashboard,
}));

describe("KpiCards", () => {
  it.each([
    ["a null KPI", null],
    ["a null value", { kind: "entity_count", unit: "count", value: null }],
    ["a missing value", { kind: "entity_count", unit: "count" }],
  ])("renders Unavailable for %s", (_description, activeDestinationAccounts) => {
    mockUseDashboard.mockReturnValue({
      data: {
        sourceTimestamp: "2026-09-29T00:00:00Z",
        timeseries: { buckets: [] },
        kpis: {
          totalOps: { kind: "operations", unit: "ops", value: 3 },
          sorobanShare: { kind: "share", unit: "percent", value: 0 },
          topCategory: "payments",
          activeContracts: { kind: "entity_count", unit: "count", value: 1 },
          activeWallets: { kind: "entity_count", unit: "count", value: 2 },
          activeDestinationAccounts,
        },
      },
      isLoading: false,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(<KpiCards />);
      });

      expect(getByTestId(container, "kpi-value-activeDestinationAccounts").textContent).toBe(
        "Unavailable",
      );
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it("renders zero as a numeric destination count", () => {
    mockUseDashboard.mockReturnValue({
      data: {
        sourceTimestamp: "2026-09-29T00:00:00Z",
        timeseries: { buckets: [] },
        kpis: {
          totalOps: { kind: "operations", unit: "ops", value: 3 },
          sorobanShare: { kind: "share", unit: "percent", value: 0 },
          topCategory: "payments",
          activeContracts: { kind: "entity_count", unit: "count", value: 1 },
          activeWallets: { kind: "entity_count", unit: "count", value: 2 },
          activeDestinationAccounts: {
            kind: "entity_count",
            unit: "count",
            value: 0,
          },
        },
      },
      isLoading: false,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(<KpiCards />);
      });

      expect(getByTestId(container, "kpi-value-activeDestinationAccounts").textContent).toBe("0");
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});