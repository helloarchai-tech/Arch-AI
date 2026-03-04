"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BrainCircuit, Sparkles } from "lucide-react";
import type { Node } from "reactflow";
import ArchitectureCanvas from "@/components/ArchitectureCanvas";
import ExportControls from "@/components/ExportControls";
import NodeIntelligencePanel from "@/components/NodeIntelligencePanel";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

type WorkspaceState = "idle" | "generating" | "ready" | "error";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TechStackItem {
  name?: string;
  technology?: string;
  category?: string;
  reason?: string;
}

interface ArchitectureResponse {
  title?: string;
  summary?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  edges?: any[];
  techStack?: TechStackItem[];
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [state, setState] = useState<WorkspaceState>("idle");
  const [idea, setIdea] = useState("");
  const [architecture, setArchitecture] = useState<ArchitectureResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [stackOpen, setStackOpen] = useState(false);
  const stackCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const techStack = useMemo(() => architecture?.techStack || [], [architecture]);
  const workspaceTitle = useMemo(() => {
    const title = architecture?.title?.trim();
    if (title) return title;
    return "Architecture Workspace";
  }, [architecture]);
  const showLoadingOverlay = state === "generating";

  const generateArchitecture = useCallback(
    async (ideaText: string) => {
      setState("generating");
      setChatMessages([
        { role: "assistant", content: "Generating dynamic architecture from your prompt..." },
      ]);
      try {
        const res = await fetch(`${API}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
          body: JSON.stringify({ idea: ideaText, project_id: projectId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.detail || "Generation failed");
        }
        setArchitecture(data);
        setState("ready");
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `${data.summary || "Architecture ready."}\n\nComponents: ${data.nodes?.length || 0}, Relationships: ${data.edges?.length || 0}.`,
          },
        ]);
      } catch (err) {
        console.error(err);
        setState("error");
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I could not generate the architecture right now. Please try again.",
          },
        ]);
      }
    },
    [projectId]
  );

  useEffect(() => {
    const pendingIdea = sessionStorage.getItem("archai_pending_idea");
    const saved = sessionStorage.getItem("archai_project");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.nodes?.length) {
          setArchitecture(parsed);
          setIdea(parsed.title || "");
          setState("ready");
          setChatMessages([
            {
              role: "assistant",
              content: `Loaded existing architecture.\n\n${parsed.summary || ""}`,
            },
          ]);
          sessionStorage.removeItem("archai_project");
          return;
        }
      } catch {
        // Ignore malformed session data.
      }
    }

    if (!pendingIdea) {
      setState("idle");
      setChatMessages([
        {
          role: "assistant",
          content: "Describe a system idea and I will generate a fresh architecture with AI.",
        },
      ]);
      return;
    }

    setIdea(pendingIdea);
    sessionStorage.removeItem("archai_pending_idea");
    generateArchitecture(pendingIdea);
  }, [generateArchitecture]);

  useEffect(() => {
    setSelectedNode(null);
  }, [architecture]);

  const handleChat = async (message: string) => {
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({
          message,
          project_id: projectId,
          context: architecture ? { title: architecture.title, summary: architecture.summary } : {},
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      if (data.updated_architecture) setArchitecture(data.updated_architecture);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Chat is temporarily unavailable." },
      ]);
    }
  };

  const openStack = () => {
    if (stackCloseTimer.current) {
      clearTimeout(stackCloseTimer.current);
      stackCloseTimer.current = null;
    }
    setStackOpen(true);
  };

  const closeStack = () => {
    stackCloseTimer.current = setTimeout(() => setStackOpen(false), 150);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background:
          "radial-gradient(circle at 14% 8%, #d9eeff 0%, #f3fbff 36%, #edf7f4 100%)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          height: "68px",
          minHeight: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
          borderBottom: "1px solid rgba(15,23,42,0.09)",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              color: "#334155",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #0058d9, #0f9d8a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BrainCircuit size={16} color="white" />
          </div>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#0f172a",
              maxWidth: "560px",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
            title={workspaceTitle}
          >
            {workspaceTitle}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{ position: "relative", paddingBottom: "6px", marginBottom: "-6px" }}
            onMouseEnter={openStack}
            onMouseLeave={closeStack}
          >
            <button
              style={{
                padding: "9px 14px",
                borderRadius: "11px",
                border: "1px solid #bcd0ea",
                background: "white",
                color: "#0f172a",
                fontSize: "12px",
                fontWeight: 800,
                boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
              }}
            >
              Tech Stack
            </button>
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                width: "360px",
                maxHeight: "420px",
                overflowY: "auto",
                borderRadius: "12px",
                background: "white",
                border: "1px solid #dbe4f0",
                boxShadow: "0 20px 40px rgba(15,23,42,0.15)",
                padding: "14px",
                opacity: stackOpen ? 1 : 0,
                pointerEvents: stackOpen ? "auto" : "none",
                transition: "opacity 0.2s ease",
                zIndex: 40,
              }}
              onMouseEnter={openStack}
              onMouseLeave={closeStack}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#0f172a",
                  fontWeight: 700,
                  marginBottom: "10px",
                }}
              >
                Tech Stack
              </div>
              {techStack.length ? (
                techStack.map((tech: TechStackItem, i: number) => (
                  <div
                    key={`${tech.name || tech.technology}-${i}`}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      marginBottom: "8px",
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                        {tech.name || tech.technology || "Technology"}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#0b61d8",
                          textTransform: "uppercase",
                        }}
                      >
                        {tech.category || "general"}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "11px",
                        color: "#475569",
                        lineHeight: 1.45,
                      }}
                    >
                      {tech.reason || ""}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "12px", color: "#64748b" }}>No stack details yet.</div>
              )}
            </div>
          </div>
          <ExportControls architecture={architecture ?? undefined} />
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        <div
          style={{
            width: "360px",
            minWidth: "360px",
            borderRight: "1px solid rgba(15,23,42,0.1)",
            display: "flex",
            flexDirection: "column",
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #eef2f7",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Sparkles size={12} style={{ color: "#0b61d8" }} />
            <span style={{ fontSize: "11px", color: "#0b61d8", fontWeight: 700 }}>
              AI Agent
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "10px",
                background:
                  state === "generating"
                    ? "#fff7ed"
                    : state === "error"
                      ? "#fef2f2"
                      : "#ecfdf5",
                color:
                  state === "generating"
                    ? "#b45309"
                    : state === "error"
                      ? "#b91c1c"
                      : "#047857",
              }}
            >
              {state === "generating" ? "Generating..." : state === "error" ? "Error" : "Ready"}
            </span>
          </div>

          <div
            style={{
              margin: "14px 16px 0",
              borderRadius: "14px",
              border: "1px solid #cfe0f5",
              background: "linear-gradient(140deg, #ffffff, #f2f8ff)",
              padding: "12px 13px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#0b61d8",
                fontWeight: 800,
                marginBottom: "7px",
              }}
            >
              Prompt
            </div>
            <div style={{ fontSize: "13px", lineHeight: 1.5, color: "#0f172a", fontWeight: 600 }}>
              {idea || "Waiting for prompt..."}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "10px",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                {msg.role !== "user" && (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #0058d9, #0f9d8a)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    <Sparkles size={12} color="white" />
                  </div>
                )}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    lineHeight: 1.55,
                    color: "#0f172a",
                    maxWidth: "86%",
                    background: msg.role === "user" ? "#dbeafe" : "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {state === "generating" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "14px",
                  borderRadius: "10px",
                  background: "#eff6ff",
                  border: "1px solid #dbeafe",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    border: "2px solid #93c5fd",
                    borderTopColor: "#2563eb",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#1d4ed8" }}>
                  Calling AI for each architecture constraint...
                </span>
              </div>
            )}
          </div>

          {state !== "generating" && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid #eef2f7" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem("chatInput") as HTMLInputElement;
                  if (input?.value.trim()) {
                    handleChat(input.value.trim());
                    input.value = "";
                  }
                }}
                style={{ display: "flex", gap: "8px" }}
              >
                <input
                  name="chatInput"
                  placeholder="Ask about this architecture..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "white",
                    border: "1px solid #cbd5e1",
                    color: "#0f172a",
                    fontSize: "13px",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #0058d9, #0f9d8a)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Go
                </button>
              </form>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          {architecture?.nodes?.length ? (
            <div style={{ width: "100%", height: "100%" }}>
              <ArchitectureCanvas
                nodes={architecture.nodes || []}
                edges={architecture.edges || []}
                onSelectNode={setSelectedNode}
              />
              <NodeIntelligencePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#475569",
                fontSize: "14px",
              }}
            >
              {state === "generating" ? "Generating architecture..." : "No architecture yet."}
            </div>
          )}
        </div>
      </div>

      {showLoadingOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 60,
            background: "rgba(245, 250, 255, 0.82)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "all",
          }}
        >
          <div
            style={{
              width: "min(560px, 90vw)",
              borderRadius: "20px",
              border: "1px solid #cfe3ff",
              background: "linear-gradient(150deg, #ffffff, #f1f8ff)",
              boxShadow: "0 30px 60px rgba(15,23,42,0.15)",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                margin: "0 auto 18px",
                borderRadius: "9999px",
                border: "6px solid #dbeafe",
                borderTopColor: "#2563eb",
                animation: "spin 0.9s linear infinite",
              }}
            />
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a", marginBottom: "8px" }}>
              Loading Your Architecture
            </div>
            <div style={{ fontSize: "14px", color: "#334155", lineHeight: 1.7 }}>
              AI calls are running for client, gateway, service, data, and external constraints.
              <br />
              Please wait while we configure your diagram.
            </div>
            <div
              style={{
                marginTop: "16px",
                width: "100%",
                height: "10px",
                borderRadius: "9999px",
                background: "#e2e8f0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: "35%",
                  borderRadius: "9999px",
                  background: "linear-gradient(90deg, #2563eb, #0ea5e9, #14b8a6)",
                  animation: "loader-slide 1.4s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes loader-slide {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(340%);
          }
        }
      `}</style>
    </div>
  );
}
