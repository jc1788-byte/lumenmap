"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { PERIOD_OPTIONS } from "@/lib/periods";
import {
  SEARCH_INPUT_SELECTOR,
  SHORTCUT_GROUPS,
  SHORTCUT_KEYS,
  formatKeyToken,
  isEditableTarget,
} from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const KBD_CLASS =
  "rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] leading-4 text-zinc-200";

function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {keys.map((key) => (
        <kbd key={key} className={cn(KBD_CLASS, "min-w-6 text-center")}>
          {formatKeyToken(key)}
        </kbd>
      ))}
    </span>
  );
}

/**
 * Global dashboard shortcut listener plus the `?` help overlay.
 *
 * Rendered once from `DashboardContent`, so every shortcut it documents
 * applies while the dashboard is on screen.
 */
export function KeyboardShortcuts() {
  const { period, setPeriod, selectedNode, setSelectedNode } = useDashboard();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const dialogId = useId();

  // Global shortcuts. Widgets with their own handlers keep priority:
  // events that already called preventDefault, and events typed in text
  // fields, are ignored here.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }

      if (open) {
        if (
          event.key === SHORTCUT_KEYS.help ||
          event.key === SHORTCUT_KEYS.escape
        ) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      }

      switch (event.key) {
        case SHORTCUT_KEYS.help:
          event.preventDefault();
          setOpen(true);
          return;
        case SHORTCUT_KEYS.focusSearch: {
          event.preventDefault();
          const input =
            document.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR);
          input?.focus();
          input?.select();
          return;
        }
        case SHORTCUT_KEYS.previousPeriod:
        case SHORTCUT_KEYS.nextPeriod: {
          event.preventDefault();
          const currentIndex = PERIOD_OPTIONS.findIndex(
            (option) => option.value === period,
          );
          if (currentIndex < 0) {
            return;
          }
          const delta =
            event.key === SHORTCUT_KEYS.nextPeriod ? 1 : -1;
          const nextIndex =
            (currentIndex + delta + PERIOD_OPTIONS.length) %
            PERIOD_OPTIONS.length;
          setPeriod(PERIOD_OPTIONS[nextIndex].value);
          return;
        }
        case SHORTCUT_KEYS.escape:
          if (selectedNode) {
            event.preventDefault();
            setSelectedNode(null);
          }
          return;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, period, selectedNode, setPeriod, setSelectedNode]);

  // Focus trap, scroll lock, and focus restore for the open overlay.
  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") {
        return;
      }
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const index =
        active instanceof HTMLElement ? focusables.indexOf(active) : -1;

      if (index === -1) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && index === 0) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && index === focusables.length - 1) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Restore focus only if nothing else has claimed it (e.g. a click
      // that landed on another control while the dialog was closing).
      const active = document.activeElement;
      const focusIsClaimed =
        active != null &&
        active.isConnected &&
        active !== document.body &&
        active !== document.documentElement;
      if (previouslyFocused && !focusIsClaimed) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Keyboard shortcuts"
        aria-keyshortcuts={SHORTCUT_KEYS.help}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        title="Keyboard shortcuts (?)"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80 text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stellar"
      >
        <Keyboard className="h-4 w-4" aria-hidden="true" />
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setOpen(false);
                }
              }}
            >
              <div
                ref={dialogRef}
                id={dialogId}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/50 focus:outline-none"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <h2
                      id={titleId}
                      className="text-base font-semibold text-white"
                    >
                      Keyboard shortcuts
                    </h2>
                    <p
                      id={descriptionId}
                      className="text-xs leading-relaxed text-zinc-400"
                    >
                      Use <kbd className={KBD_CLASS}>Tab</kbd> and{" "}
                      <kbd className={KBD_CLASS}>Shift+Tab</kbd> to move
                      between actions, and <kbd className={KBD_CLASS}>Esc</kbd>{" "}
                      to close this dialog.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                    className="shrink-0"
                  >
                    Close
                  </Button>
                </div>

                <div className="mt-5 space-y-5">
                  {SHORTCUT_GROUPS.map((group, index) => (
                    <section
                      key={group.id}
                      aria-labelledby={`${titleId}-${group.id}`}
                      className={cn(
                        "space-y-2",
                        index > 0 && "border-t border-white/5 pt-5",
                      )}
                    >
                      <h3
                        id={`${titleId}-${group.id}`}
                        className="text-xs font-semibold uppercase tracking-wider text-zinc-500"
                      >
                        {group.title}
                      </h3>
                      <ul className="space-y-1.5">
                        {group.shortcuts.map((shortcut) => (
                          <li
                            key={`${group.id}-${shortcut.label}`}
                            className="flex items-start justify-between gap-4 rounded-md px-1 py-1"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm text-zinc-200">
                                {shortcut.label}
                              </span>
                              {shortcut.context ? (
                                <span className="block text-xs text-zinc-500">
                                  {shortcut.context}
                                </span>
                              ) : null}
                            </span>
                            <ShortcutKeys keys={shortcut.keys} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
