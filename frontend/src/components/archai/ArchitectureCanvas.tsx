"use client";

import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  addEdge,
  Background,
  type Connection,
  type Edge,
  MarkerType,
  type Node,
  useEdgesState,
  useNodesState,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import ArchitectureNode from "./ArchitectureNode";
import type { ArchEdge, ArchNode } from "./types";

interface ArchitectureCanvasProps {
  nodes: ArchNode[];
  edges: ArchEdge[];
  onSelectNode?: (node: Node | null) => void;
  revealMeta?: boolean;
  onCanvasReady?: (instance: ReactFlowInstance) => void;
  guidedMode?: boolean;
  focusNodeId?: string | null;
}

const nodeTypes = { component: ArchitectureNode };
const LAYER_ORDER = ["client", "gateway", "service", "data", "external"];
const LAYER_EDGE_COLOR: Record<string, string> = {
  client: "#00ff9f",
  gateway: "#ffbd59",
  service: "#00f5ff",
  data: "#7b61ff",
  external: "#ff5f7d",
};
export default function ArchitectureCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  onSelectNode,
  revealMeta = true,
  onCanvasReady,
  guidedMode = false,
  focusNodeId = null,
}: ArchitectureCanvasProps) {
  const nodeLayerMap = useMemo(() => {
    const map = new Map<string, string>();
    initialNodes.forEach((n) => map.set(n.id, n.data?.layer || "service"));
    return map;
  }, [initialNodes]);

  const relayoutNodes = useMemo<ArchNode[]>(() => {
    const byLayer = new Map<string, ArchNode[]>();
    initialNodes.forEach((n) => {
      const layer = n.data?.layer || "service";
      if (!byLayer.has(layer)) byLayer.set(layer, []);
      byLayer.get(layer)!.push(n);
    });

    const laidOut: ArchNode[] = [];
    const maxPerRow = 4;
    const colGap = 360;
    const rowGap = 220;
    const layerGap = 430;
    const startX = 120;
    const startY = 90;

    LAYER_ORDER.forEach((layer, layerIdx) => {
      const nodes = byLayer.get(layer) || [];
      nodes.forEach((node, idx) => {
        const row = Math.floor(idx / maxPerRow);
        const col = idx % maxPerRow;
        laidOut.push({
          ...node,
          position: {
            x: startX + col * colGap + (row % 2 === 1 ? 80 : 0),
            y: startY + layerIdx * layerGap + row * rowGap,
          },
        });
      });
    });

    // Keep unknown layer nodes visible at bottom if any.
    const knownIds = new Set(laidOut.map((n) => n.id));
    initialNodes
      .filter((n) => !knownIds.has(n.id))
      .forEach((n, idx) => {
        laidOut.push({
          ...n,
          position: { x: startX + (idx % maxPerRow) * colGap, y: startY + LAYER_ORDER.length * layerGap + Math.floor(idx / maxPerRow) * rowGap },
        });
      });

    return laidOut;
  }, [initialNodes]);

  const mappedNodes = useMemo<Node[]>(
    () =>
      relayoutNodes.map((n) => ({
        id: n.id,
        type: "component",
        position: n.position,
        data: { ...n.data, __focused: guidedMode && focusNodeId === n.id },
        style:
          guidedMode && focusNodeId
            ? {
                opacity: focusNodeId === n.id ? 1 : 0.22,
                transition: "opacity 0.28s ease",
                filter: focusNodeId === n.id ? "drop-shadow(0 0 22px rgba(0,245,255,0.55))" : "none",
              }
            : undefined,
      })),
    [relayoutNodes, guidedMode, focusNodeId]
  );

  const mappedEdges = useMemo<Edge[]>(
    () =>
      initialEdges.map((e) => {
        const edgeColor = LAYER_EDGE_COLOR[nodeLayerMap.get(e.source) || "service"];
        return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: revealMeta ? e.label || "data flow" : "",
        animated: true,
        className: "arch-flow-edge arch-edge-draw",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
        labelStyle: { fontSize: 13, fill: "#f5f9ff", fontWeight: 800 },
        labelBgStyle: { fill: "rgba(8,10,30,0.9)" },
        labelBgBorderRadius: 8,
        style:
          guidedMode && focusNodeId
            ? {
                stroke: edgeColor,
                strokeWidth: 3,
                strokeDasharray: "10 5",
                opacity: 0.25,
              }
            : {
                stroke: edgeColor,
                strokeWidth: 3,
                strokeDasharray: "10 5",
              },
      };
      }),
    [initialEdges, revealMeta, guidedMode, focusNodeId, nodeLayerMap]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(mappedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(mappedEdges);

  useEffect(() => setNodes(mappedNodes), [mappedNodes, setNodes]);
  useEffect(() => setEdges(mappedEdges), [mappedEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#00f5ff" },
            style: { stroke: "#00f5ff", strokeWidth: 2.2, strokeDasharray: "8 5" },
          },
          eds
        )
      ),
    [setEdges]
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px] border border-cyan-300/20 bg-slate-950/70">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 40, y: 20, zoom: 0.6 }}
        minZoom={0.45}
        maxZoom={2.2}
        onPaneClick={() => onSelectNode?.(null)}
        onNodeClick={(_, node) => onSelectNode?.(node)}
        onInit={(instance) => onCanvasReady?.(instance)}
      >
        <Background color="rgba(112,136,255,0.16)" gap={24} size={1} />
      </ReactFlow>

      <style jsx global>{`
        .react-flow__node {
          will-change: transform;
          transition: transform 0.2s ease;
        }
        .react-flow__node:hover {
          transform: scale(1.08);
          z-index: 40 !important;
        }
        .arch-flow-edge path {
          filter: drop-shadow(0 0 6px rgba(0, 245, 255, 0.45));
          animation: arch-data-flow 1.1s linear infinite;
        }
        .arch-edge-draw path {
          animation: arch-line-draw 0.5s cubic-bezier(0.215, 0.61, 0.355, 1) forwards,
            arch-data-flow 1.1s linear infinite 0.5s,
            arch-glow-shift 1.5s ease-in-out infinite;
        }
        @keyframes arch-line-draw {
          from {
            stroke-dasharray: 300;
            stroke-dashoffset: 300;
            opacity: 0.2;
          }
          to {
            stroke-dasharray: 8 5;
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes arch-data-flow {
          to {
            stroke-dashoffset: -26;
          }
        }
        @keyframes arch-glow-shift {
          0%,
          100% {
            filter: drop-shadow(0 0 6px rgba(0, 245, 255, 0.45));
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(255, 0, 255, 0.35));
          }
        }
      `}</style>
    </div>
  );
}
