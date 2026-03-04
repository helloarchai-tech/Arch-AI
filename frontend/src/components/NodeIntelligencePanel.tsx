"use client";

import { X, Activity, AlertTriangle, Cpu, Layers, DollarSign, Link2, ShieldCheck } from "lucide-react";

interface NodeIntelligencePanelProps {
    node: any | null;
    healthDetails?: Record<string, { score?: number; reasons?: string[] }>;
    onClose: () => void;
}

const riskLevel = (blast?: number) => {
    if (blast === undefined || blast === null) return { label: "Unknown", color: "#94a3b8" };
    if (blast >= 8) return { label: "Critical", color: "#f87171" };
    if (blast >= 6) return { label: "High", color: "#fb923c" };
    if (blast >= 4) return { label: "Moderate", color: "#facc15" };
    return { label: "Low", color: "#34d399" };
};

const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return "N/A";
    if (typeof value === "string") return value;
    return `$${value.toLocaleString()}`;
};

export default function NodeIntelligencePanel({ node, healthDetails, onClose }: NodeIntelligencePanelProps) {
    if (!node) return null;
    const data = node.data || {};
    const dependencies: string[] = data.dependencies || data.deps || [];
    const blast = data.failure_blast_radius ?? data.blastRadius;
    const risk = riskLevel(blast);

    const contributions = [
        { key: "scalability", label: "Scalability" },
        { key: "costEfficiency", label: "Cost Efficiency" },
        { key: "security", label: "Security" },
        { key: "maintainability", label: "Maintainability" },
    ].map((item) => ({
        ...item,
        score: data.health?.[item.key] ?? healthDetails?.[item.key]?.score,
        reasons: data.health?.[item.key]?.reasons || healthDetails?.[item.key]?.reasons,
    }));

    return (
        <div
            style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: "320px",
                maxWidth: "calc(100% - 32px)",
                background: "rgba(12,12,20,0.92)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "14px",
                boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                backdropFilter: "blur(12px)",
                zIndex: 30,
                overflow: "hidden",
                animation: "slideIn 0.25s ease-out",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Cpu size={16} color="#a5b4fc" />
                    <div>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>{data.label || node.id}</p>
                        <p style={{ fontSize: "11px", color: "#94a3b8" }}>{data.tech || "Tech TBD"}</p>
                    </div>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                    <X size={14} />
                </button>
            </div>

            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <Row icon={<Layers size={14} color="#8b5cf6" />} label="Category" value={`${data.category || "Unknown"} · ${data.layer || "Layer N/A"}`} />
                {data.reason && <Row icon={<ShieldCheck size={14} color="#22d3ee" />} label="Why included" value={data.reason} />}
                <Row icon={<Activity size={14} color="#34d399" />} label="Risk level" value={risk.label} badgeColor={risk.color} />
                {data.cost && <Row icon={<DollarSign size={14} color="#f59e0b" />} label="Cost estimate" value={formatCurrency(data.cost)} />}

                {dependencies.length > 0 && (
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                            <Link2 size={12} color="#94a3b8" />
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0", letterSpacing: "0.02em" }}>Dependencies</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {dependencies.map((dep) => (
                                <span key={dep} style={{ fontSize: "11px", padding: "6px 10px", borderRadius: "10px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.12)", color: "#cbd5e1" }}>
                                    {dep}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <AlertTriangle size={12} color="#fbbf24" />
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0" }}>Health contribution</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {contributions.map((c) => (
                            <div key={c.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                                <span style={{ fontSize: "11px", color: "#cbd5e1" }}>{c.label}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: 600 }}>{c.score ?? "—"}</span>
                                    {c.reasons && c.reasons.length > 0 && (
                                        <span style={{ fontSize: "10px", color: "#94a3b8", maxWidth: "160px", textAlign: "right", lineHeight: 1.3 }}>
                                            {c.reasons[0]}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(12px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
}

function Row({ icon, label, value, badgeColor }: { icon: React.ReactNode; label: string; value: string; badgeColor?: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "8px", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <p style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>{label}</p>
                {badgeColor ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "999px", background: `${badgeColor}22`, color: "#e2e8f0", fontSize: "11px", fontWeight: 600, border: `1px solid ${badgeColor}55` }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: badgeColor }} />
                        {value}
                    </span>
                ) : (
                    <p style={{ fontSize: "12px", color: "#e2e8f0" }}>{value}</p>
                )}
            </div>
        </div>
    );
}
