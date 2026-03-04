"use client";

import type { ArchEdge, ArchNode } from "./types";

export type BuildPhase = 1 | 2 | 3 | 4 | 5 | 6;

export interface RevealStep {
  at: number;
  type: "phase" | "node" | "edge" | "complete";
  phase?: BuildPhase;
  node?: ArchNode;
  edge?: ArchEdge;
}

const LAYER_ORDER = ["client", "gateway", "service", "data", "external"];

export function buildRevealPlan(nodes: ArchNode[], edges: ArchEdge[]): { steps: RevealStep[]; duration: number } {
  const durationCap = nodes.length > 30 ? 12000 : 10000;
  const steps: RevealStep[] = [];

  const byLayer = [...nodes].sort((a, b) => {
    const aIdx = LAYER_ORDER.indexOf(a.data.layer || "service");
    const bIdx = LAYER_ORDER.indexOf(b.data.layer || "service");
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.position.x - b.position.x;
  });

  const firstNode = byLayer[0];
  const remainingNodes = byLayer.slice(1);
  const edgeStagger = nodes.length > 30 ? 180 : 220;
  const nodeStagger = nodes.length > 30 ? 170 : 300;

  steps.push({ at: 0, type: "phase", phase: 1 });
  steps.push({ at: 1000, type: "phase", phase: 2 });
  if (firstNode) steps.push({ at: 1200, type: "node", node: firstNode });

  steps.push({ at: 3000, type: "phase", phase: 3 });
  edges.forEach((edge, idx) => {
    steps.push({ at: 3200 + idx * edgeStagger, type: "edge", edge });
  });

  steps.push({ at: 6000, type: "phase", phase: 4 });
  remainingNodes.forEach((node, idx) => {
    steps.push({ at: 6200 + idx * nodeStagger, type: "node", node });
  });

  steps.push({ at: Math.min(durationCap - 1300, 9000), type: "phase", phase: 5 });
  steps.push({ at: Math.min(durationCap - 300, 9700), type: "phase", phase: 6 });
  steps.push({ at: durationCap, type: "complete" });

  return { steps, duration: durationCap };
}
