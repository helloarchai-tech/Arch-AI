"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Cpu, Send, MessageCircle } from "lucide-react";

const RAW_API = process.env.NEXT_PUBLIC_API_URL || "https://handbags-affiliates-lobby-arabic.trycloudflare.com/api";
const _trimmed = RAW_API.replace(/\/+$/, "");
const _secure = /^http:\/\/(localhost|127\.0\.0\.1)/i.test(_trimmed)
  ? _trimmed
  : _trimmed.replace(/^http:\/\//i, "https://");
const API = _secure.endsWith("/api") ? _secure : `${_secure}/api`;
const API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

function getAuthHeaders(): Record<string, string> {
  const token = (typeof window !== "undefined" && localStorage.getItem("token")) || API_KEY;
  return {
    "x-api-key": API_KEY,
    "Authorization": token ? `Bearer ${token}` : "",
    "X-Pinggy-No-Screen": "true",
  };
}

interface ChatMsg { role: "user" | "assistant"; content: string; }

interface ViewerSidebarProps {
  collapsed: boolean;
  currentPrompt: string;
  finalPrompt: string;
  projectId: string;
  architectureTitle?: string;
  architectureSummary?: string;
  onPromptChange: (value: string) => void;
  onToggle: () => void;
  onRegenerate: () => void;
  onClearPrompt: () => void;
}

export default function ViewerSidebar({
  collapsed,
  currentPrompt,
  finalPrompt,
  projectId,
  architectureTitle,
  architectureSummary,
  onPromptChange,
  onToggle,
  onRegenerate,
  onClearPrompt,
}: ViewerSidebarProps) {
  const sourcePrompt = currentPrompt || finalPrompt;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setSending(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          message: msg,
          project_id: projectId,
          context: {
            title: architectureTitle || "",
            summary: architectureSummary || sourcePrompt || "",
          },
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "Unable to respond right now. Please try again." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Chat is temporarily unavailable. Make sure your backend is running." },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, projectId, architectureTitle, architectureSummary, sourcePrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 300 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="glass-panel relative z-20 h-full shrink-0 border-r border-cyan-300/20 flex flex-col"
    >
      <button
        onClick={onToggle}
        className="absolute -right-3 top-5 z-30 rounded-full border border-cyan-300/30 bg-slate-950/95 p-1.5 text-cyan-200"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex flex-col h-full overflow-hidden px-3 py-4 gap-3">
        {/* Header */}
        <div className="flex items-center gap-2 px-2 shrink-0">
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
          <>
            {/* Prompt Terminal */}
            <div className="rounded-xl border border-cyan-300/25 bg-slate-950/55 p-3 shrink-0">
              <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                Prompt Terminal
              </label>
              <textarea
                value={currentPrompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="h-36 w-full resize-none overflow-y-auto rounded-lg border border-cyan-300/35 bg-slate-950/85 p-3 text-xs text-slate-100 outline-none transition focus:border-cyan-200 focus:shadow-[0_0_18px_rgba(0,245,255,0.3)]"
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

            {/* ── Chat Section ── */}
            <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-cyan-300/20 bg-slate-950/45 overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-300/15 shrink-0">
                <MessageCircle size={13} className="text-cyan-300" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-200 font-bold">
                  Ask about this architecture
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-hide">
                {messages.length === 0 && (
                  <div className="text-[11px] text-slate-500 leading-relaxed pt-1">
                    Ask anything about your architecture — tech choices, scaling strategies, security concerns, and more.
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}
                      className={`max-w-[90%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-cyan-400/15 border border-cyan-300/25 text-cyan-100"
                          : "bg-slate-800/60 border border-slate-600/30 text-slate-200"
                      }`}
                    >
                      {m.content}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-600/30 self-start"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
                        className="block w-1.5 h-1.5 rounded-full bg-cyan-300"
                      />
                    ))}
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex gap-2 p-2 border-t border-cyan-300/15 shrink-0"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  placeholder="Ask a question..."
                  className="flex-1 rounded-lg border border-cyan-300/20 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-300/50 transition"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="rounded-lg bg-cyan-400/20 border border-cyan-300/30 p-2 text-cyan-200 transition hover:bg-cyan-400/35 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </motion.aside>
  );
}
