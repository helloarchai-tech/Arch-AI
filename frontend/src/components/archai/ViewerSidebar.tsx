"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Cpu, Send, MessageCircle, FolderOpen, Plus, Clock, Tag, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useProjects, type Project } from "@/hooks/useProjects";

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
  /** Called when user picks an existing project from the list */
  onLoadProject?: (project: Project) => void;
  /** Called when user wants to create a new project — shows prompt input */
  onNewProject?: (idea: string) => void;
}

type SidebarTab = "projects" | "chat";

export default function ViewerSidebar({
  collapsed,
  currentPrompt,
  projectId,
  architectureTitle,
  onToggle,
  onRegenerate,
  onLoadProject,
  onNewProject,
}: ViewerSidebarProps) {
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects(user?.id);

  const [tab, setTab] = useState<SidebarTab>("projects");
  const [newIdeaInput, setNewIdeaInput] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Currently active project for chat context
  const activeProject = projects.find((p) => p.project_id === projectId);

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
      const phases = activeProject?.keywords || [];
      const systemName = activeProject?.name || architectureTitle || currentPrompt.slice(0, 60);

      const res = await fetch(`${API}/chat-with-context`, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          message: msg,
          project_id: projectId,
          phases,
          system_name: systemName,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "Unable to respond right now." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Chat is temporarily unavailable. Make sure your backend is running." },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, projectId, activeProject, architectureTitle, currentPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleNewProject = () => {
    const idea = newIdeaInput.trim();
    if (!idea) return;
    setShowNewInput(false);
    setNewIdeaInput("");
    onNewProject?.(idea);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return ""; }
  };

  return (
    <motion.div
      animate={{ width: collapsed ? 0 : 210 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{ overflow: "hidden", flexShrink: 0, position: "relative" }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        style={{
          position: "absolute",
          right: collapsed ? -32 : -16,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 20,
          background: "rgba(99,102,241,0.9)",
          border: "none",
          borderRadius: "50%",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div style={{
        width: 210,
        height: "100%",
        background: "linear-gradient(180deg, rgba(15,15,30,0.98) 0%, rgba(10,10,25,0.98) 100%)",
        borderRight: "1px solid rgba(99,102,241,0.15)",
        display: "flex",
        flexDirection: "column",
        padding: "16px 0 0 0",
        overflowY: "auto",
        overflowX: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "0 14px 12px", borderBottom: "1px solid rgba(99,102,241,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Cpu size={14} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: 0.5 }}>Arch.AI</div>
              <div style={{ fontSize: 9, color: "#6ee7b7", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ee7b7", display: "inline-block" }} />
                AI Agent · Live
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(99,102,241,0.12)" }}>
          {(["projects", "chat"] as SidebarTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "9px 0",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: tab === t ? "#6366f1" : "#64748b",
                borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              {t === "projects" ? <FolderOpen size={11} /> : <MessageCircle size={11} />}
              {t}
            </button>
          ))}
        </div>

        {/* ── PROJECTS TAB ── */}
        <AnimatePresence mode="wait">
          {tab === "projects" && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 10px" }}
            >
              {/* New Project button */}
              <button
                onClick={() => setShowNewInput((v) => !v)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
                  border: "1px solid rgba(99,102,241,0.35)",
                  color: "#a5b4fc",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                  transition: "all 0.2s",
                }}
              >
                <Plus size={12} /> New Project
              </button>

              {/* New project input */}
              <AnimatePresence>
                {showNewInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginBottom: 10, overflow: "hidden" }}
                  >
                    <textarea
                      value={newIdeaInput}
                      onChange={(e) => setNewIdeaInput(e.target.value)}
                      placeholder="Describe your new project idea..."
                      rows={3}
                      style={{
                        width: "100%",
                        background: "rgba(99,102,241,0.08)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: 8,
                        padding: "8px 10px",
                        color: "#e2e8f0",
                        fontSize: 11,
                        resize: "none",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      onClick={handleNewProject}
                      style={{
                        width: "100%",
                        padding: "7px",
                        borderRadius: 8,
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        border: "none",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        marginTop: 6,
                      }}
                    >
                      Generate Architecture
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Regenerate current */}
              <button
                onClick={onRegenerate}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "rgba(20,20,40,0.6)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  color: "#94a3b8",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                ↻ Regenerate Current
              </button>

              {/* Section label */}
              <div style={{ fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                Your Projects
              </div>

              {/* Project list */}
              {projectsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                  <Loader2 size={18} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : projects.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 10px", color: "#475569", fontSize: 11 }}>
                  <FolderOpen size={22} color="#374151" style={{ margin: "0 auto 8px" }} />
                  <div>No projects yet.</div>
                  <div style={{ marginTop: 4, color: "#374151" }}>Generate your first architecture!</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {projects.map((proj) => (
                    <motion.button
                      key={proj.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { onLoadProject?.(proj); setTab("chat"); }}
                      style={{
                        background: proj.project_id === projectId
                          ? "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))"
                          : "rgba(20,20,40,0.5)",
                        border: proj.project_id === projectId
                          ? "1px solid rgba(99,102,241,0.5)"
                          : "1px solid rgba(99,102,241,0.1)",
                        borderRadius: 8,
                        padding: "9px 10px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", marginBottom: 3, lineHeight: 1.3 }}>
                        {proj.name.length > 40 ? proj.name.slice(0, 40) + "…" : proj.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        <Clock size={9} color="#64748b" />
                        <span style={{ fontSize: 9, color: "#64748b" }}>{formatDate(proj.created_at)}</span>
                      </div>
                      {proj.keywords?.slice(0, 2).map((kw) => (
                        <span key={kw} style={{
                          display: "inline-block",
                          fontSize: 8,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: "rgba(99,102,241,0.15)",
                          color: "#a5b4fc",
                          marginRight: 3,
                          marginBottom: 2,
                        }}>
                          <Tag size={7} style={{ marginRight: 2, verticalAlign: "middle" }} />
                          {kw.length > 12 ? kw.slice(0, 12) + "…" : kw}
                        </span>
                      ))}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── CHAT TAB ── */}
          {tab === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
            >
              {/* Chat label */}
              <div style={{ padding: "8px 14px 4px", fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: 1, textTransform: "uppercase" }}>
                Ask About This Architecture
              </div>

              {!activeProject && projects.length === 0 && (
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "8px 10px", display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <AlertCircle size={12} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 10, color: "#fcd34d", lineHeight: 1.4 }}>
                      Generate an architecture first — then ask questions about it here.
                    </span>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                      background: msg.role === "user"
                        ? "linear-gradient(135deg,rgba(99,102,241,0.35),rgba(139,92,246,0.35))"
                        : "rgba(30,30,50,0.8)",
                      border: msg.role === "user"
                        ? "1px solid rgba(99,102,241,0.4)"
                        : "1px solid rgba(255,255,255,0.06)",
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "90%",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 11, color: "#e2e8f0", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </p>
                  </motion.div>
                ))}

                {/* Typing animation */}
                {sending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "12px 12px 12px 4px",
                      background: "rgba(30,30,50,0.8)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      alignSelf: "flex-start",
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                    }}
                  >
                    {[0, 0.18, 0.36].map((delay, idx) => (
                      <motion.span
                        key={idx}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay }}
                        style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", display: "block" }}
                      />
                    ))}
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "8px 10px 14px", borderTop: "1px solid rgba(99,102,241,0.1)" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question..."
                    style={{
                      flex: 1,
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      color: "#e2e8f0",
                      fontSize: 11,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      border: "none",
                      cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: sending || !input.trim() ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    <Send size={12} color="#fff" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
