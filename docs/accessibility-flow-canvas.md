# Flow Canvas Accessibility & Reduced Motion (Issue #294)

This document details the accessibility architecture, keyboard interaction model, reduced motion handling, and residual limitations for the LumenMap Flow Canvas (`FlowCanvas.tsx` and `FlowView.tsx`).

---

## 1. Overview & Objectives

Graph visualizations often present severe accessibility barriers for keyboard-only navigators, screen reader users, and individuals with vestibular motion sensitivities. Issue #294 addresses these challenges by providing:

1. **Full Keyboard Operability**: Complete keyboard control over node focus, navigation, selection, and detail panel activation.
2. **Visible Focus Treatment**: WCAG 2.1 AA compliant high-contrast indicators that clearly differentiate focused, selected, and connected nodes.
3. **Vestibular-Safe Layout**: Zero continuous force simulation jitter when `prefers-reduced-motion: reduce` is enabled, paired with an explicit manual pause toggle.
4. **Parallel List & Table Navigation**: A companion listbox navigation and tabular data view (`FlowDataTable`) that mirror selection state and provide structured access to graph data.

---

## 2. Keyboard Navigation Model

### Key Bindings

| Key | Context | Action |
| --- | --- | --- |
| `Tab` / `Shift+Tab` | Canvas toolbar & nodes | Moves linear focus between interactive elements (toolbar buttons, nodes, parallel list). |
| `ArrowRight` / `ArrowDown` | Focused node | Advances focus to the next node in the graph sequence. |
| `ArrowLeft` / `ArrowUp` | Focused node | Moves focus to the previous node in the graph sequence. |
| `Home` | Focused node | Moves focus directly to the first node. |
| `End` | Focused node | Moves focus directly to the last node. |
| `Enter` / `Space` | Focused node | Toggles selection of the node and activates the global `DetailPanel`. |
| `Escape` | Focused node or canvas | Clears the active node selection and closes detail view. |

### Focus Management & Restoration

- **Node Targets**: Each node is rendered as an accessible SVG group element (`<g>`) with `role="button"`, `tabIndex={0}`, `id="node-${node.id}"`, and explicit `aria-label` describing the account label, truncated address, category, and selection state.
- **Focus Restoration**: When the `DetailPanel` closes, it restores keyboard focus to `document.getElementById('node-' + nodeId)`. Because the canvas nodes use matching IDs, closing the detail panel returns keyboard focus seamlessly to the triggering node.
- **Polite Live Announcements**: An `aria-live="polite"` region (`flow-canvas-announcement`) announces node focus (`"Focused Alpha Exchange (GAAA…), node 1 of 4. Press Enter or Space to view details."`) and selection state changes without interrupting user navigation.

---

## 3. Visible Focus Treatments (WCAG 2.1 AA)

- **High-Contrast Focus Rings**: Focused and selected nodes display an outer highlight ring (`stroke="#ffffff"`, `strokeWidth={2.5}`) with drop-shadow glow filter (`feDropShadow`) guaranteeing greater than 3:1 contrast against the dark background.
- **Incident Flow Highlighting**: When a node receives focus (or is selected/hovered), all incident directed edges (inbound and outbound) are highlighted in stellar cyan (`#00e5ff`) with enlarged arrowheads (`marker-end`), allowing keyboard users to visually trace value movements without relying on a mouse.
- **Dimming Inactive Elements**: Non-incident edges and non-connected nodes are dimmed to `opacity="0.15"`, ensuring immediate visual clarity for the active counterparty subgraph.

---

## 4. Reduced Motion & Vestibular Safety

### Zero Continuous Force Simulation Jitter

- **Automated Detection**: The canvas listens to system motion preferences via the `useReducedMotion()` hook (`window.matchMedia("(prefers-reduced-motion: reduce)")`).
- **Static Deterministic Layout**: When reduced motion is active, the force-directed simulation loop is completely bypassed. Positions are derived instantly from a deterministic static radial layout with zero animation frames and no `requestAnimationFrame` loop, eliminating all layout jitter.
- **Header Status Badge**: An emerald badge (`Reduced motion active`) appears in the Flow view header when system reduced motion is active.

### Manual Animation Pause Toggle

- Users can independently freeze or resume layout animations using the `Pause layout animation` toggle button located in the canvas toolbar.
- The button state is exposed to assistive technology via `aria-pressed`.

---

## 5. Parallel List & Tabular Alternatives

To support users who prefer sequential text navigation over 2D canvas traversal:

1. **Parallel Listbox**: A companion listbox (`role="listbox"`, `aria-label="Accounts in payment flow"`) is rendered alongside the canvas. Each account option mirrors canvas selection; focusing or clicking an option synchronizes the canvas highlight and updates the `DetailPanel`.
2. **Tabular View (`FlowDataTable`)**: The view mode toggle (`FlowViewToggle`) allows switching seamlessly between **Graph** mode and **Table** mode. The tabular view provides sortable, accessible HTML table rows for all accounts and directed payment flows with complete asset and volume breakdowns (Issue #340).

---

## 6. Residual Limitations & Mitigations

| Limitation | Impact | Mitigation / Alternative |
| --- | --- | --- |
| **Dense Edge Clutter** | In large networks, overlapping edge paths can be difficult to interpret visually. | Use the **Table** view toggle (`FlowDataTable`) for structured, sortable, un-cluttered tabular data. |
| **Individual Edge Traversal on Canvas** | Individual SVG edge paths are not individually focusable via `Tab` to prevent cognitive and keyboard navigation overload (e.g., tabbing through 50+ lines). | Focus a node to automatically highlight and announce all its incident flows; use the **Table** view to inspect every edge row individually with full keyboard focus. |
| **Zoom & Pan Keyboard Controls** | Canvas currently relies on responsive SVG `viewBox` scaling rather than multi-level keyboard zoom controls. | The SVG canvas scales to container width; browser-native zoom (`Ctrl +` / `Ctrl -`) is fully supported without layout breakage. |

---

## 7. Verification & Testing

- **Unit & Integration Tests**:
  - `components/dashboard/FlowCanvas.test.tsx`: 7 tests verifying SVG focus targets, arrow navigation, Enter/Space selection, Escape clearing, visible focus rings, listbox synchronization, and reduced motion toggling.
  - `components/dashboard/FlowView.test.tsx`: 5 tests verifying graph/table toggling, `initialViewMode`, and `setSelectedNode` wiring to `DashboardProvider`.
- **Automated Checks**:
  - `npm run typecheck`: 0 TypeScript errors.
  - `npm run lint`: 0 ESLint errors.
  - `npm test`: 278 passing tests.
  - `npm run test:unit`: 20 passing unit tests.
