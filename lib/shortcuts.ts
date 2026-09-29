/**
 * Single source of truth for dashboard keyboard shortcuts.
 *
 * The `KeyboardShortcuts` overlay renders these entries, the global key
 * handler in `components/dashboard/KeyboardShortcuts.tsx` acts on
 * `SHORTCUT_KEYS`, and the README "Keyboard shortcuts" table mirrors them.
 * Keep all three in sync when adding or changing a shortcut.
 */

export type ShortcutScope = "global" | "widget";

export interface ShortcutEntry {
  /** Canonical `KeyboardEvent.key` values that trigger this shortcut. */
  keys: string[];
  /** Human-readable action shown in the overlay and README. */
  label: string;
  /** `global` shortcuts fire anywhere on the dashboard; `widget` shortcuts only fire while the named widget has focus. */
  scope: ShortcutScope;
  /** Where the shortcut applies (precondition for widget-scoped shortcuts, state precondition for global ones). */
  context?: string;
}

export interface ShortcutGroup {
  id: string;
  title: string;
  shortcuts: ShortcutEntry[];
}

/** Keys handled by the global dashboard key handler. */
export const SHORTCUT_KEYS = {
  help: "?",
  focusSearch: "/",
  previousPeriod: "[",
  nextPeriod: "]",
  escape: "Escape",
} as const;

/** Selector for the search input, used by the `/` focus shortcut. */
export const SEARCH_INPUT_SELECTOR = '[data-testid="dashboard-search-input"]';

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: "search",
    title: "Search",
    shortcuts: [
      {
        keys: [SHORTCUT_KEYS.focusSearch],
        label: "Focus the search box",
        scope: "global",
      },
      {
        keys: ["ArrowUp", "ArrowDown"],
        label: "Move through results",
        scope: "widget",
        context: "While search results are open",
      },
      {
        keys: ["Enter"],
        label: "Open the highlighted result",
        scope: "widget",
        context: "While search results are open",
      },
      {
        keys: [SHORTCUT_KEYS.escape],
        label: "Close the results list",
        scope: "widget",
        context: "While the search box is focused",
      },
    ],
  },
  {
    id: "period",
    title: "Period",
    shortcuts: [
      {
        keys: [SHORTCUT_KEYS.previousPeriod],
        label: "Previous period",
        scope: "global",
      },
      {
        keys: [SHORTCUT_KEYS.nextPeriod],
        label: "Next period",
        scope: "global",
      },
      {
        keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"],
        label: "Change period",
        scope: "widget",
        context: "While the period selector is focused",
      },
    ],
  },
  {
    id: "treemap",
    title: "Treemap",
    shortcuts: [
      {
        keys: ["Tab"],
        label: "Move between tiles",
        scope: "widget",
        context: "Tab through the page to reach tiles",
      },
      {
        keys: ["Enter", " "],
        label: "Open details or drill into the tile",
        scope: "widget",
        context: "While a tile is focused",
      },
      {
        keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"],
        label: "Switch treemap view",
        scope: "widget",
        context: "While the view selector is focused",
      },
    ],
  },
  {
    id: "detail-panel",
    title: "Detail panel",
    shortcuts: [
      {
        keys: [SHORTCUT_KEYS.escape],
        label: "Close the panel and return focus to the tile",
        scope: "global",
        context: "While the detail panel is open",
      },
    ],
  },
  {
    id: "help",
    title: "Help",
    shortcuts: [
      {
        keys: [SHORTCUT_KEYS.help],
        label: "Show or hide this dialog",
        scope: "global",
      },
      {
        keys: [SHORTCUT_KEYS.escape],
        label: "Close this dialog",
        scope: "global",
        context: "While this dialog is open",
      },
    ],
  },
];

const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  Escape: "Esc",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

/** Display label for a canonical `KeyboardEvent.key` value. */
export function formatKeyToken(key: string): string {
  return KEY_LABELS[key] ?? key;
}

/**
 * True when the event originated in a text-entry context, where printable
 * keys (including `?` and `/`) must never trigger global shortcuts.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if ((target as HTMLElement).isContentEditable) {
    return true;
  }
  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}
