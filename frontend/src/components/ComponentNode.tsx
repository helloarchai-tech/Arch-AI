"use client";

import { Handle, Position, NodeProps } from "reactflow";
import {
    Monitor, Globe, Server, Shield, Lock, Cpu, Zap,
    Brain, Mail, Database, HardDrive, BarChart3,
    type LucideIcon,
} from "lucide-react";

const CATEGORY_STYLES: Record<string, { bg: string; border: string; accent: string }> = {
    frontend: { bg: "#e8f1ff", border: "#93c5fd", accent: "#0b61d8" },
    backend: { bg: "#e8fff7", border: "#86efac", accent: "#059669" },
    database: { bg: "#fff7e8", border: "#fcd34d", accent: "#b45309" },
    ai: { bg: "#ffe8f2", border: "#f9a8d4", accent: "#be185d" },
    infrastructure: { bg: "#ebf8ff", border: "#7dd3fc", accent: "#0369a1" },
    external: { bg: "#fff1e8", border: "#fdba74", accent: "#ea580c" },
};

const ICON_MAP: Record<string, LucideIcon> = {
    monitor: Monitor, globe: Globe, server: Server, shield: Shield,
    lock: Lock, cpu: Cpu, zap: Zap, brain: Brain, mail: Mail,
    database: Database, "hard-drive": HardDrive, "bar-chart": BarChart3,
};

export default function ComponentNode({ data }: NodeProps) {
    const category = data.category || "backend";
    const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.backend;
    const IconComp = ICON_MAP[data.icon] || Cpu;
    const isExternal = category === "external";
    const scalability = data.health?.scalability ?? data.scalability;
    const blastRadius = data.failure_blast_radius ?? data.blastRadius;
    const redundancy = data.redundancy ?? data.hasRedundancy;
    const isWeak = typeof scalability === "number" && scalability < 5;
    const highBlast = typeof blastRadius === "number" && blastRadius >= 7;
    const missingRedundancy = redundancy === false || redundancy === "single";

    return (
        <div
            style={{
                minWidth: "220px",
                maxWidth: "260px",
                padding: "18px 18px",
                borderRadius: "14px",
                background: style.bg,
                border: `${isExternal ? "2px dashed" : "2px solid"} ${highBlast ? "rgba(251,146,60,0.75)" : style.border}`,
                transition: "all 0.3s",
                cursor: "pointer",
                boxShadow: isWeak ? `0 0 20px rgba(248,113,113,0.35)` : "0 8px 18px rgba(15,23,42,0.08)",
                position: "relative",
            }}
        >
            {missingRedundancy && (
                <div style={{ position: "absolute", top: 8, right: 8, padding: "4px 8px", borderRadius: "999px", background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.35)", color: "#b91c1c", fontSize: "10px", fontWeight: 800 }}>
                    No Redundancy
                </div>
            )}
            <Handle type="target" position={Position.Top} style={{ background: style.accent, width: 10, height: 10, border: "2px solid #ffffff" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <IconComp size={18} style={{ color: style.accent }} />
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>
                    {data.label}
                </span>
            </div>

            {data.tech && (
                <span style={{ fontSize: "12px", color: "#475569", lineHeight: 1.4, fontWeight: 600 }}>
                    {data.tech}
                </span>
            )}

            {isExternal && (
                <div style={{ marginTop: "8px", fontSize: "10px", fontWeight: 800, padding: "3px 8px", borderRadius: "4px", background: "rgba(251,146,60,0.2)", color: "#9a3412", display: "inline-block" }}>
                    EXTERNAL
                </div>
            )}

            <Handle type="source" position={Position.Bottom} style={{ background: style.accent, width: 10, height: 10, border: "2px solid #ffffff" }} />
        </div>
    );
}
