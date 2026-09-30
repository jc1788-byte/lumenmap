import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, getByRole, getByTestId, waitFor } from "@testing-library/dom";
import DashboardLayout from "@/app/(dashboard)/layout";
import { AppProviders } from "@/components/providers";
import { useDashboard } from "./DashboardProvider";

function FilterControls() {
  const { period, setPeriod, metric, setMetric, searchQuery, setSearchQuery } =
    useDashboard();

  return (
    <div>
      <output data-testid="filter-state">
        {period}|{metric}|{searchQuery}
      </output>
      <button onClick={() => setPeriod("30d")}>Set 30 days</button>
      <button onClick={() => setMetric("ops")}>Set operations</button>
      <button onClick={() => setSearchQuery("XLM")}>Search XLM</button>
    </div>
  );
}

function FlowConsumer() {
  const { period, metric, searchQuery } = useDashboard();
  return (
    <output data-testid="flow-state">
      {period}|{metric}|{searchQuery}
    </output>
  );
}

function RouteHarness() {
  const [route, setRoute] = useState<"overview" | "flow">("overview");

  return (
    <>
      <button onClick={() => setRoute("flow")}>Open Flow</button>
      {route === "overview" ? <FilterControls /> : <FlowConsumer />}
    </>
  );
}

describe("DashboardProvider shared filters", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.replaceState(
      {},
      "",
      "/?period=7d&metric=transactions&q=Soroban",
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
  });

  it("shares hydrated filters across route consumers without duplicate fetches", async () => {
    act(() => {
      root.render(
        <AppProviders>
          <DashboardLayout>
            <RouteHarness />
          </DashboardLayout>
        </AppProviders>,
      );
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(getByTestId(container, "filter-state").textContent).toBe(
      "7d|transactions|Soroban",
    );
    expect(
      new URL(fetchMock.mock.calls[0][0] as string, window.location.origin)
        .searchParams.get("period"),
    ).toBe("7d");

    act(() => {
      fireEvent.click(getByRole(container, "button", { name: "Set 30 days" }));
      fireEvent.click(getByRole(container, "button", { name: "Set operations" }));
      fireEvent.click(getByRole(container, "button", { name: "Search XLM" }));
      fireEvent.click(getByRole(container, "button", { name: "Open Flow" }));
    });

    expect(getByTestId(container, "flow-state").textContent).toBe(
      "30d|ops|XLM",
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      fetchMock.mock.calls.map(([url]) =>
        new URL(url as string, window.location.origin).searchParams.get("period"),
      ),
    ).toEqual(["7d", "30d"]);
  });
});