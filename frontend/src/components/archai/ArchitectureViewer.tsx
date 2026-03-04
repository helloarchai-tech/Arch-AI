"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ReactFlowInstance } from "reactflow";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import ArchitectureCanvas from "./ArchitectureCanvas";
import ComponentWalkthroughPanel from "./ComponentWalkthroughPanel";
import GenerationOverlay from "./GenerationOverlay";
import NeuralBackdrop from "./NeuralBackdrop";
import ViewerSidebar from "./ViewerSidebar";
import ViewerToolbar from "./ViewerToolbar";
import { buildRevealPlan, type BuildPhase } from "./StaggeredReveal";
import type { ArchitecturePayload, ArchEdge, ArchNode } from "./types";

const API = "http://localhost:8000/api";
type ViewerState = "idle" | "loading" | "ready" | "error";

interface ArchitectureViewerProps {
  projectId: string;
}

export default function ArchitectureViewer({ projectId }: ArchitectureViewerProps) {
  const router = useRouter();
  const timersRef = useRef<number[]>([]);
  const canvasReadyRef = useRef(false);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const fullArchitectureRef = useRef<ArchitecturePayload | null>(null);

  const [state, setState] = useState<ViewerState>("idle");
  const [collapsed, setCollapsed] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [finalPrompt, setFinalPrompt] = useState("");
  const [displayNodes, setDisplayNodes] = useState<ArchNode[]>([]);
  const [displayEdges, setDisplayEdges] = useState<ArchEdge[]>([]);
  const [buildPhase, setBuildPhase] = useState<BuildPhase>(1);
  const [revealMeta, setRevealMeta] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [typedSummary, setTypedSummary] = useState("");
  const [stackOpen, setStackOpen] = useState(false);
  const [techStackItems, setTechStackItems] = useState<Array<{ name?: string; technology?: string; category?: string; reason?: string }>>([]);
  const [componentParagraphs, setComponentParagraphs] = useState<Record<string, string>>({});
  const [guidedMode, setGuidedMode] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourDirection, setTourDirection] = useState<"next" | "back">("next");

  const title = fullArchitectureRef.current?.title || "Architecture Studio";

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
    async (idea: string, payload: ArchitecturePayload) => {
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
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
      }
    },
    [projectId]
  );

  const generateArchitecture = useCallback(
    async (promptValue: string) => {
      const cleanPrompt = promptValue.trim();
      if (!cleanPrompt) {
        setState("idle");
        return;
      }
      setCurrentPrompt(cleanPrompt);
      setFinalPrompt(cleanPrompt);
      setState("loading");
      localStorage.setItem("Arch.AI_last_prompt", cleanPrompt);
      localStorage.setItem(`Arch.AI_prompt_${projectId}`, cleanPrompt);
      setComponentParagraphs({});

      try {
        const res = await fetch(`${API}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: cleanPrompt, project_id: projectId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.nodes?.length) throw new Error("Generation failed");
        setTechStackItems(extractTechStack(data));
        fetchComponentParagraphs(cleanPrompt, data);
        startReveal(data);
      } catch {
        const fallback = buildFallbackArchitecture(cleanPrompt);
        setTechStackItems(extractTechStack(fallback));
        fetchComponentParagraphs(cleanPrompt, fallback);
        startReveal(fallback);
      }
    },
    [projectId, startReveal, fetchComponentParagraphs]
  );

  useEffect(() => {
    const bootstrap = async () => {
      const pendingPromptForProject = sessionStorage.getItem(`Arch.AI_pending_idea_${projectId}`) || "";
      const genericPendingPrompt = sessionStorage.getItem("Arch.AI_pending_idea") || "";
      const pendingPromptFromLocal = localStorage.getItem(`Arch.AI_pending_idea_${projectId}`) || "";
      const persistedPromptForProject = localStorage.getItem(`Arch.AI_prompt_${projectId}`) || "";
      const pendingPrompt =
        pendingPromptForProject ||
        genericPendingPrompt ||
        pendingPromptFromLocal ||
        persistedPromptForProject;
      if (pendingPromptForProject) sessionStorage.removeItem(`Arch.AI_pending_idea_${projectId}`);
      if (genericPendingPrompt) sessionStorage.removeItem("Arch.AI_pending_idea");
      if (pendingPromptFromLocal) localStorage.removeItem(`Arch.AI_pending_idea_${projectId}`);

      // Always prioritize the prompt user just entered from landing.
      if (pendingPrompt) {
        setCurrentPrompt(pendingPrompt);
        setFinalPrompt(pendingPrompt);
        await generateArchitecture(pendingPrompt);
        return;
      }

      // Prefer prompt/context already linked to this project id to avoid stale sidebar text.
      try {
        const ctxRes = await fetch(`${API}/project/${projectId}/context`);
        if (ctxRes.ok) {
          const ctx = await ctxRes.json();
          const idea = (ctx?.idea || "").trim();
          const effectivePrompt = idea || persistedPromptForProject;
          if (effectivePrompt) {
            setCurrentPrompt(effectivePrompt);
            setFinalPrompt(effectivePrompt);
            setTechStackItems(extractTechStack(ctx?.current_architecture || {}));
            if (ctx?.current_architecture?.nodes?.length) {
              fullArchitectureRef.current = ctx.current_architecture;
              setDisplayNodes(ctx.current_architecture.nodes || []);
              setDisplayEdges(ctx.current_architecture.edges || []);
              setRevealMeta(true);
              setState("ready");
              return;
            }
            await generateArchitecture(effectivePrompt);
            return;
          }
        }
      } catch {
        // Fallback to pending prompt values.
      }

      // No prompt available: keep clean idle state instead of forcing sample prompt.
      setCurrentPrompt("");
      setFinalPrompt("");
      setTechStackItems([]);
      setState("idle");
    };

    bootstrap();
    return () => clearTimers();
  }, [generateArchitecture, projectId]);

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

  const handleClearPrompt = () => {
    setCurrentPrompt("");
    setFinalPrompt("");
    fullArchitectureRef.current = null;
    setDisplayNodes([]);
    setDisplayEdges([]);
    setRevealMeta(false);
    setTechStackItems([]);
    setState("idle");
    setGuidedMode(false);
    setTourIndex(0);
    localStorage.removeItem("Arch.AI_last_prompt");
    localStorage.removeItem(`Arch.AI_prompt_${projectId}`);
  };

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
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Architecture Viewer</div>
              <div className="max-w-[560px] truncate text-sm font-semibold text-slate-100">{title}</div>
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
            onPromptChange={setCurrentPrompt}
            onToggle={() => setCollapsed((v) => !v)}
            onRegenerate={() => generateArchitecture(currentPrompt)}
            onClearPrompt={handleClearPrompt}
          />
        )}

        <main className="relative min-w-0 flex-1 p-3">
          <motion.div layout className="relative h-full w-full">
            <ViewerToolbar
              onRegenerate={() => generateArchitecture(currentPrompt)}
              onToggleImmersive={() => setImmersive((v) => !v)}
              onStartWalkthrough={startWalkthroughFromBeginning}
              immersive={immersive}
              walkthroughActive={guidedMode}
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
                {state === "error" ? "Unable to generate architecture." : "Preparing architecture canvas..."}
              </div>
            )}

            {state === "loading" && displayNodes.length === 0 && (
              <GenerationOverlay
                phase={buildPhase}
                onFastForward={finishReveal}
                onCancel={finishReveal}
              />
            )}

            <div
              className="absolute right-4 top-4 z-30"
              onMouseEnter={() => setStackOpen(true)}
              onMouseLeave={() => setStackOpen(false)}
            >
              <button className="rounded-lg border border-cyan-300/35 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-cyan-200">
                Tech Stack
              </button>
              {stackOpen && (
                <div className="glass-panel mt-2 w-80 rounded-xl border border-cyan-300/30 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-cyan-200">Generated Stack</div>
                  <div className="max-h-72 space-y-2 overflow-y-auto text-xs text-slate-200">
                    {techStackItems.length ? (
                      techStackItems.map((item, idx) => (
                        <div key={`${item.name || item.technology}-${idx}`} className="rounded-lg border border-slate-500/25 bg-slate-950/45 p-2">
                          <div className="font-semibold text-cyan-100">{item.name || item.technology || "Technology"}</div>
                          <div className="text-[11px] text-slate-300">{item.category || "general"}</div>
                          {item.reason && <div className="mt-1 text-[11px] text-slate-300">{item.reason}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-slate-500/20 bg-slate-900/45 p-2 text-slate-300">
                        Tech stack will appear after architecture generation.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function buildFallbackArchitecture(idea: string): ArchitecturePayload {
  const base = [
    { id: "c1", layer: "client", label: "Web Dashboard Client", tech: "React + TypeScript", x: 130, y: 90 },
    { id: "c2", layer: "client", label: "Farmer Voice Client", tech: "Flutter + Vosk", x: 420, y: 90 },
    { id: "g1", layer: "gateway", label: "API Gateway", tech: "Kong + Rate Limit", x: 300, y: 280 },
    { id: "g2", layer: "gateway", label: "Auth Service", tech: "OAuth2 + JWT", x: 620, y: 280 },
    { id: "s1", layer: "service", label: "Irrigation Controller", tech: "FastAPI + Celery", x: 200, y: 470 },
    { id: "s2", layer: "service", label: "Prediction Engine", tech: "PyTorch + Feature Flags", x: 520, y: 470 },
    { id: "s3", layer: "service", label: "Notification Orchestrator", tech: "Go + Kafka", x: 840, y: 470 },
    { id: "d1", layer: "data", label: "Telemetry Timeseries DB", tech: "TimescaleDB", x: 250, y: 660 },
    { id: "d2", layer: "data", label: "Cache & Session Store", tech: "Redis", x: 560, y: 660 },
    { id: "d3", layer: "data", label: "Analytics Warehouse", tech: "ClickHouse", x: 870, y: 660 },
    { id: "e1", layer: "external", label: "Weather Provider", tech: "OpenWeather API", x: 360, y: 860 },
    { id: "e2", layer: "external", label: "SMS Gateway", tech: "Twilio", x: 700, y: 860 },
  ];

  const nodes: ArchNode[] = base.map((node) => ({
    id: node.id,
    type: "component",
    position: { x: node.x, y: node.y },
    data: {
      label: node.label,
      tech: node.tech,
      description: "Auto-generated fallback component with reasonable production defaults.",
      layer: node.layer as ArchNode["data"]["layer"],
      category:
        node.layer === "data" ? "database" : node.layer === "external" ? "external" : "backend",
      icon:
        node.layer === "client"
          ? "monitor"
          : node.layer === "gateway"
            ? "shield"
            : node.layer === "data"
              ? "database"
              : node.layer === "external"
                ? "globe"
                : "cpu",
    },
  }));

  const edgePairs = [
    ["c1", "g1"],
    ["c2", "g1"],
    ["g1", "g2"],
    ["g1", "s1"],
    ["g1", "s2"],
    ["g2", "s3"],
    ["s1", "d1"],
    ["s2", "d1"],
    ["s2", "d2"],
    ["s2", "d3"],
    ["s3", "d2"],
    ["e1", "s2"],
    ["e2", "s3"],
  ];

  const edges: ArchEdge[] = edgePairs.map(([source, target], idx) => ({
    id: `e${idx}`,
    source,
    target,
    label: "flow",
    animated: true,
  }));

  return {
    title: idea.slice(0, 90),
    summary: "Generated using fallback AI template.",
    nodes,
    edges,
  };
}

function extractTechStack(payload: Partial<ArchitecturePayload> | Record<string, unknown>) {
  const stack = (payload as ArchitecturePayload).techStack;
  if (Array.isArray(stack) && stack.length) {
    return stack.slice(0, 16);
  }

  const nodes = Array.isArray((payload as ArchitecturePayload).nodes)
    ? (payload as ArchitecturePayload).nodes
    : [];
  const dedup = new Map<string, { name?: string; technology?: string; category?: string; reason?: string }>();

  nodes.forEach((node) => {
    const tech = (node.data?.tech || "").trim();
    if (!tech) return;
    const key = tech.toLowerCase();
    if (!dedup.has(key)) {
      dedup.set(key, {
        technology: tech,
        category: node.data?.layer || node.data?.category || "general",
        reason: "Derived from generated component metadata.",
      });
    }
  });

  return Array.from(dedup.values()).slice(0, 16);
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

