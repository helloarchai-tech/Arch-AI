"use client";

import { motion } from "framer-motion";

interface GenerationOverlayProps {
  phase: number;
  onFastForward: () => void;
  onCancel: () => void;
}

const PHASE_TEXT: Record<number, string> = {
  1: "Phase 1/5 - Initializing canvas",
  2: "Phase 2/5 - Seeding core component",
  3: "Phase 3/5 - Drawing relationship lines",
  4: "Phase 4/5 - Spawning layer components",
  5: "Phase 5/5 - Revealing labels and stats",
  6: "Finalizing architecture",
};

export default function GenerationOverlay({ phase, onFastForward, onCancel }: GenerationOverlayProps) {
  return (
    <div className="pointer-events-none absolute right-4 top-20 z-40" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel pointer-events-auto w-[min(420px,88vw)] rounded-2xl border border-cyan-300/30 px-4 py-4 text-center"
      >
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full border border-cyan-300/35">
          <div className="h-12 w-12 rounded-full border-4 border-cyan-300/20 border-t-cyan-300 animate-spin" />
        </div>
        <h3 className="text-xl font-black tracking-tight text-cyan-200">Loading Your Architecture</h3>
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-300">
          AI is generating every layer, reasoning relationships, and mapping your production-ready system.
        </p>
        <p className="mt-2 animate-neon-pulse text-xs uppercase tracking-[0.18em] text-cyan-300">
          {PHASE_TEXT[phase] || "Building..."}
        </p>
        <div className="mx-auto mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-800">
          <div className="animate-shimmer h-full w-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-cyan-300" />
        </div>
        <div className="mt-3 flex justify-center gap-2">
          <button
            onClick={onFastForward}
            className="rounded-lg border border-fuchsia-300/45 bg-fuchsia-400/15 px-3 py-1.5 text-xs font-semibold text-fuchsia-200 transition hover:bg-fuchsia-400/30"
          >
            Fast Forward
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300/35 bg-slate-900/45 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/45 hover:text-cyan-200"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
