"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Layers, X } from "lucide-react";

interface ComponentWalkthroughPanelProps {
  componentName: string;
  paragraph: string;
  index: number;
  total: number;
  direction: "next" | "back";
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}

export default function ComponentWalkthroughPanel({
  componentName,
  paragraph,
  index,
  total,
  direction,
  onBack,
  onNext,
  onClose,
}: ComponentWalkthroughPanelProps) {
  return (
    <div className="glass-panel absolute right-4 top-24 z-35 flex h-[70vh] w-[380px] flex-col rounded-2xl border border-cyan-300/30 p-4">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2 text-cyan-200">
          <Layers size={14} />
          <span className="text-[11px] uppercase tracking-[0.2em]">Component Walkthrough</span>
        </div>
        <span className="text-xs text-slate-300">
          {index + 1}/{total}
        </span>
      </div>
      <button
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full border border-slate-400/35 bg-slate-900/45 p-1 text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-200"
      >
        <X size={12} />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
        <motion.div
          key={`${componentName}-${index}`}
          initial={{ opacity: 0, x: direction === "next" ? 22 : -22 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction === "next" ? -18 : 18 }}
          transition={{ duration: 0.28 }}
        >
          <h4 className="text-lg font-bold text-cyan-100">{componentName}</h4>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-200">{paragraph}</p>
        </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-3 flex shrink-0 justify-between border-t border-slate-500/25 pt-3">
        <button
          onClick={onBack}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-lg border border-slate-400/35 bg-slate-900/45 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-300/45 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1 rounded-lg border border-fuchsia-300/45 bg-fuchsia-400/15 px-3 py-1.5 text-xs font-semibold text-fuchsia-200 transition hover:bg-fuchsia-400/30"
        >
          {index + 1 === total ? "Show Full Architecture" : "Next"}
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
