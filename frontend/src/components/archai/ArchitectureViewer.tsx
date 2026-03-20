"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ReactFlowInstance } from "reactflow";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import ArchitectureCanvas from "./ArchitectureCanvas";
import ComponentWalkthroughPanel from "./ComponentWalkthroughPanel";
import ComponentsPanel from "./ComponentsPanel";
import GenerationOverlay from "./GenerationOverlay";
import NeuralBackdrop from "./NeuralBackdrop";
import ViewerSidebar from "./ViewerSidebar";
import ViewerToolbar from "./ViewerToolbar";
import { buildRevealPlan, type BuildPhase } from "./StaggeredReveal";
import type { ArchitecturePayload, ArchEdge, ArchNode } from "./types";
import { useAuth } from "@/components/AuthContext";
import type { Project } from "@/hooks/useProjects";

const RAW_API =
  process.env.NEXT_PUBLIC_DIRECT_BACKEND === "true"
    ? (process.env.NEXT_PUBLIC_API_URL || "/backend-api")
    : "/backend-api";
const _trimmed = RAW_API.replace(/\/+$/, "");
const API = _trimmed.endsWith("/api") || _trimmed.endsWith("/backend-api")
  ? _trimmed
  : `${_trimmed}/api`;
const API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

/** Returns auth headers — prefers a JWT stored at login, falls back to static API key. */
function getAuthHeaders(): Record<string, string> {
  const token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || API_KEY;
  const headers: Record<string, string> = {
    "x-api-key": API_KEY,
    "X-Pinggy-No-Screen": "true",
    "X-Pinggy-Allow-Origin": "*",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
type ViewerState = "idle" | "loading" | "ready" | "error";

interface ArchitectureViewerProps {
  projectId?: string;
}

export default function ArchitectureViewer({ projectId: initialProjectId = "" }: ArchitectureViewerProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const timersRef = useRef<number[]>([]);
  const canvasReadyRef = useRef(false);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const fullArchitectureRef = useRef<ArchitecturePayload | null>(null);
  const refetchProjectsRef = useRef<(() => void) | null>(null);

  const [state, setState] = useState<ViewerState>("idle");
  const [collapsed, setCollapsed] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(initialProjectId);
  const [pendingProjectName, setPendingProjectName] = useState<string | null>(null); // shown while generating
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [finalPrompt, setFinalPrompt] = useState("");
  const [displayNodes, setDisplayNodes] = useState<ArchNode[]>([]);
  const [displayEdges, setDisplayEdges] = useState<ArchEdge[]>([]);
  const [buildPhase, setBuildPhase] = useState<BuildPhase>(1);
  const [revealMeta, setRevealMeta] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [typedSummary, setTypedSummary] = useState("");
  const [componentParagraphs, setComponentParagraphs] = useState<Record<string, string>>({});
  const [guidedMode, setGuidedMode] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourDirection, setTourDirection] = useState<"next" | "back">("next");
  const [walkthroughLoading, setWalkthroughLoading] = useState(false);

  const title = fullArchitectureRef.current?.title || "Architecture Studio";

  // Auth guard — redirect to landing page if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    setActiveProjectId(initialProjectId);
  }, [initialProjectId]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const finishReveal = useCallback(() => {
    const full = fullArchitectureRef.current;
    if (!full) return;
    clearTimers();
    setDisplayNodes(full.nodes || []);
    setDisplayEdges(full.edges || []);
    setBuildPhase(6);
    setRevealMeta(true);
    setState("ready");
    setShowToast(true);
    setGuidedMode((full.nodes || []).length > 0);
    setTourIndex(0);
    setTypedSummary("");
    setPendingProjectName(null); // clear placeholder — real name from arch now
    const hideId = window.setTimeout(() => setShowToast(false), 2200);
    timersRef.current.push(hideId);
    console.log("[Arch.AI] phase 6: complete");
  }, []);

  const orderedTourNodes = useMemo(() => {
    const nodes = displayNodes || [];
    const order = ["client", "gateway", "service", "data", "external"];
    return [...nodes].sort((a, b) => {
      const aIdx = order.indexOf(a.data.layer || "service");
      const bIdx = order.indexOf(b.data.layer || "service");
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.position.x - b.position.x;
    });
  }, [displayNodes]);

  const focusedTourNode = orderedTourNodes[tourIndex] || null;

  useEffect(() => {
    if (!guidedMode || !focusedTourNode || !flowRef.current) return;
    const renderedNode = flowRef.current.getNode(focusedTourNode.id);
    if (!renderedNode) return;
    const x = renderedNode.positionAbsolute?.x ?? renderedNode.position.x;
    const y = renderedNode.positionAbsolute?.y ?? renderedNode.position.y;
    // Center using the rendered canvas position so walkthrough always pulls the right node into view.
    flowRef.current.setCenter(x + 170, y + 85, {
      zoom: 0.9,
      duration: 700,
    });
  }, [guidedMode, focusedTourNode, tourIndex]);

  const startReveal = useCallback((architecture: ArchitecturePayload) => {
    clearTimers();
    fullArchitectureRef.current = architecture;
    setDisplayNodes([]);
    setDisplayEdges([]);
    setRevealMeta(false);
    setBuildPhase(1);
    setTypedSummary("");
    setState("loading");
    console.log("[Arch.AI] phase 1: canvas + generating overlay");

    const { steps } = buildRevealPlan(architecture.nodes || [], architecture.edges || []);
    steps.forEach((step) => {
      const id = window.setTimeout(() => {
        if (step.type === "phase" && step.phase) {
          setBuildPhase(step.phase);
          if (step.phase >= 5) setRevealMeta(true);
          console.log(`[Arch.AI] phase ${step.phase}`);
          return;
        }
        if (step.type === "node" && step.node) {
          setDisplayNodes((prev) =>
            prev.find((n) => n.id === step.node!.id) ? prev : [...prev, step.node!]
          );
          return;
        }
        if (step.type === "edge" && step.edge) {
          setDisplayEdges((prev) =>
            prev.find((e) => e.id === step.edge!.id) ? prev : [...prev, step.edge!]
          );
          return;
        }
        if (step.type === "complete") {
          finishReveal();
        }
      }, step.at);
      timersRef.current.push(id);
    });
  }, [finishReveal]);

  const fetchComponentParagraphs = useCallback(
    async (idea: string, payload: ArchitecturePayload, forProjectId: string) => {
      setWalkthroughLoading(true);
      const nodeNameById = new Map((payload.nodes || []).map((node) => [node.id, node.data?.label || node.id]));
      const components = (payload.nodes || []).map((node) => ({
        id: node.id,
        name: node.data?.label || "",
        label: node.data?.label || "",
        layer: node.data?.layer || "service",
        tech: node.data?.tech || "",
        description: node.data?.description || "",
        connections: (payload.edges || [])
          .filter((e) => e.source === node.id || e.target === node.id)
          .map((e) => {
            const outbound = e.source === node.id;
            const targetId = outbound ? e.target : e.source;
            return {
              component: nodeNameById.get(targetId) || targetId,
              relation: e.label || "connects to",
              direction: outbound ? "outbound" : "inbound",
            };
          }),
      }));
      try {
        const res = await fetch(`${API}/component-paragraphs`, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            project_id: forProjectId,
            idea,
            components,
          }),
        });
        const data = await res.json();
        if (res.ok && data?.paragraphs) {
          setComponentParagraphs(data.paragraphs);
        }
      } catch {
        // Silent fallback to internal paragraph builder.
      } finally {
        setWalkthroughLoading(false);
      }
    },
    []
  );



  const generateArchitecture = useCallback(
    async (promptValue: string, preferredProjectId?: string) => {
      const cleanPrompt = promptValue.trim();
      if (!cleanPrompt) {
        setState("idle");
        return;
      }
      const requestedProjectId = (preferredProjectId || activeProjectId || `proj_${Date.now().toString(36)}`).trim();
      setCurrentPrompt(cleanPrompt);
      setFinalPrompt(cleanPrompt);
      setState("loading");
      localStorage.setItem("Arch.AI_last_prompt", cleanPrompt);
      localStorage.setItem(`Arch.AI_prompt_${requestedProjectId}`, cleanPrompt);
      setComponentParagraphs({});

      try {
        // 1. Fire-and-forget — backend returns instantly with project_id
        const startRes = await fetch(`${API}/generate`, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ idea: cleanPrompt, project_id: requestedProjectId }),
        });
        const startData = await startRes.json();
        if (!startRes.ok) throw new Error(startData?.detail || "Failed to start generation");

        const effectiveProjectId = startData.project_id || requestedProjectId;
        setActiveProjectId(effectiveProjectId);
        console.log("[Arch.AI] Generation started for project:", effectiveProjectId);

        // 2. Poll /status every 3s until ready (max 10 minutes)
        const MAX_POLLS = 200;
        for (let i = 0; i < MAX_POLLS; i++) {
          await new Promise((r) => setTimeout(r, 3000));

          const statusRes = await fetch(`${API}/project/${effectiveProjectId}/status`, {
            mode: "cors",
            credentials: "omit",
            headers: getAuthHeaders(),
          });
          const statusData = await statusRes.json();
          console.log(`[Arch.AI] Poll ${i + 1}: status=${statusData?.status}`);

          if (statusData?.status === "ready") {
            const data = statusData.result;
            if (!data?.nodes?.length) throw new Error("Generation returned empty architecture");
            fetchComponentParagraphs(cleanPrompt, data, effectiveProjectId);
            startReveal(data);

            // Save via server-side proxy (avoids CORS / 502 from browser direct call)
            if (user?.id) {
              fetch("/api/save-project", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: user.id,
                  project_id: effectiveProjectId,
                  idea: cleanPrompt,
                  architecture: data,
                }),
              })
                .then(async (res) => {
                  if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    console.warn(`[Arch.AI] project save returned ${res.status}:`, txt);
                  } else {
                    console.log("[Arch.AI] project saved successfully:", effectiveProjectId);
                    // Force projects list refresh in sidebar
                    refetchProjectsRef.current?.();
                  }
                })
                .catch((e) => console.warn("[Arch.AI] project save failed:", e));
            }
            return;
          }
          if (statusData?.status === "error") {
            throw new Error(statusData?.error || "Architecture generation failed");
          }
        }
        throw new Error("Generation timed out after 10 minutes");
      } catch (error) {
        console.error("[Arch.AI] generation failed:", error instanceof Error ? error.message : error);
        clearTimers();
        fullArchitectureRef.current = null;
        setDisplayNodes([]);
        setDisplayEdges([]);
        setRevealMeta(false);
        setState("error");
      }
    },
    [activeProjectId, startReveal, fetchComponentParagraphs, user]
  );

  /** Load a project from Supabase data — no LLM call needed */
  const loadProjectFromDB = useCallback((proj: Project) => {
    setActiveProjectId(proj.project_id);
    const arch = proj.architecture as unknown as ArchitecturePayload;
    setCurrentPrompt(proj.idea || proj.name);
    setFinalPrompt(proj.idea || proj.name);
    localStorage.setItem(`Arch.AI_prompt_${proj.project_id}`, (proj.idea || proj.name || "").trim());
    setComponentParagraphs({});
    if (!arch?.nodes?.length) {
      fullArchitectureRef.current = null;
      setDisplayNodes([]);
      setDisplayEdges([]);
      setRevealMeta(false);
      setState("idle");
      return;
    }
    startReveal(arch);
  }, [startReveal]);

  /** Start a brand new project from sidebar input */
  const handleNewProjectIdea = useCallback((idea: string) => {
    const freshProjectId = `proj_${Date.now().toString(36)}`;

    // Immediately wipe old architecture so UI feels responsive
    clearTimers();
    fullArchitectureRef.current = null;
    setDisplayNodes([]);
    setDisplayEdges([]);
    setRevealMeta(false);
    setGuidedMode(false);
    setComponentParagraphs({});
    setTypedSummary("");
    setState("loading");

    // Show a placeholder name in the header immediately
    const shortIdea = idea.trim().split(" ").slice(0, 6).join(" ");
    setPendingProjectName(shortIdea);

    setActiveProjectId(freshProjectId);
    setCurrentPrompt(idea);
    setFinalPrompt(idea);
    generateArchitecture(idea, freshProjectId);
  }, [generateArchitecture, clearTimers]);


  useEffect(() => {
    const bootstrap = async () => {
      if (!initialProjectId) {
        setCurrentPrompt("");
        setFinalPrompt("");
        setState("idle");
        return;
      }

      const persistedPromptForProject = localStorage.getItem(`Arch.AI_prompt_${initialProjectId}`) || "";

      try {
        const ctxRes = await fetch(`${API}/project/${initialProjectId}/context`, {
          mode: "cors",
          credentials: "omit",
          headers: getAuthHeaders(),
        });
        if (ctxRes.ok) {
          const ctx = await ctxRes.json();
          const idea = (ctx?.idea || "").trim();
          const effectivePrompt = idea || persistedPromptForProject;
          if (effectivePrompt) {
            setCurrentPrompt(effectivePrompt);
            setFinalPrompt(effectivePrompt);
            if (ctx?.current_architecture?.nodes?.length) {
              setActiveProjectId(initialProjectId);
              fullArchitectureRef.current = ctx.current_architecture;
              setDisplayNodes(ctx.current_architecture.nodes || []);
              setDisplayEdges(ctx.current_architecture.edges || []);
              setRevealMeta(true);
              setState("ready");
              return;
            }
          }
        }
      } catch {
        // Keep dashboard idle if the context call fails.
      }

      setCurrentPrompt("");
      setFinalPrompt("");
      setState("idle");
    };

    bootstrap();
    return () => clearTimers();
  }, [initialProjectId]);

  useEffect(() => {
    if (!revealMeta) return;
    const summary =
      fullArchitectureRef.current?.summary ||
      `Components: ${displayNodes.length} | Relationships: ${displayEdges.length}`;
    let idx = 0;
    setTypedSummary("");
    const id = window.setInterval(() => {
      idx += 1;
      setTypedSummary(summary.slice(0, idx));
      if (idx >= summary.length) window.clearInterval(id);
    }, 14);
    return () => window.clearInterval(id);
  }, [revealMeta, displayNodes.length, displayEdges.length]);

  const handleTourNext = () => {
    if (!guidedMode) return;
    if (tourIndex + 1 >= orderedTourNodes.length) {
      setGuidedMode(false);
      return;
    }
    setTourDirection("next");
    setTourIndex((v) => v + 1);
  };

  const handleTourBack = () => {
    if (!guidedMode) return;
    if (tourIndex <= 0) return;
    setTourDirection("back");
    setTourIndex((v) => v - 1);
  };

  const startWalkthroughFromBeginning = () => {
    if (!displayNodes.length) return;
    setGuidedMode(true);
    setTourDirection("next");
    setTourIndex(0);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden" onClick={() => state === "loading" && finishReveal()}>
      <NeuralBackdrop dense />
      <div className="relative z-30 flex h-8 items-center justify-center border-b border-amber-300/25 bg-amber-400/10 text-xs font-semibold text-amber-100">
        Arch.AI can make mistakes.
      </div>

      {!immersive && (
        <header className="glass-panel relative z-20 flex h-16 items-center justify-between border-b border-slate-500/25 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-lg border border-slate-400/30 p-2 text-slate-200 transition hover:border-cyan-300/60 hover:text-cyan-200"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Dashboard</div>
              <div className="max-w-[560px] truncate text-sm font-semibold text-slate-100">
                {pendingProjectName ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
                    Generating: {pendingProjectName}…
                  </span>
                ) : title}
              </div>
            </div>
          </div>
        </header>
      )}

      <div className={`relative z-10 flex ${immersive ? "h-[calc(100vh-32px)]" : "h-[calc(100vh-96px)]"}`}>
        {!immersive && (
          <ViewerSidebar
            collapsed={collapsed}
            currentPrompt={currentPrompt}
            finalPrompt={finalPrompt}
            projectId={activeProjectId}
            architectureTitle={fullArchitectureRef.current?.title}
            architectureSummary={fullArchitectureRef.current?.summary}
            onPromptChange={setCurrentPrompt}
            onToggle={() => setCollapsed((v) => !v)}
            onLoadProject={loadProjectFromDB}
            onNewProject={handleNewProjectIdea}
            onRegisterRefetch={(fn) => { refetchProjectsRef.current = fn; }}
            pendingProjectName={pendingProjectName}
          />
        )}

        <main className="relative min-w-0 flex-1 p-3">
          <motion.div layout className="relative h-full w-full">
            <ViewerToolbar
              onToggleImmersive={() => setImmersive((v) => !v)}
              onStartWalkthrough={startWalkthroughFromBeginning}
              immersive={immersive}
              walkthroughActive={guidedMode}
              architecture={fullArchitectureRef.current}
              flowInstance={flowRef.current}
            />

            {displayNodes.length ? (
              <ArchitectureCanvas
                nodes={displayNodes}
                edges={displayEdges}
                onSelectNode={(node) => {
                  if (!node) return;
                  const idx = orderedTourNodes.findIndex((n) => n.id === node.id);
                  if (idx >= 0) {
                    setTourDirection("next");
                    setTourIndex(idx);
                    setGuidedMode(true);
                  }
                }}
                revealMeta={revealMeta}
                guidedMode={guidedMode}
                focusNodeId={focusedTourNode?.id || null}
                onCanvasReady={(instance: ReactFlowInstance) => {
                  flowRef.current = instance;
                  if (!canvasReadyRef.current) {
                    canvasReadyRef.current = true;
                    console.log("[Arch.AI] canvas ready", !!instance);
                  }
                }}
              />
            ) : (
              <div className="glass-panel flex h-full items-center justify-center rounded-2xl border border-slate-500/20 text-slate-300">
                {state === "error"
                  ? "Unable to generate architecture."
                  : "Select an existing project or create a new project to load architecture."}
              </div>
            )}

            {state === "loading" && displayNodes.length === 0 && (
              <GenerationOverlay
                phase={buildPhase}
                onFastForward={finishReveal}
                onCancel={finishReveal}
              />
            )}

            {revealMeta && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel absolute bottom-4 left-4 right-4 z-20 rounded-xl border border-cyan-300/20 px-4 py-2 text-xs text-slate-200"
              >
                <div className="mb-1 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                  <span>Tech Stack: {(fullArchitectureRef.current?.techStack || []).length}</span>
                  <span>Components: {displayNodes.length}</span>
                  <span>Relationships: {displayEdges.length}</span>
                </div>
                <div className="font-mono text-[12px] text-slate-200">
                  {typedSummary}
                  <span className="animate-pulse text-cyan-300">|</span>
                </div>
              </motion.div>
            )}

            {guidedMode && focusedTourNode && (
              <ComponentWalkthroughPanel
                componentName={String(focusedTourNode.data.label || "Component")}
                paragraph={
                  componentParagraphs[focusedTourNode.id] ||
                  buildComponentParagraph(focusedTourNode, tourIndex, orderedTourNodes.length)
                }
                index={tourIndex}
                total={orderedTourNodes.length}
                direction={tourDirection}
                onBack={handleTourBack}
                onNext={handleTourNext}
                onClose={() => setGuidedMode(false)}
              />
            )}

            <AnimatePresence>
              {showToast && (
                <motion.div
                  initial={{ opacity: 0, y: -24, x: 30 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -14, x: 16 }}
                  className="absolute right-4 top-4 z-50 rounded-xl border border-green-300/45 bg-green-400/15 px-4 py-2 text-sm text-green-200 shadow-[0_0_30px_rgba(34,197,94,0.25)]"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    Architecture Assembled!
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Walkthrough Loading Overlay */}
            <AnimatePresence>
              {walkthroughLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="walkthrough-loading-overlay"
                >
                  <div className="walkthrough-loading-card">
                    <div className="walkthrough-spinner" />
                    <h4>Preparing Walkthrough</h4>
                    <p>AI is generating detailed explanations for each component...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>

        {/* ── Components Panel (right side) ── */}
        {!immersive && (
          <ComponentsPanel
            nodes={displayNodes}
            visible={state === "ready" && displayNodes.length > 0}
          />
        )}
      </div>
    </div>
  );
}

function buildComponentParagraph(node: ArchNode, index: number, total: number) {
  const layer = (node.data.layer || "service").toUpperCase();
  const tech = node.data.tech || "Generated runtime";
  return [
    `This is component ${index + 1} of ${total} in the ${layer} layer.`,
    `${node.data.label} is responsible for a key boundary in this architecture.`,
    `It currently runs on ${tech}, selected by AI for this workflow.`,
    "It exchanges data with connected components through the highlighted links.",
    "Use this step to validate responsibility, placement, and integration flow.",
  ].join("\n");
}
