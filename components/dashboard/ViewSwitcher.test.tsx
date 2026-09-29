import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, getByRole, queryByRole } from "@testing-library/dom";
import { vi } from "vitest";
import { ViewSwitcher } from "./ViewSwitcher";

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

function render(props: Parameters<typeof ViewSwitcher>[0]) {
  act(() => {
    root.render(<ViewSwitcher {...props} />);
  });
}

describe("ViewSwitcher", () => {
  it("is hidden when the Flow feature flag is off", () => {
    render({ value: "treemap", onChange: vi.fn(), flowEnabled: false });

    expect(queryByRole(container, "tab")).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it("defaults to Treemap and exposes aria-selected on each option", () => {
    render({ value: "treemap", onChange: vi.fn(), flowEnabled: true });

    expect(
      getByRole(container, "tablist").getAttribute("aria-label"),
    ).toBe("Chart view");
    expect(
      getByRole(container, "tab", { name: "Treemap" }).getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    expect(
      getByRole(container, "tab", { name: "Flow" }).getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("uses roving tabindex so only the selected option is tabbable", () => {
    render({ value: "flow", onChange: vi.fn(), flowEnabled: true });

    expect(
      getByRole(container, "tab", { name: "Treemap" }).getAttribute("tabindex"),
    ).toBe("-1");
    expect(
      getByRole(container, "tab", { name: "Flow" }).getAttribute("tabindex"),
    ).toBe("0");
  });

  it("reports the selected view when a tab is clicked", () => {
    const onChange = vi.fn();
    render({ value: "treemap", onChange, flowEnabled: true });

    act(() => fireEvent.click(getByRole(container, "tab", { name: "Flow" })));

    expect(onChange).toHaveBeenCalledWith("flow");
  });

  it("moves selection with the arrow keys", () => {
    const onChange = vi.fn();
    render({ value: "treemap", onChange, flowEnabled: true });

    act(() =>
      fireEvent.keyDown(getByRole(container, "tablist"), { key: "ArrowRight" }),
    );
    expect(onChange).toHaveBeenLastCalledWith("flow");

    render({ value: "flow", onChange, flowEnabled: true });
    act(() =>
      fireEvent.keyDown(getByRole(container, "tablist"), { key: "ArrowLeft" }),
    );
    expect(onChange).toHaveBeenLastCalledWith("treemap");
  });

  it("jumps to the first and last view with Home and End", () => {
    const onChange = vi.fn();
    render({ value: "treemap", onChange, flowEnabled: true });

    act(() => fireEvent.keyDown(getByRole(container, "tablist"), { key: "End" }));
    expect(onChange).toHaveBeenLastCalledWith("flow");

    render({ value: "flow", onChange, flowEnabled: true });
    act(() =>
      fireEvent.keyDown(getByRole(container, "tablist"), { key: "Home" }),
    );
    expect(onChange).toHaveBeenLastCalledWith("treemap");
  });

  it("wraps selection around with the opposite arrow key", () => {
    const onChange = vi.fn();
    render({ value: "treemap", onChange, flowEnabled: true });

    act(() =>
      fireEvent.keyDown(getByRole(container, "tablist"), { key: "ArrowLeft" }),
    );

    expect(onChange).toHaveBeenLastCalledWith("flow");
  });

  it("moves focus to the newly selected option", () => {
    const onChange = vi.fn();
    render({ value: "treemap", onChange, flowEnabled: true });

    act(() =>
      fireEvent.keyDown(getByRole(container, "tablist"), { key: "ArrowRight" }),
    );
    render({ value: "flow", onChange, flowEnabled: true });

    expect(document.activeElement).toBe(
      getByRole(container, "tab", { name: "Flow" }),
    );
  });
});
