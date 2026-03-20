"use client";

import { motion } from "framer-motion";
import {
  BookOpenCheck,
  Download,
  Expand,
  Sparkles,
} from "lucide-react";

interface ViewerToolbarProps {
  onToggleImmersive: () => void;
  onStartWalkthrough: () => void;
  immersive: boolean;
  walkthroughActive: boolean;
}

export default function ViewerToolbar({
  onToggleImmersive,
  onStartWalkthrough,
  immersive,
  walkthroughActive,
}: ViewerToolbarProps) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-panel absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2"
    >
      <button
        className="group flex items-center gap-1.5 rounded-lg border border-slate-500/35 bg-slate-900/65 px-2.5 py-1.5 text-xs text-slate-200 transition hover:-translate-y-0.5 hover:border-cyan-300/50 hover:text-cyan-200"
      >
        <Download size={13} className="transition group-hover:rotate-6" />
        Export
      </button>
      <button
        onClick={onStartWalkthrough}
        className="rounded-lg border border-cyan-300/45 bg-cyan-300/12 px-2.5 py-1.5 text-xs text-cyan-200 transition hover:bg-cyan-300/22"
      >
        <span className="flex items-center gap-1.5">
          <BookOpenCheck size={13} />
          {walkthroughActive ? "Walkthrough On" : "Walkthrough"}
        </span>
      </button>
      <button
        onClick={onToggleImmersive}
        className="ml-1 rounded-lg border border-fuchsia-300/45 bg-fuchsia-400/15 px-2.5 py-1.5 text-xs text-fuchsia-200 transition hover:bg-fuchsia-400/28"
      >
        <span className="flex items-center gap-1.5">
          {immersive ? <Sparkles size={13} /> : <Expand size={13} />}
          {immersive ? "Exit Immersive" : "Immersive"}
        </span>
      </button>
    </motion.div>
  );
}
