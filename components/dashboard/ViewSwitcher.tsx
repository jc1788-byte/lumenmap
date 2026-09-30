"use client";

import { useCallback, useMemo, useRef, type KeyboardEvent } from "react";
import { CHART_VIEWS, type ChartViewId } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ViewSwitcherProps {
  /** Currently selected chart view. */
  value: ChartViewId;
  /** Called with the next chart view when the user selects one. */
  onChange: (view: ChartViewId) => void;
  /**
   * Whether the experimental Flow view is enabled. When false the switcher is
   * hidden entirely so the dashboard keeps its default treemap-only controls.
   */
  flowEnabled?: boolean;
  /** Accessible name for the tab list. */
  label?: string;
  /** Id of the element the tabs control, linked via `aria-controls`. */
  panelId?: string;
  className?: string;
}

/**
 * Accessible Treemap / Flow chart-view switcher.
 *
 * Renders a WAI-ARIA tab list: the active view is exposed through
 * `aria-selected` and the list is fully keyboard operable (arrow keys move the
 * selection and focus, Home/End jump to the first/last option). Tab focus is
 * roving so only the selected option is in the tab order.
 */
export function ViewSwitcher({
  value,
  onChange,
  flowEnabled = false,
  label = "Chart view",
  panelId,
  className,
}: ViewSwitcherProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => CHART_VIEWS, []);
  const activeValue: ChartViewId = options.some((option) => option.id === value)
    ? value
    : "treemap";

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = options.findIndex(
        (option) => option.id === activeValue,
      );
      let nextIndex: number | null = null;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % options.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + options.length) % options.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = options.length - 1;
      }

      if (nextIndex === null) return;
      event.preventDefault();
      const nextValue = options[nextIndex].id;
      onChange(nextValue);
      const tabs =
        groupRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]");
      tabs?.[nextIndex]?.focus();
    },
    [activeValue, onChange, options],
  );

  // Hidden when the Flow feature flag is off; the default view remains Treemap.
  if (!flowEnabled) return null;

  return (
    <div
      ref={groupRef}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      className={cn("inline-flex flex-wrap gap-2", className)}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const selected = option.id === activeValue;
        return (
          <Button
            key={option.id}
            id={panelId ? `${panelId}-tab-${option.id}` : undefined}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            variant={selected ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
