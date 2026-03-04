"use client";

import { useMemo, useState } from "react";
import { Download, Workflow, RefreshCw, Activity } from "lucide-react";
import { buildSequenceFromGraph, toPlantUML } from "@/utils/uml";

interface UMLCanvasProps {
    nodes: any[];
    edges: any[];
    variant?: "component" | "deployment";
}

const LAYERS = ["Client", "Gateway", "Service", "Data", "External"];

const layerIndex = (layer?: string) => {
    if (!layer) return LAYERS.length;
    const idx = LAYERS.findIndex((l) => l.toLowerCase() === layer.toLowerCase());
    return idx === -1 ? LAYERS.length : idx;
};

export default function UMLCanvas({ nodes = [], edges = [], variant = "component" }: UMLCanvasProps) {
    const [sequenceOpen, setSequenceOpen] = useState(false);

    const bounds = useMemo(() => {
        if (!nodes.length) return { minX: 0, maxX: 800, minY: 0, maxY: 600 };
        const xs = nodes.map((n) => n.position?.x || 0);
        const ys = nodes.map((n) => n.position?.y || 0);
        return { minX: Math.min(...xs) - 80, maxX: Math.max(...xs) + 160, minY: Math.min(...ys) - 80, maxY: Math.max(...ys) + 120 };
    }, [nodes]);

    const sequence = useMemo(() => buildSequenceFromGraph(nodes, edges), [nodes, edges]);

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    const renderNode = (n: any) => {
        const x = (n.position?.x || 0) - bounds.minX;
        const y = (n.position?.y || 0) - bounds.minY;
        const w = 160;
        const h = variant === "deployment" ? 80 : 60;
        const layer = n.data?.layer || "Unassigned";
        return (
            <g key={n.id} transform={`translate(${x}, ${y})`}>
                <rect
                    x={0}
                    y={0}
                    rx={10}
                    ry={10}
                    width={w}
                    height={h}
                    fill="rgba(20,22,35,0.92)"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth={1.2}
                />
                <rect x={0} y={0} width={w} height={18} fill="rgba(99,102,241,0.12)" />
                <text x={8} y={13} fontSize={10} fill="#a5b4fc" fontWeight={600}>
                    {layer}
                </text>
                <text x={10} y={36} fontSize={13} fill="#e2e8f0" fontWeight={700}>
                    {n.data?.label || n.id}
                </text>
                {variant === "deployment" && (
                    <text x={10} y={54} fontSize={11} fill="#94a3b8">
                        {n.data?.tech || n.data?.category || "Node"}
                    </text>
                )}
            </g>
        );
    };

    const renderEdge = (e: any) => {
        const s = nodes.find((n) => n.id === e.source);
        const t = nodes.find((n) => n.id === e.target);
        if (!s || !t) return null;
        const sx = (s.position?.x || 0) - bounds.minX + 160;
        const sy = (s.position?.y || 0) - bounds.minY + 30;
        const tx = (t.position?.x || 0) - bounds.minX;
        const ty = (t.position?.y || 0) - bounds.minY + 30;
        return (
            <g key={e.id}>
                <defs>
                    <marker id={`arrow-${e.id}`} markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L10,3 L0,6 z" fill="#8b5cf6" />
                    </marker>
                </defs>
                <line x1={sx} y1={sy} x2={tx} y2={ty} stroke="#8b5cf6" strokeWidth={1.6} markerEnd={`url(#arrow-${e.id})`} />
                {e.label && (
                    <text x={(sx + tx) / 2} y={(sy + ty) / 2 - 6} fontSize={10} fill="#cbd5e1" textAnchor="middle">
                        {e.label}
                    </text>
                )}
            </g>
        );
    };

    const deploymentNodes = useMemo(() => {
        if (variant !== "deployment") return nodes;
        return [...nodes].sort((a, b) => layerIndex(a.data?.layer) - layerIndex(b.data?.layer));
    }, [nodes, variant]);

    const plantUml = useMemo(() => toPlantUML(nodes, edges), [nodes, edges]);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative", background: "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.06), transparent 35%), #0a0a0f" }}>
            <div style={{ position: "absolute", right: 12, top: 12, display: "flex", gap: 8, zIndex: 5 }}>
                <button
                    onClick={() => setSequenceOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "#e2e8f0", fontSize: "12px", cursor: "pointer" }}
                >
                    <Workflow size={14} /> View Request Flow
                </button>
                <button
                    onClick={() => navigator.clipboard.writeText(plantUml)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(99,102,241,0.14)", color: "white", fontSize: "12px", cursor: "pointer" }}
                >
                    <Download size={14} /> Copy .puml
                </button>
            </div>

            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                {LAYERS.map((layer, idx) => (
                    <rect
                        key={layer}
                        x={0}
                        y={(height / LAYERS.length) * idx}
                        width={width}
                        height={height / LAYERS.length}
                        fill="url(#bandGradient)"
                        opacity={0.35}
                    />
                ))}
                <defs>
                    <linearGradient id="bandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(99,102,241,0.08)" />
                        <stop offset="100%" stopColor="rgba(14,165,233,0.05)" />
                    </linearGradient>
                </defs>
                {edges.map(renderEdge)}
                {deploymentNodes.map(renderNode)}
            </svg>

            {sequenceOpen && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                    <div style={{ width: "560px", maxWidth: "90%", background: "rgba(12,12,20,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px", boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Activity size={16} color="#a5b4fc" />
                                <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>Request Flow</span>
                            </div>
                            <button onClick={() => setSequenceOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>Close</button>
                        </div>
                        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                            {sequence.lifelines.map((life) => (
                                <div key={life} style={{ minWidth: 120, padding: "10px", borderRadius: "10px", border: "1px dashed rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)", color: "#e2e8f0", fontSize: "12px", textAlign: "center" }}>
                                    {life}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            {sequence.messages.length === 0 && <p style={{ color: "#94a3b8", fontSize: "12px" }}>No edges to build sequence.</p>}
                            {sequence.messages.map((m, idx) => (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12px", color: "#cbd5e1" }}>
                                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(99,102,241,0.18)", color: "#a5b4fc", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{idx + 1}</span>
                                    <span style={{ whiteSpace: "nowrap", color: "#e2e8f0", fontWeight: 600 }}>{m.from}</span>
                                    <span style={{ color: "#64748b" }}>→</span>
                                    <span style={{ whiteSpace: "nowrap", color: "#e2e8f0", fontWeight: 600 }}>{m.to}</span>
                                    {m.label && <span style={{ color: "#94a3b8" }}>({m.label})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
