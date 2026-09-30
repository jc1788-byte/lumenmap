"use client";

import { useState } from "react";
import type { EgoGraph } from "@/lib/flow-ego";
import { truncateAddress } from "@/lib/utils";

export interface FlowEgoViewProps {
  /** Account the ego graph is centered on. */
  accountId: string;
  accountLabel: string;
  /** Precomputed ego graph; empty counterparties render the empty state. */
  graph: EgoGraph;
}

/**
 * Flow ego view (issue #311).
 *
 * Bubblemaps-style handoff target for search selection: centers one
 * account/contract and lists its direct counterparties aggregated from
 * payment edges. The list is a keyboard-navigable listbox; with no edges
 * the view still opens on the selected account with an explicit empty
 * state rather than a blank screen.
 */
export function FlowEgoView({ accountId, accountLabel, graph }: FlowEgoViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section data-testid="flow-view" aria-label={`Flow ego view for ${accountLabel}`}>
      <header className="mb-4">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Flow ego view
        </p>
        <h2 className="text-xl font-semibold text-white">{accountLabel}</h2>
        <p className="font-mono text-xs text-zinc-400">{truncateAddress(accountId)}</p>
      </header>

      {graph.counterparties.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No counterparties found for this account yet. Edges appear here once
          payment flows involving it are indexed.
        </p>
      ) : (
        <ul
          role="listbox"
          aria-label="Counterparties"
          className="flex flex-col gap-2"
        >
          {graph.counterparties.map((counterparty) => (
            <li
              key={counterparty.id}
              role="option"
              tabIndex={0}
              aria-selected={activeId === counterparty.id}
              onClick={() => setActiveId(counterparty.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveId(counterparty.id);
                }
              }}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stellar"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-white">{counterparty.label}</span>
                <span className="font-mono text-xs text-zinc-400">
                  {counterparty.operationCount} ops
                </span>
              </div>
              <div className="mt-1 font-mono text-xs text-zinc-500">
                in {counterparty.inflow.toString()} · out {counterparty.outflow.toString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
