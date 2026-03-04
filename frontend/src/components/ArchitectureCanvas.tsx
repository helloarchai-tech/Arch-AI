"use client";

import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    MarkerType,
    Node,
    Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import ComponentNode from "./ComponentNode";

interface DiagramNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: { label: string; category: string; tech?: string; icon?: string };
}

interface DiagramEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
}

interface ArchitectureCanvasProps {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    onSelectNode?: (node: Node) => void;
    selectedNodeId?: string | null;
}

const nodeTypes = { component: ComponentNode };

const LAYERS = ["Client", "Gateway", "Service", "Data", "External"];

export default function ArchitectureCanvas({ nodes: initialNodes, edges: initialEdges, onSelectNode }: ArchitectureCanvasProps) {
    const mappedNodes: Node[] = useMemo(
        () =>
            initialNodes.map((n) => ({
                id: n.id,
                type: "component",
                position: n.position,
                data: n.data,
                draggable: true,
            })),
        [initialNodes]
    );

    const mappedEdges: Edge[] = useMemo(
        () =>
            initialEdges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label,
                animated: e.animated ?? true,
                className: "flow-edge",
                style: { stroke: "#0b61d8", strokeWidth: 2.8, strokeDasharray: "8 4", filter: "drop-shadow(0 0 3px rgba(11,97,216,0.25))" },
                labelStyle: { fill: "#0f172a", fontSize: 12, fontWeight: 700 },
                labelBgStyle: { fill: "rgba(255,255,255,0.92)", fillOpacity: 1 },
                labelBgPadding: [6, 4] as [number, number],
                labelBgBorderRadius: 6,
                markerEnd: { type: MarkerType.ArrowClosed, color: "#0b61d8", width: 18, height: 18 },
            })),
        [initialEdges]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(mappedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(mappedEdges);

    useEffect(() => {
        setNodes(mappedNodes);
    }, [mappedNodes, setNodes]);

    useEffect(() => {
        setEdges(mappedEdges);
    }, [mappedEdges, setEdges]);

    const onConnect = useCallback(
        (connection: Connection) => setEdges((eds) => addEdge({
            ...connection,
            className: "flow-edge",
            style: { stroke: "#0b61d8", strokeWidth: 2.4, strokeDasharray: "7 5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#0b61d8" },
            animated: true,
        }, eds)),
        [setEdges]
    );

    return (
        <div id="architecture-canvas" className="w-full h-full relative">
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, opacity: 0.9 }}>
                {LAYERS.map((layer, idx) => (
                    <div
                        key={layer}
                        style={{
                            position: "absolute",
                            top: `${(idx / LAYERS.length) * 100}%`,
                            height: `${100 / LAYERS.length}%`,
                            width: "100%",
                            background: "linear-gradient(90deg, rgba(215,234,255,0.65), rgba(225,249,238,0.62))",
                            borderTop: idx === 0 ? "none" : "1px solid rgba(148,163,184,0.18)",
                            borderBottom: "1px solid rgba(148,163,184,0.18)",
                        }}
                    >
                        <span style={{ position: "absolute", left: 14, top: 8, fontSize: "12px", letterSpacing: "0.08em", color: "#0f172a", fontWeight: 800, textTransform: "uppercase" }}>{layer}</span>
                    </div>
                ))}
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.3}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                    style: { stroke: "#0b61d8", strokeWidth: 2.8, strokeDasharray: "8 4" },
                    markerEnd: { type: MarkerType.ArrowClosed, color: "#0b61d8" },
                    animated: true,
                }}
                onNodeClick={(_, node) => onSelectNode?.(node)}
            >
                <Background color="rgba(51,65,85,0.18)" gap={22} size={1} />
                <MiniMap
                    nodeColor={(node: Node) => {
                        const cat = (node.data as { category?: string }).category;
                        switch (cat) {
                            case "frontend": return "#0b61d8";
                            case "backend": return "#059669";
                            case "database": return "#b45309";
                            case "ai": return "#be185d";
                            case "infrastructure": return "#0369a1";
                            case "external": return "#ea580c";
                            default: return "#0b61d8";
                        }
                    }}
                    maskColor="rgba(226,232,240,0.4)"
                />
            </ReactFlow>
            <style jsx global>{`
                .flow-edge path {
                    animation: edge-flow 1.05s linear infinite;
                }
                @keyframes edge-flow {
                    to {
                        stroke-dashoffset: -26;
                    }
                }
            `}</style>
        </div>
    );
}
