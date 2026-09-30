import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent } from "@testing-library/dom";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { DashboardSearch } from "./DashboardSearch";
import { PeriodSelector } from "./PeriodSelector";
import {
  SEARCH_INPUT_SELECTOR,
  SHORTCUT_GROUPS,
  SHORTCUT_KEYS,
  formatKeyToken,
} from "@/lib/shortcuts";

// React needs this flag so act() flushes updates scheduled from native
// (non-React) event listeners, which is how the global key handler runs.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const state = vi.hoisted(() => ({
  period: "1d",
  setPeriod: vi.fn(),
  comparePeriod: null as string | null,
  setComparePeriod: vi.fn(),
  selectedNode: null as unknown,
  setSelectedNode: vi.fn(),
  data: null as unknown,
  isLoading: false,
  selectSearchResult: vi.fn(),
}));

vi.mock("@/components/dashboard/DashboardProvider", () => ({
  useDashboard: () => state,
}));

let container: HTMLDivElement;
let root: Root;

function render(children: ReactNode = <KeyboardShortcuts />) {
  act(() => {
    root.render(children);
  });
}

function press(target: Document | Element, key: string, shiftKey = false) {
  act(() => {
    fireEvent.keyDown(target, { key, shiftKey });
  });
}

function click(target: Element) {
  act(() => {
    fireEvent.click(target);
  });
}

function mouseDown(target: Element) {
  act(() => {
    fireEvent.mouseDown(target);
  });
}

function openDialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="dialog"]');
}

function pressShortcut(key: string, shiftKey = false) {
  press(document, key, shiftKey);
}

beforeEach(() => {
  state.period = "1d";
  state.selectedNode = null;
  state.setPeriod.mockClear();
  state.setSelectedNode.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.removeChild(container);
  document.body.style.overflow = "";
});

describe("KeyboardShortcuts overlay", () => {
  it("opens on ? with an accessible modal dialog", () => {
    render();
    pressShortcut(SHORTCUT_KEYS.help);

    const dialog = openDialog();
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");

    const labelledBy = dialog?.getAttribute("aria-labelledby");
    expect(document.getElementById(labelledBy ?? "")?.textContent).toBe(
      "Keyboard shortcuts",
    );

    const describedBy = dialog?.getAttribute("aria-describedby");
    const instructions = document.getElementById(describedBy ?? "");
    expect(instructions?.textContent).toContain("Tab");
    expect(instructions?.textContent).toContain("Esc");

    // Initial focus lands inside the dialog so screen readers announce it.
    expect(document.activeElement).toBe(dialog);

    // Groups cover the issue's four areas plus the dialog itself.
    const titles = SHORTCUT_GROUPS.map((group) => group.title);
    for (const title of ["Search", "Period", "Treemap", "Detail panel"]) {
      expect(titles).toContain(title);
    }
    for (const group of SHORTCUT_GROUPS) {
      expect(
        document.getElementById(`${labelledBy}-${group.id}`)?.textContent,
      ).toBe(group.title);
    }
  });

  it("lists every documented shortcut as key chips", () => {
    render();
    pressShortcut(SHORTCUT_KEYS.help);
    const dialog = openDialog();
    expect(dialog).toBeTruthy();

    const chips = Array.from(dialog?.querySelectorAll("kbd") ?? []).map(
      (chip) => chip.textContent,
    );
    for (const group of SHORTCUT_GROUPS) {
      for (const shortcut of group.shortcuts) {
        for (const key of shortcut.keys) {
          expect(chips).toContain(formatKeyToken(key));
        }
      }
    }
  });

  it("closes on Escape and restores focus to the previously focused element", () => {
    render();
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Keyboard shortcuts"]',
    );
    expect(trigger).toBeTruthy();
    act(() => trigger?.focus());

    pressShortcut(SHORTCUT_KEYS.help);
    expect(openDialog()).toBeTruthy();

    pressShortcut(SHORTCUT_KEYS.escape);
    expect(openDialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes via the explicit Close button", () => {
    render();
    pressShortcut(SHORTCUT_KEYS.help);
    const closeButton = Array.from(
      openDialog()?.querySelectorAll("button") ?? [],
    ).find((button) => button.textContent?.trim() === "Close");
    expect(closeButton).toBeTruthy();

    click(closeButton as HTMLElement);
    expect(openDialog()).toBeNull();
  });

  it("closes on backdrop press but not on presses inside the dialog", () => {
    render();
    pressShortcut(SHORTCUT_KEYS.help);
    const dialog = openDialog();
    expect(dialog).toBeTruthy();

    mouseDown(dialog as HTMLElement);
    expect(openDialog()).toBeTruthy();

    mouseDown(dialog?.parentElement as HTMLElement);
    expect(openDialog()).toBeNull();
  });

  it("traps Tab and Shift+Tab inside the dialog", () => {
    render();
    pressShortcut(SHORTCUT_KEYS.help);
    const dialog = openDialog();
    expect(dialog).toBeTruthy();

    const focusables = Array.from(
      dialog?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [],
    );
    expect(focusables.length).toBeGreaterThan(0);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    act(() => last.focus());
    pressShortcut("Tab");
    expect(document.activeElement).toBe(first);

    act(() => first.focus());
    pressShortcut("Tab", true);
    expect(document.activeElement).toBe(last);
  });

  it("locks body scroll while open and unlocks on close", () => {
    render();
    pressShortcut(SHORTCUT_KEYS.help);
    expect(document.body.style.overflow).toBe("hidden");
    pressShortcut(SHORTCUT_KEYS.escape);
    expect(document.body.style.overflow).toBe("");
  });
});

