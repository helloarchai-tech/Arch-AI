"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Cpu } from "lucide-react";

interface ViewerSidebarProps {
  collapsed: boolean;
  currentPrompt: string;
  finalPrompt: string;
  onPromptChange: (value: string) => void;
  onToggle: () => void;
  onRegenerate: () => void;
  onClearPrompt: () => void;
}

export default function ViewerSidebar({
  collapsed,
  currentPrompt,
  finalPrompt,
  onPromptChange,
  onToggle,
  onRegenerate,
  onClearPrompt,
}: ViewerSidebarProps) {
  const sourcePrompt = currentPrompt || finalPrompt;

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 280 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="glass-panel relative z-20 h-full shrink-0 border-r border-cyan-300/20"
    >
      <button
        onClick={onToggle}
        className="absolute -right-3 top-5 z-30 rounded-full border border-cyan-300/30 bg-slate-950/95 p-1.5 text-cyan-200"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="h-full overflow-y-auto px-3 py-4">
        <div className="mb-4 flex items-center gap-2 px-2">
          <div className="rounded-xl bg-cyan-300/20 p-2 text-cyan-200">
            <Cpu size={16} />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold">Arch.AI</p>
              <p className="flex items-center gap-2 text-[10px] text-slate-300">
                <span className="h-2 w-2 animate-neon-pulse rounded-full bg-green-400" />
                AI Agent - Live
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mb-4 rounded-xl border border-cyan-300/25 bg-slate-950/55 p-3">
            <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-cyan-200">Prompt Terminal</label>
            <textarea
              value={currentPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              className="h-44 w-full resize-none overflow-y-auto rounded-lg border border-cyan-300/35 bg-slate-950/85 p-3 text-xs text-slate-100 outline-none transition focus:border-cyan-200 focus:shadow-[0_0_18px_rgba(0,245,255,0.3)]"
            />
            {!sourcePrompt && <div className="mt-2 text-[11px] text-cyan-300">Type your architecture prompt...</div>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={onRegenerate}
                className="w-full rounded-lg border border-fuchsia-300/40 bg-fuchsia-400/15 py-2 text-xs font-semibold text-fuchsia-200 transition hover:bg-fuchsia-400/25"
              >
                Regenerate Diagram
              </button>
              <button
                onClick={onClearPrompt}
                className="rounded-lg border border-slate-400/35 bg-slate-900/45 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-300/45 hover:text-cyan-200"
              >
                Clear
              </button>
            </div>
          </div>
        )}

      </div>
    </motion.aside>
  );
}

