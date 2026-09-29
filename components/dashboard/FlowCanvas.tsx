"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useReducedMotion, truncateAddress, cn } from "@/lib/utils";
import type { FlowNode, FlowEdge } from "@/lib/flow/types";
import type { FlowTableNode, FlowTableEdge } from "./FlowDataTable";

export interface FlowCanvasProps {
  nodes: readonly (FlowNode | FlowTableNode)[];
  edges: readonly (FlowEdge | FlowTableEdge)[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
  showParallelList?: boolean;
  showProtocolClusters?: boolean;
  onToggleProtocolClusters?: (enabled: boolean) => void;
}

interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

function getNodeCategoryColor(category?: string): string {
  switch (category?.toLowerCase()) {
    case "soroban":
      return "#8b5cf6"; // var(--color-soroban)
    case "payments":
    case "exchange":
      return "#10b981"; // var(--color-payments)
    case "dex":
    case "defi":
      return "#f59e0b"; // var(--color-dex)
    case "trustlines":
    case "anchor":
      return "#06b6d4"; // var(--color-trustlines)
    case "account":
    case "wallet":
      return "#3b82f6"; // var(--color-account)
    default:
      return "#71717a"; // var(--color-other)
  }
}

export interface ProtocolCluster {
  protocol: string;
  color: string;
  nodes: (FlowNode | FlowTableNode)[];
  hullPath: string;
  badgeX: number;
  badgeY: number;
  badgeWidth: number;
}

const PROTOCOL_COLORS: Record<string, string> = {
  circle: "#0ea5e9", // Sky / Circle cyan
  soroswap: "#a855f7", // Soroswap purple
  kraken: "#f59e0b", // Amber
  lobstr: "#3b82f6", // Blue
  moneygram: "#10b981", // Emerald
};

export function getProtocolColor(protocol: string): string {
  const key = protocol.toLowerCase().trim();
  if (PROTOCOL_COLORS[key]) return PROTOCOL_COLORS[key];
  for (const [k, color] of Object.entries(PROTOCOL_COLORS)) {
    if (key.includes(k)) return color;
  }
  const palette = ["#ec4899", "#6366f1", "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4"];
  let hash = 0;
  for (let i = 0; i < protocol.length; i++) {
    hash = (hash << 5) - hash + protocol.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Computes bounding visual hulls for nodes grouped by known protocol.
 * Unknown or unclassified nodes (without protocol) are strictly ignored and remain ungrouped.
 */
export function computeProtocolClusters(
  nodes: readonly (FlowNode | FlowTableNode)[],
  positions: Map<string, NodePosition>,
): ProtocolCluster[] {
  const groups = new Map<string, (FlowNode | FlowTableNode)[]>();

  for (const node of nodes) {
    const proto = node.protocol?.trim();
    if (!proto || proto.toLowerCase().startsWith("unknown")) continue;
    const existing = groups.get(proto);
    if (existing) {
      existing.push(node);
    } else {
      groups.set(proto, [node]);
    }
  }

  const clusters: ProtocolCluster[] = [];

  for (const [protocol, groupNodes] of groups.entries()) {
    const points: { x: number; y: number; r: number }[] = [];
    for (const node of groupNodes) {
      const pos = positions.get(node.id);
      if (pos) {
        points.push({ x: pos.x, y: pos.y, r: pos.radius });
      }
    }
    if (points.length === 0) continue;

    const color = getProtocolColor(protocol);
    const pad = 26;

    let hullPath = "";
    let badgeX = 0;
    let badgeY = 0;

    if (points.length === 1) {
      const p = points[0];
      const r = p.r + pad;
      hullPath = `M ${p.x - r} ${p.y} A ${r} ${r} 0 1 0 ${p.x + r} ${p.y} A ${r} ${r} 0 1 0 ${p.x - r} ${p.y} Z`;
      badgeX = p.x;
      badgeY = p.y - r - 12;
    } else if (points.length === 2) {
      const p1 = points[0];
      const p2 = points[1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 1) {
        const r = p1.r + pad;
        hullPath = `M ${p1.x - r} ${p1.y} A ${r} ${r} 0 1 0 ${p1.x + r} ${p1.y} A ${r} ${r} 0 1 0 ${p1.x - r} ${p1.y} Z`;
        badgeX = p1.x;
        badgeY = p1.y - r - 12;
      } else {
        const r1 = p1.r + pad;
        const r2 = p2.r + pad;
        const nx = -dy / dist;
        const ny = dx / dist;

        // Tangent points connecting the two circular nodes (stadium shape)
        hullPath = [
          `M ${p1.x + nx * r1} ${p1.y + ny * r1}`,
          `L ${p2.x + nx * r2} ${p2.y + ny * r2}`,
          `A ${r2} ${r2} 0 0 1 ${p2.x - nx * r2} ${p2.y - ny * r2}`,
          `L ${p1.x - nx * r1} ${p1.y - ny * r1}`,
          `A ${r1} ${r1} 0 0 1 ${p1.x + nx * r1} ${p1.y + ny * r1}`,
          "Z",
        ].join(" ");

        badgeX = (p1.x + p2.x) / 2;
        badgeY = Math.min(p1.y - r1, p2.y - r2) - 12;
      }
    } else {
      // 3 or more points: calculate 2D convex hull + radial padding
      const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
      const cross = (
        o: { x: number; y: number },
        a: { x: number; y: number },
        b: { x: number; y: number },
      ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

      const lower: { x: number; y: number }[] = [];
      for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
          lower.pop();
        }
        lower.push(p);
      }

      const upper: { x: number; y: number }[] = [];
      for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
          upper.pop();
        }
        upper.push(p);
      }

      lower.pop();
      upper.pop();
      const hull = [...lower, ...upper];

      // Centroid
      let sumX = 0;
      let sumY = 0;
      let minY = Infinity;
      for (const p of points) {
        sumX += p.x;
        sumY += p.y;
        if (p.y - p.r < minY) minY = p.y - p.r;
      }
      const cx = sumX / points.length;
      const cy = sumY / points.length;

      // Expand hull vertices radially from centroid
      const expanded = hull.map((p) => {
        const vx = p.x - cx;
        const vy = p.y - cy;
        const d = Math.hypot(vx, vy) || 1;
        return {
          x: p.x + (vx / d) * pad,
          y: p.y + (vy / d) * pad,
        };
      });

      // Smooth path with quadratic beziers
      const pathParts: string[] = [];
      const m = expanded.length;
      for (let i = 0; i < m; i++) {
        const curr = expanded[i];
        const next = expanded[(i + 1) % m];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        if (i === 0) {
          pathParts.push(`M ${midX} ${midY}`);
        } else {
          pathParts.push(`Q ${curr.x} ${curr.y}, ${midX} ${midY}`);
        }
      }
      const first = expanded[0];
      pathParts.push(`Q ${first.x} ${first.y}, ${(first.x + expanded[1 % m].x) / 2} ${(first.y + expanded[1 % m].y) / 2}`);
      pathParts.push("Z");
      hullPath = pathParts.join(" ");

      badgeX = cx;
      badgeY = minY - pad - 12;
    }

    const badgeWidth = Math.max(90, (protocol.length + 5) * 8 + 24);

    clusters.push({
      protocol,
      color,
      nodes: groupNodes,
      hullPath,
      badgeX,
      badgeY,
      badgeWidth,
    });
  }