describe("KeyboardShortcuts global handler", () => {
  it("ignores shortcuts typed in editable fields", () => {
    render();
    const input = document.createElement("input");
    document.body.appendChild(input);
    try {
      input.focus();
      press(input, SHORTCUT_KEYS.help);
      expect(openDialog()).toBeNull();
      press(input, SHORTCUT_KEYS.focusSearch);
      expect(document.activeElement).toBe(input);
      press(input, SHORTCUT_KEYS.nextPeriod);
      expect(state.setPeriod).not.toHaveBeenCalled();
      press(input, SHORTCUT_KEYS.escape);
      expect(state.setSelectedNode).not.toHaveBeenCalled();
    } finally {
      input.remove();
    }
  });

  it("ignores other shortcuts while the overlay is open", () => {
    render(
      <>
        <KeyboardShortcuts />
        <DashboardSearch />
      </>,
    );
    pressShortcut(SHORTCUT_KEYS.help);
    expect(openDialog()).toBeTruthy();

    const search = document.querySelector(SEARCH_INPUT_SELECTOR);
    // "/" would normally move focus to search, but the open dialog wins.
    pressShortcut(SHORTCUT_KEYS.focusSearch);
    expect(document.activeElement).not.toBe(search);
    expect(openDialog()).toBeTruthy();

    pressShortcut(SHORTCUT_KEYS.escape);
    expect(openDialog()).toBeNull();
  });

  it("ignores Escape when no panel or dialog is open", () => {
    render();
    pressShortcut(SHORTCUT_KEYS.escape);
    expect(state.setSelectedNode).not.toHaveBeenCalled();
  });
});

describe("shortcut list matches implemented handlers", () => {
  const documentedGlobalKeys = Array.from(
    new Set(
      SHORTCUT_GROUPS.flatMap((group) => group.shortcuts)
        .filter((shortcut) => shortcut.scope === "global")
        .flatMap((shortcut) => shortcut.keys),
    ),
  ).sort();

  const scenarios: Record<string, () => void> = {
    [SHORTCUT_KEYS.help]: () => {
      render();
      pressShortcut(SHORTCUT_KEYS.help);
      expect(openDialog()).toBeTruthy();
      pressShortcut(SHORTCUT_KEYS.escape);
      expect(openDialog()).toBeNull();
    },
    [SHORTCUT_KEYS.focusSearch]: () => {
      render(
        <>
          <KeyboardShortcuts />
          <DashboardSearch />
        </>,
      );
      pressShortcut(SHORTCUT_KEYS.focusSearch);
      expect(document.activeElement).toBe(
        document.querySelector(SEARCH_INPUT_SELECTOR),
      );
    },
    [SHORTCUT_KEYS.previousPeriod]: () => {
      render();
      pressShortcut(SHORTCUT_KEYS.previousPeriod);
      expect(state.setPeriod).toHaveBeenCalledWith("month");
    },
    [SHORTCUT_KEYS.nextPeriod]: () => {
      render();
      pressShortcut(SHORTCUT_KEYS.nextPeriod);
      expect(state.setPeriod).toHaveBeenCalledWith("7d");
    },
    [SHORTCUT_KEYS.escape]: () => {
      state.selectedNode = { name: "Payments", meta: { nodeId: "payments" } };
      render();
      pressShortcut(SHORTCUT_KEYS.escape);
      expect(state.setSelectedNode).toHaveBeenCalledWith(null);
    },
  };

  it("documents exactly the global keys the handler acts on", () => {
    expect(Object.keys(scenarios).sort()).toEqual(documentedGlobalKeys);
  });

  it.each(Object.entries(scenarios))(
    "global shortcut %s performs its documented action",
    (_key, scenario) => {
      scenario();
    },
  );

  it("documents widget-scoped shortcuts with their focus precondition", () => {
    const widgetShortcuts = SHORTCUT_GROUPS.flatMap(
      (group) => group.shortcuts,
    ).filter((shortcut) => shortcut.scope === "widget");
    expect(widgetShortcuts.length).toBeGreaterThan(0);
    for (const shortcut of widgetShortcuts) {
      expect(shortcut.keys.length).toBeGreaterThan(0);
      expect(
        shortcut.context,
        `${shortcut.keys.join("+")} must document where it applies`,
      ).toBeTruthy();
    }
  });

  it("period selector arrow keys match the documented Period shortcut", () => {
    render(<PeriodSelector />);
    const radios = container.querySelectorAll<HTMLElement>("[role=radio]");
    expect(radios.length).toBeGreaterThan(0);
    act(() => radios[0].focus());
    press(radios[0], "ArrowRight");
    expect(state.setPeriod).toHaveBeenCalledWith("7d");
  });
});
