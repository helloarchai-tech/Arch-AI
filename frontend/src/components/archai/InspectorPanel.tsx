"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CircleDollarSign, Lightbulb, Pencil, ShieldCheck, Sparkles } from "lucide-react";
import type { Node } from "reactflow";
import type { ReactNode } from "react";

interface InspectorPanelProps {
  node: Node | null;
  onClose: () => void;
}

export default function InspectorPanel({ node, onClose }: InspectorPanelProps) {
  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="glass-panel absolute right-0 top-0 z-30 h-full w-[340px] border-l border-fuchsia-300/20 p-4"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Node Inspector</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-100">{String(node.data.label || "Component")}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-500/40 px-2.5 py-1 text-xs text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200"
            >
              Close
            </button>
          </div>

          <div className="space-y-3">
            <InspectorCard
              icon={<Sparkles size={14} />}
              title="LLM Explanation"
              text="This component handles a critical flow in the generated architecture and is placed in this layer to optimize reliability and latency."
            />
            <InspectorCard
              icon={<Lightbulb size={14} />}
              title="Tech Alternatives"
              text="Primary: FastAPI. Alternatives: Go Fiber, NestJS. Tradeoff: FastAPI wins on speed to market and ecosystem."
            />
            <InspectorCard
              icon={<ShieldCheck size={14} />}
              title="Pros / Cons"
              text="Pros: clear ownership, scalable boundaries, async-friendly. Cons: more services to monitor and operate."
            />
            <InspectorCard
              icon={<CircleDollarSign size={14} />}
              title="Estimated Cost"
              text="$120 - $420/mo depending on throughput and HA setup."
            />
          </div>

          <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/20">
            <Pencil size={14} />
            Edit This Component
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function InspectorCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-400/20 bg-slate-950/50 p-3">
      <div className="mb-1 flex items-center gap-2 text-cyan-300">
        {icon}
        <span className="text-xs font-semibold tracking-wide">{title}</span>
      </div>
      <p className="text-xs leading-5 text-slate-300">{text}</p>
    </div>
  );
}
