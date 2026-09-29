import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, getByRole, waitFor } from "@testing-library/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { FIXTURE_ACCOUNTS } from "@/lib/fixtures/raw-data";
import { FIXTURE_FLOW_EDGES } from "@/lib/flow/fixtures";
import { buildFlowGraph } from "@/lib/flow/graph";
import { FlowView } from "./FlowView";

vi.mock("./DashboardProvider", () => ({
  useDashboard: () => ({ period: "7d", network: "mainnet" }),
}));

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
  vi.unstubAllGlobals();
});

function Harness() {
  const [account, setAccount] = useState<string | null>(null);
  return <FlowView key={account ?? "overview"} account={account} onAccountChange={setAccount} />;
}

function renderFlow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>));
}

it("double-click drills through account API parameter and exit restores overview", async () => {
  const requests: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    const url = new URL(input, "http://localhost");
    requests.push(url);
    const account = url.searchParams.get("account");
    return new Response(JSON.stringify({
      period: "7d", account, source: "fixture", sampled: false,
      ...buildFlowGraph(FIXTURE_FLOW_EDGES, account ?? undefined),
    }), { status: 200 });
  }));

  renderFlow();
  await waitFor(() => expect(container.querySelectorAll("svg g[role=button]")).toHaveLength(4));
  const egoNode = [...container.querySelectorAll("svg g[role=button]")]
    .find((node) => node.querySelector("title")?.textContent === FIXTURE_ACCOUNTS.kraken);
  expect(egoNode).not.toBeNull();
  act(() => fireEvent.doubleClick(egoNode!));

  await waitFor(() => expect(requests.some((url) => url.searchParams.get("account") === FIXTURE_ACCOUNTS.kraken)).toBe(true));
  await waitFor(() => expect(container.querySelectorAll("svg g[role=button]")).toHaveLength(3));
  expect(container.textContent).not.toContain(FIXTURE_ACCOUNTS.unknownA);
  act(() => fireEvent.click(getByRole(container, "button", { name: "Back to period overview" })));
  await waitFor(() => expect(container.querySelectorAll("svg g[role=button]")).toHaveLength(4));
  expect(requests[0].pathname).toBe("/api/v1/flow");
  expect(requests[0].searchParams.get("period")).toBe("7d");
  expect(requests[0].searchParams.has("account")).toBe(false);
});

it("shows a specific empty state for an account without counterparties", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    period: "7d", account: FIXTURE_ACCOUNTS.unknownC, source: "fixture", sampled: false,
    ...buildFlowGraph(FIXTURE_FLOW_EDGES, FIXTURE_ACCOUNTS.unknownC),
  }), { status: 200 })));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => root.render(
    <QueryClientProvider client={client}>
      <FlowView account={FIXTURE_ACCOUNTS.unknownC} onAccountChange={() => {}} />
    </QueryClientProvider>,
  ));
  await waitFor(() => expect(getByRole(container, "status").textContent).toMatch(/no counterparties/i));
});