  return clusters;
}

/**
 * Computes deterministic settled node positions using a synchronous relaxation loop.
 * When prefers-reduced-motion is true, this function produces settled positions
 * without running any animation frames or creating force simulation jitter.
 */
function computeStaticLayout(
  nodes: readonly (FlowNode | FlowTableNode)[],
  edges: readonly (FlowEdge | FlowTableEdge)[],
  width: number,
  height: number,
  iterations = 70,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const n = nodes.length;
  if (n === 0) return positions;

  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);
  const ringRadius = minDim * 0.32;

  // Initialize nodes evenly spaced on an ellipse
  nodes.forEach((node, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const baseRadius = 24;
    positions.set(node.id, {
      x: cx + ringRadius * Math.cos(angle),
      y: cy + ringRadius * Math.sin(angle),
      vx: 0,
      vy: 0,
      radius: baseRadius,
    });
  });

  // Run relaxation iterations synchronously
  for (let step = 0; step < iterations; step++) {
    const alpha = Math.pow(0.94, step);

    // 1. Center gravity
    for (const [, p] of positions) {
      p.vx += (cx - p.x) * 0.035 * alpha;
      p.vy += (cy - p.y) * 0.035 * alpha;
    }

    // 2. Node-node repulsion
    const arr = Array.from(positions.entries());
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const [, p1] = arr[i];
        const [, p2] = arr[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const minDist = p1.radius + p2.radius + 30;

        if (dist < 320) {
          const strength = dist < minDist ? 4500 : 2500;
          const force = (strength / (distSq + 100)) * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          p1.vx += fx;
          p1.vy += fy;
          p2.vx -= fx;
          p2.vy -= fy;
        }
      }
    }

    // 3. Edge attraction (Hooke's spring)
    for (const edge of edges) {
      const p1 = positions.get(edge.source);
      const p2 = positions.get(edge.destination);
      if (!p1 || !p2) continue;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = 130;
      const force = (dist - targetDist) * 0.045 * alpha;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      p1.vx += fx;
      p1.vy += fy;
      p2.vx -= fx;
      p2.vy -= fy;
    }

    // 4. Position update & clamping
    for (const [, p] of positions) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.65;
      p.vy *= 0.65;

      const pad = p.radius + 24;
      p.x = Math.max(pad, Math.min(width - pad, p.x));
      p.y = Math.max(pad, Math.min(height - pad, p.y));
    }
  }

  return positions;
}

