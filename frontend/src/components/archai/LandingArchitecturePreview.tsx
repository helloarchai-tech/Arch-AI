"use client";

import { motion } from "framer-motion";

interface LandingArchitecturePreviewProps {
  prompt: string;
}

const BASE_NODES = [
  { id: "c1", x: 8, y: 16, label: "Mobile App" },
  { id: "g1", x: 30, y: 34, label: "API Gateway" },
  { id: "s1", x: 52, y: 52, label: "Irrigation Service" },
  { id: "d1", x: 74, y: 70, label: "Time Series DB" },
  { id: "e1", x: 88, y: 28, label: "Weather API" },
];

export default function LandingArchitecturePreview({ prompt }: LandingArchitecturePreviewProps) {
  const signal = Math.max(1, Math.min(10, Math.round((prompt.trim().length || 8) / 16)));

  return (
    <div className="glass-panel relative h-72 w-full overflow-hidden rounded-2xl border border-cyan-300/20">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/8 via-fuchsia-400/8 to-purple-400/8" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {BASE_NODES.slice(0, signal > 6 ? 5 : 4).map((node, idx) => {
          const next = BASE_NODES[idx + 1];
          if (!next) return null;
          return (
            <motion.path
              key={`${node.id}-${next.id}`}
              d={`M${node.x} ${node.y} C${node.x + 10} ${node.y + 8} ${next.x - 8} ${next.y - 6} ${next.x} ${next.y}`}
              fill="none"
              stroke="url(#previewStroke)"
              strokeWidth="0.8"
              strokeDasharray="1.8 1"
              initial={{ pathLength: 0, opacity: 0.2 }}
              animate={{ pathLength: 1, opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: idx * 0.2 }}
            />
          );
        })}
        <defs>
          <linearGradient id="previewStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="50%" stopColor="#7b61ff" />
            <stop offset="100%" stopColor="#ff00ff" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative z-10 grid h-full grid-cols-5 gap-3 p-4">
        {BASE_NODES.slice(0, signal > 6 ? 5 : 4).map((node, idx) => (
          <motion.div
            key={node.id}
            className="rounded-xl border border-cyan-200/20 bg-slate-950/45 p-3 text-[11px] text-cyan-100"
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: [0.98, 1.01, 0.98] }}
            transition={{ delay: idx * 0.08, duration: 0.5, repeat: Infinity, repeatDelay: 2.6 }}
            style={{ boxShadow: "0 0 18px rgba(0,245,255,0.2)" }}
          >
            <div className="mb-2 text-[9px] uppercase tracking-[0.2em] text-slate-300">
              {["client", "gateway", "service", "data", "external"][idx]}
            </div>
            <div className="font-semibold">{node.label}</div>
            <div className="mt-1 text-[10px] text-slate-300">{idx % 2 ? "Node.js + Redis" : "FastAPI + Kafka"}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
