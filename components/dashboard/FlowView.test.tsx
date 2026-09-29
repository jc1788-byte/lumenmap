import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { getByRole } from "@testing-library/dom";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FlowView } from "./FlowView";

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

describe("FlowView", () => {
  it("renders Flow view with title and enabled export button in fixture mode", () => {
    act(() => root.render(<FlowView fixture={true} />));

    expect(container.textContent).toContain("Payment Flow");
    const exportButton = getByRole(container, "button", {
      name: /export flow edges as csv/i,
    });
    expect(exportButton).toBeTruthy();
    expect(exportButton.hasAttribute("disabled")).toBe(false);
  });

  it("disables export button when graph edges are empty", () => {
    act(() => root.render(<FlowView fixture={false} edges={[]} nodes={[]} />));

    const exportButton = getByRole(container, "button", {
      name: /export flow edges as csv/i,
    });
    expect(exportButton).toBeTruthy();
    expect(exportButton.hasAttribute("disabled")).toBe(true);
  });
});
