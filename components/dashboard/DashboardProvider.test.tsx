import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, getByRole, queryByRole } from "@testing-library/dom";
import { vi } from "vitest";
import { DashboardProvider, useDashboard } from "./DashboardProvider";
import { ViewSwitcher } from "./ViewSwitcher";

function Harness() {
  const { chartView, setChartView, flowViewEnabled } = useDashboard();
  return (
    <ViewSwitcher
      value={chartView}
      onChange={setChartView}
      flowEnabled={flowViewEnabled}
    />
  );
}

let container: HTMLDivElement;
let root: Root;
let queryClient: QueryClient;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({}) })),
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

afterEach(() => {
  act(() => root.unmount());
  queryClient.clear();
  container.remove();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

async function renderDashboard(flowViewEnabled: boolean) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <DashboardProvider flowViewEnabled={flowViewEnabled}>
          <Harness />
        </DashboardProvider>
      </QueryClientProvider>,
    );
  });
  // Flush the provider's deferred URL-ready microtask and the write effect.
  await act(async () => {});
}

function viewParam() {
  return new URLSearchParams(window.location.search).get("view");
}

describe("DashboardProvider chart view URL state", () => {
  it("defaults to the Treemap view", async () => {
    await renderDashboard(true);

    expect(
      getByRole(container, "tab", { name: "Treemap" }).getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    expect(viewParam()).toBe("events");
  });

  it("persists the Flow selection to the view URL param when enabled", async () => {
    await renderDashboard(true);

    await act(async () => {
      fireEvent.click(getByRole(container, "tab", { name: "Flow" }));
    });

    expect(viewParam()).toBe("flow");
    expect(
      getByRole(container, "tab", { name: "Flow" }).getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
  });

  it("restores the Flow view from the URL when enabled", async () => {
    window.history.replaceState(null, "", "/?view=flow");

    await renderDashboard(true);

    expect(
      getByRole(container, "tab", { name: "Flow" }).getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
  });

  it("keeps the treemap and hides the switcher when the flag is off", async () => {
    window.history.replaceState(null, "", "/?view=flow");

    await renderDashboard(false);

    expect(queryByRole(container, "tab")).toBeNull();
    expect(viewParam()).toBe("events");
  });
});
