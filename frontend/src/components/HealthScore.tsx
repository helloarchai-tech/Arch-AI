"use client";

import { useMemo } from "react";

interface HealthScoreProps {
    score: number;
    size?: number;
    label?: string;
    detail?: string;
}

const colorForScore = (score: number) => {
    if (score < 5) return ["#ef4444", "#f97316"];
    if (score < 8) return ["#f59e0b", "#fbbf24"];
    return ["#10b981", "#22c55e"];
};

export default function HealthScore({ score, size = 76, label, detail }: HealthScoreProps) {
    const svgSize = size;
    const radius = (size / 2) - 6;
    const circumference = 2 * Math.PI * radius;
    const progress = (Math.min(Math.max(score, 0), 10) / 10) * circumference;
    const [start, end] = colorForScore(score);

    const gradientId = useMemo(() => `health-${label?.toLowerCase() || "gauge"}`, [label]);

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }} title={detail}>
            <div style={{ position: "relative", width: svgSize, height: svgSize }}>
                <svg width={svgSize} height={svgSize} style={{ transform: "rotate(-90deg)" }} viewBox={`0 0 ${svgSize} ${svgSize}`}>
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={start} />
                            <stop offset="100%" stopColor={end} />
                        </linearGradient>
                    </defs>
                    <circle cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle
                        cx={svgSize / 2} cy={svgSize / 2} r={radius}
                        fill="none" stroke={`url(#${gradientId})`} strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - progress}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
                    />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                    <span style={{ fontSize: size > 70 ? "18px" : "14px", fontWeight: 800, color: "#fff" }}>{score.toFixed(1).replace(/\.0$/, "")}</span>
                    <span style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.03em" }}>{label}</span>
                </div>
            </div>
            {detail && (
                <div style={{ position: "absolute", bottom: -6, padding: "6px 10px", borderRadius: "8px", background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: "11px", width: "220px", left: "50%", transform: "translateX(-50%)", textAlign: "center", opacity: 0, transition: "opacity 0.2s" }} className="health-tooltip">
                    {detail}
                </div>
            )}
            <style jsx>{`
        div:hover > .health-tooltip { opacity: 1; }
      `}</style>
        </div>
    );
}