export function FlowCanvas({
  nodes,
  edges,
  selectedId = null,
  onSelect,
  width = 800,
  height = 500,
  className,
  showParallelList = true,
  showProtocolClusters,
  onToggleProtocolClusters,
}: FlowCanvasProps) {
  const containerId = useId();
  const prefersReducedMotion = useReducedMotion();
  const [manualPause, setManualPause] = useState(false);
  const isReducedMotion = prefersReducedMotion || manualPause;

  const [internalShowClusters, setInternalShowClusters] = useState(true);
  const isClustersVisible = showProtocolClusters ?? internalShowClusters;
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);

  const staticPositions = useMemo(
    () => computeStaticLayout(nodes, edges, width, height),
    [nodes, edges, width, height],
  );

  const [animatedPositions, setAnimatedPositions] = useState<Map<string, NodePosition> | null>(null);

  const positions = isReducedMotion ? staticPositions : (animatedPositions ?? staticPositions);

  const protocolClusters = useMemo(
    () => computeProtocolClusters(nodes, positions),
    [nodes, positions],
  );

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const nodeRefs = useRef<Map<string, SVGGElement | null>>(new Map());

  // Incident edges of the active node (either focused or selected or hovered)
  const activeNodeId = focusedId ?? selectedId ?? hoveredId;

  const incidentEdges = useMemo(() => {
    if (!activeNodeId) return { incoming: new Set<string>(), outgoing: new Set<string>() };
    const incoming = new Set<string>();
    const outgoing = new Set<string>();
    for (const edge of edges) {
      if (edge.source === activeNodeId) outgoing.add(edge.id);
      if (edge.destination === activeNodeId) incoming.add(edge.id);
    }
    return { incoming, outgoing };
  }, [edges, activeNodeId]);

  // Layout synchronization:
  // When reduced-motion is preferred, calculate static settled layout immediately with 0 animation frames.
  // When normal motion is preferred, run bounded simulation that settles and stops within ~35 frames.
  useEffect(() => {
    if (nodes.length === 0 || isReducedMotion) return;

    // Normal motion: initial positions then bounded relaxation
    let animationFrameId: number;
    let step = 0;
    const maxSteps = 40; // Strictly bounded: no continuous simulation jitter

    const currentPositions = new Map<string, NodePosition>(
      computeStaticLayout(nodes, edges, width, height, 15),
    );

    const tick = () => {
      if (step >= maxSteps) return;

      const alpha = Math.pow(0.92, step);
      const cx = width / 2;
      const cy = height / 2;

      // Gravity
      for (const [, p] of currentPositions) {
        p.vx += (cx - p.x) * 0.03 * alpha;
        p.vy += (cy - p.y) * 0.03 * alpha;
      }

      // Repulsion
      const arr = Array.from(currentPositions.entries());
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const [, p1] = arr[i];
          const [, p2] = arr[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 1;
          if (dist < 300) {
            const force = (2800 / (distSq + 100)) * alpha;
            p1.vx += (dx / dist) * force;
            p1.vy += (dy / dist) * force;
            p2.vx -= (dx / dist) * force;
            p2.vy -= (dy / dist) * force;
          }
        }
      }

      // Springs
      for (const edge of edges) {
        const p1 = currentPositions.get(edge.source);
        const p2 = currentPositions.get(edge.destination);
        if (!p1 || !p2) continue;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 130) * 0.04 * alpha;
        p1.vx += (dx / dist) * force;
        p1.vy += (dy / dist) * force;
        p2.vx -= (dx / dist) * force;
        p2.vy -= (dy / dist) * force;
      }

      // Update positions
      for (const [, p] of currentPositions) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.65;
        p.vy *= 0.65;
        const pad = p.radius + 24;
        p.x = Math.max(pad, Math.min(width - pad, p.x));
        p.y = Math.max(pad, Math.min(height - pad, p.y));
      }

      setAnimatedPositions(new Map(currentPositions));
      step++;
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, edges, width, height, isReducedMotion]);

  // Keyboard navigation across nodes
  const focusNodeByIndex = useCallback(
    (index: number) => {
      const targetNode = nodes[index];
      if (!targetNode) return;
      const el = nodeRefs.current.get(targetNode.id);
      if (el) {
        el.focus();
        setFocusedId(targetNode.id);
        setAnnouncement(
          `Focused ${targetNode.label} (${truncateAddress(targetNode.id)}), node ${index + 1} of ${nodes.length}. Press Enter or Space to view details.`,
        );
      }
    },
    [nodes],
  );

  const handleNodeKeyDown = useCallback(
    (event: KeyboardEvent<SVGGElement>, nodeId: string, index: number) => {
      const node = nodes[index];
      if (!node) return;

      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          onSelect?.(selectedId === nodeId ? null : nodeId);
          setAnnouncement(
            selectedId === nodeId
              ? "Selection cleared."
              : `Selected ${node.label} (${truncateAddress(node.id)}). Detail panel updated.`,
          );
          break;

        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          focusNodeByIndex((index + 1) % nodes.length);
          break;

        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          focusNodeByIndex((index - 1 + nodes.length) % nodes.length);
          break;

        case "Home":
          event.preventDefault();
          focusNodeByIndex(0);
          break;

        case "End":
          event.preventDefault();
          focusNodeByIndex(nodes.length - 1);
          break;

        case "Escape":
          event.preventDefault();
          onSelect?.(null);
          setAnnouncement("Selection cleared.");
          break;
      }
    },
    [nodes, selectedId, onSelect, focusNodeByIndex],
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      onSelect?.(selectedId === nodeId ? null : nodeId);
      if (node) {
        setAnnouncement(
          selectedId === nodeId
            ? "Selection cleared."
            : `Selected ${node.label}. Detail panel updated.`,
        );
      }
    },
    [nodes, selectedId, onSelect],
  );

  const arrowMarkerId = `flow-arrow-${containerId}`;
  const arrowMarkerHighlightId = `flow-arrow-highlight-${containerId}`;
  const arrowMarkerIncomingId = `flow-arrow-incoming-${containerId}`;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Screen reader live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="flow-canvas-announcement"
      >
        {announcement}
      </div>

      {/* Canvas toolbar with accessibility controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-300">Keyboard shortcuts:</span>
          <span>Tab/Arrows to navigate · Enter/Space to select · Esc to clear</span>
        </div>
        <div className="flex items-center gap-2">
          {protocolClusters.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const next = !isClustersVisible;
                setInternalShowClusters(next);
                onToggleProtocolClusters?.(next);
              }}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-stellar-light",
                isClustersVisible
                  ? "border border-stellar-light/40 bg-stellar-light/10 text-stellar-light"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white",
              )}
              aria-pressed={isClustersVisible}
              data-testid="flow-clusters-toggle"
            >
              {isClustersVisible ? "Protocol clusters: on" : "Protocol clusters: off"}
            </button>
          )}
          {isReducedMotion && (
            <span
              data-testid="reduced-motion-badge"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Reduced motion active (jitter disabled)
            </span>
          )}
          <button
            type="button"
            onClick={() => setManualPause((p) => !p)}
            className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-stellar-light"
            aria-pressed={isReducedMotion}
          >
            {isReducedMotion ? "Resume layout animation" : "Pause layout animation"}
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/30 p-2">
        <svg
          data-testid="flow-canvas"
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none"
          role="region"
          aria-label="Payment flow graph. Use Tab or Arrow keys to focus nodes and Enter to activate detail."
        >
          <style>{`
            g[tabindex]:focus-visible { outline: none; }
            g[tabindex]:focus-visible .flow-focus-ring { display: block !important; }
            .flow-focus-ring { display: none; }
            ${isReducedMotion ? "* { transition: none !important; animation: none !important; }" : ""}
          `}</style>

          <defs>
            {/* Standard arrow marker */}
            <marker
              id={arrowMarkerId}
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#71717a" opacity="0.8" />
            </marker>
            {/* Outgoing highlight arrow marker */}
            <marker
              id={arrowMarkerHighlightId}
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            {/* Incoming highlight arrow marker */}
            <marker
              id={arrowMarkerIncomingId}
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#a78bfa" />
            </marker>
          </defs>

          {/* Render directed edges */}
          <g aria-hidden="true" className="flow-edges-layer">
            {edges.map((edge) => {
              const p1 = positions.get(edge.source);
              const p2 = positions.get(edge.destination);
              if (!p1 || !p2) return null;

              const isOutgoing = incidentEdges.outgoing.has(edge.id);
              const isIncoming = incidentEdges.incoming.has(edge.id);
              const isHighlighted = isOutgoing || isIncoming;
              const isDimmed = activeNodeId !== null && !isHighlighted;

              // Calculate curved path midpoint
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              // Subtle curve offset
              const normalX = -dy * 0.12;
              const normalY = dx * 0.12;
              const ctrlX = midX + normalX;
              const ctrlY = midY + normalY;

              const strokeColor = isOutgoing
                ? "#38bdf8"
                : isIncoming
                  ? "#a78bfa"
                  : "#52525b";

              const marker = isOutgoing
                ? `url(#${arrowMarkerHighlightId})`
                : isIncoming
                  ? `url(#${arrowMarkerIncomingId})`
                  : `url(#${arrowMarkerId})`;

              return (
                <g key={edge.id} opacity={isDimmed ? 0.18 : 1}>
                  <path
                    d={`M ${p1.x} ${p1.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isHighlighted ? 2.5 : 1.25}
                    markerEnd={marker}
                    className="transition-colors duration-150"
                  />
                </g>
              );
            })}
          </g>

          {/* Render protocol cluster grouping overlay */}
          {isClustersVisible && protocolClusters.length > 0 && (
            <g
              aria-label="Protocol clusters overlay"
              className="flow-protocol-clusters-layer"
              data-testid="protocol-clusters-overlay"
            >
              {protocolClusters.map((cluster) => {
                const isHovered = hoveredCluster === cluster.protocol;
                const isSelectedCluster = cluster.nodes.some(
                  (n) => n.id === activeNodeId,
                );

                return (
                  <g
                    key={cluster.protocol}
                    data-testid={`protocol-cluster-${cluster.protocol.toLowerCase().replace(/\s+/g, "-")}`}
                    className="transition-opacity duration-200"
                  >
                    {/* Visual grouping hull highlight */}
                    <path
                      d={cluster.hullPath}
                      fill={cluster.color}
                      fillOpacity={isHovered || isSelectedCluster ? 0.22 : 0.12}
                      stroke={cluster.color}
                      strokeWidth={isHovered || isSelectedCluster ? 2 : 1.5}
                      strokeDasharray="5 3"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredCluster(cluster.protocol)}
                      onMouseLeave={() => setHoveredCluster(null)}
                    />

                    {/* Protocol Cluster Label Badge Pill */}
                    <g
                      transform={`translate(${cluster.badgeX}, ${cluster.badgeY})`}
                      className="pointer-events-none select-none"
                    >
                      <rect
                        x={-cluster.badgeWidth / 2}
                        y={-10}
                        width={cluster.badgeWidth}
                        height={20}
                        rx={10}
                        fill="#18181b"
                        stroke={cluster.color}
                        strokeWidth={1}
                        fillOpacity={0.92}
                      />
                      <circle
                        cx={-cluster.badgeWidth / 2 + 10}
                        cy={0}
                        r={3.5}
                        fill={cluster.color}
                      />
                      <text
                        x={4}
                        y={0.5}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize={10.5}
                        fontWeight={600}
                        className="font-sans"
                      >
                        {cluster.protocol} ({cluster.nodes.length})
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Render focusable node targets */}
          <g className="flow-nodes-layer">
            {nodes.map((node, index) => {
              const pos = positions.get(node.id);
              if (!pos) return null;

              const isSelected = selectedId === node.id;
              const isFocused = focusedId === node.id;
              const isHovered = hoveredId === node.id;
              const isIncident =
                activeNodeId !== null &&
                activeNodeId !== node.id &&
                (incidentEdges.incoming.has(node.id) ||
                  incidentEdges.outgoing.has(node.id) ||
                  edges.some(
                    (e) =>
                      (e.source === activeNodeId && e.destination === node.id) ||
                      (e.destination === activeNodeId && e.source === node.id),
                  ));

              const categoryColor = getNodeCategoryColor(node.category);
              const r = pos.radius;

              return (
                <g
                  key={node.id}
                  id={`node-${node.id}`}
                  data-testid={`flow-node-${node.id}`}
                  ref={(el) => {
                    nodeRefs.current.set(node.id, el);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`Node ${node.label} (${truncateAddress(node.id)}), category ${node.category ?? "unclassified"}. ${isSelected ? "Selected." : ""}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => handleNodeClick(node.id)}
                  onFocus={() => {
                    setFocusedId(node.id);
                    setAnnouncement(
                      `Focused ${node.label} (${truncateAddress(node.id)}). Press Enter to view details.`,
                    );
                  }}
                  onBlur={() => setFocusedId(null)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onKeyDown={(e) => handleNodeKeyDown(e, node.id, index)}
                  className="cursor-pointer focus:outline-none focus-visible:outline-none"
                  style={{
                    transition: isReducedMotion ? "none" : "transform 0.15s ease",
                  }}
                >
                  {/* High contrast visible focus indicator (exceeds WCAG 2.1 AA 3:1 ratio) */}
                  <circle
                    className="flow-focus-ring"
                    r={r + 6}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2.5}
                    style={{
                      display: isFocused || isSelected ? "block" : undefined,
                      filter: "drop-shadow(0 0 5px rgba(255, 255, 255, 0.85))",
                    }}
                  />

                  {/* Dark gap separator for outer ring visibility against light nodes */}
                  {(isFocused || isSelected) && (
                    <circle
                      r={r + 3}
                      fill="none"
                      stroke="#0B0E14"
                      strokeWidth={2}
                    />
                  )}

                  {/* Selection indicator ring */}
                  {isSelected && !isFocused && (
                    <circle
                      r={r + 5}
                      fill="none"
                      stroke="var(--color-focus, #8e7cff)"
                      strokeWidth={2}
                    />
                  )}

                  {/* Node base circle */}
                  <circle
                    r={r}
                    fill={categoryColor}
                    stroke={isSelected || isFocused ? "#ffffff" : isHovered ? "#d4d4d8" : "#18181b"}
                    strokeWidth={isSelected || isFocused ? 2.5 : 1.5}
                    opacity={isSelected || isFocused || isHovered || isIncident || !activeNodeId ? 1 : 0.4}
                    className="transition-opacity duration-150"
                  />

                  {/* Protocol cluster halo ring */}
                  {isClustersVisible && node.protocol && (
                    <circle
                      r={r + 3}
                      fill="none"
                      stroke={getProtocolColor(node.protocol)}
                      strokeWidth={1.5}
                      strokeOpacity={0.8}
                      className="pointer-events-none"
                    />
                  )}

                  {/* Category icon or letter badge inside node */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize={11}
                    fontWeight={600}
                    className="pointer-events-none select-none font-sans"
                  >
                    {(node.category || node.label).slice(0, 3).toUpperCase()}
                  </text>

                  {/* Node text label below bubble */}
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    fill={isSelected || isFocused ? "#ffffff" : "#a1a1aa"}
                    fontSize={11}
                    fontWeight={isSelected || isFocused ? 600 : 400}
                    className="pointer-events-none select-none font-mono tracking-tight"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Parallel list navigation: mirrors selection and provides a linear keyboard alternative */}
      {showParallelList && nodes.length > 0 && (
        <div
          role="region"
          aria-label="Cluster accounts parallel navigation"
          className="rounded-xl border border-white/5 bg-black/20 p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Cluster Accounts ({nodes.length})
            </h3>
            <span className="text-xs text-zinc-500">
              Select any account to view in canvas and detail panel
            </span>
          </div>

          <div
            role="listbox"
            aria-label="Cluster accounts list"
            className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 md:grid-cols-3"
          >
            {nodes.map((node) => {
              const isSelected = selectedId === node.id;
              const isFocused = focusedId === node.id;
              const categoryColor = getNodeCategoryColor(node.category);

              return (
                <div
                  key={node.id}
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => handleNodeClick(node.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNodeClick(node.id);
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-xs transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stellar-light",
                    isSelected && "border-stellar-light/40 bg-white/10 text-white",
                    isFocused && "ring-1 ring-white",
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColor }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium text-zinc-200">
                      {node.label}
                    </span>
                    {node.protocol && (
                      <span
                        className="shrink-0 rounded px-1.5 py-0.2 text-[9px] font-medium uppercase tracking-wider"
                        style={{
                          color: getProtocolColor(node.protocol),
                          backgroundColor: `${getProtocolColor(node.protocol)}20`,
                        }}
                      >
                        {node.protocol}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-zinc-500">
                    {truncateAddress(node.id)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
