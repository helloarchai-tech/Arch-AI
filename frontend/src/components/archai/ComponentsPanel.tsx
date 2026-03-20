"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Server,
  Database,
  Globe,
  Shield,
  ChevronRight,
} from "lucide-react";
import type { ArchNode } from "./types";

/* ─── Layer → segment mapping ─────────────────────────────────────── */
const FRONTEND_LAYERS = new Set(["client"]);
const BACKEND_LAYERS  = new Set(["gateway", "service", "external"]);
const DATA_LAYERS     = new Set(["data"]);

const LAYER_COLOR: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  client:   { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.35)",  text: "#a5b4fc", dot: "#818cf8" },
  gateway:  { bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.30)",  text: "#fcd34d", dot: "#fbbf24" },
  service:  { bg: "rgba(0,245,255,0.08)",   border: "rgba(0,245,255,0.25)",   text: "#67e8f9", dot: "#06b6d4" },
  data:     { bg: "rgba(123,97,255,0.12)",  border: "rgba(123,97,255,0.35)",  text: "#c4b5fd", dot: "#7c3aed" },
  external: { bg: "rgba(255,95,125,0.10)",  border: "rgba(255,95,125,0.30)",  text: "#fca5a5", dot: "#f87171" },
};

const LAYER_ICON: Record<string, React.ComponentType<{ size: number; color?: string }>> = {
  client:   Monitor,
  gateway:  Shield,
  service:  Server,
  data:     Database,
  external: Globe,
};

function getLayerColors(layer: string) {
  return LAYER_COLOR[layer] || { bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)", text: "#94a3b8", dot: "#64748b" };
}

interface ComponentCardProps {
  node: ArchNode;
  index: number;
}

function ComponentCard({ node, index }: ComponentCardProps) {
  const layer = node.data?.layer || "service";
  const colors = getLayerColors(layer);
  const Icon = LAYER_ICON[layer] || Server;

  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: "9px 11px",
        marginBottom: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow accent */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 3,
        height: "100%",
        background: `linear-gradient(180deg, ${colors.dot}, transparent)`,
        borderRadius: "10px 0 0 10px",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 7, paddingLeft: 6 }}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: `${colors.dot}22`,
          border: `1px solid ${colors.dot}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}>
          <Icon size={11} color={colors.dot} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 2,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {node.data?.label || "Component"}
          </div>

          {node.data?.tech && (
            <div style={{
              fontSize: 9,
              color: colors.text,
              background: `${colors.dot}18`,
              border: `1px solid ${colors.dot}30`,
              borderRadius: 4,
              padding: "1px 5px",
              display: "inline-block",
              fontWeight: 600,
              letterSpacing: 0.3,
              marginBottom: node.data?.description ? 4 : 0,
            }}>
              {node.data.tech}
            </div>
          )}

          {node.data?.description && (
            <div style={{
              fontSize: 9.5,
              color: "#94a3b8",
              lineHeight: 1.4,
              marginTop: 3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {node.data.description}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface SegmentSectionProps {
  title: string;
  icon: React.ComponentType<{ size: number; color?: string }>;
  accentColor: string;
  nodes: ArchNode[];
  defaultOpen?: boolean;
}

function SegmentSection({ title, icon: Icon, accentColor, nodes, defaultOpen = true }: SegmentSectionProps) {
  // Always open (collapsible removed per design — just show all)
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Section header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        marginBottom: 8,
        padding: "0 2px",
      }}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          background: `${accentColor}22`,
          border: `1px solid ${accentColor}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={12} color={accentColor} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: 0.8, textTransform: "uppercase" }}>
            {title}
          </div>
          <div style={{ fontSize: 8.5, color: "#475569", marginTop: 1 }}>
            {nodes.length} component{nodes.length !== 1 ? "s" : ""}
          </div>
        </div>
        <ChevronRight size={12} color="#475569" />
      </div>

      {/* Cards */}
      <div>
        {nodes.map((node, i) => (
          <ComponentCard key={node.id} node={node} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Panel ───────────────────────────────────────────────────── */
interface ComponentsPanelProps {
  nodes: ArchNode[];
  visible: boolean;
}

export default function ComponentsPanel({ nodes, visible }: ComponentsPanelProps) {
  const { frontendNodes, backendNodes, dataNodes } = useMemo(() => {
    const frontend: ArchNode[] = [];
    const backend:  ArchNode[] = [];
    const data:     ArchNode[] = [];

    for (const node of nodes) {
      const layer = node.data?.layer || "service";
      if (FRONTEND_LAYERS.has(layer))      frontend.push(node);
      else if (DATA_LAYERS.has(layer))     data.push(node);
      else if (BACKEND_LAYERS.has(layer))  backend.push(node);
      else                                 backend.push(node);
    }

    return { frontendNodes: frontend, backendNodes: backend, dataNodes: data };
  }, [nodes]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="components-panel"
          initial={{ opacity: 0, x: 32, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 280 }}
          exit={{ opacity: 0, x: 32, width: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{
            height: "100%",
            flexShrink: 0,
            background: "linear-gradient(180deg, rgba(10,10,28,0.98) 0%, rgba(8,8,22,0.98) 100%)",
            borderLeft: "1px solid rgba(99,102,241,0.12)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Panel Header */}
          <div style={{
            padding: "14px 14px 10px",
            borderBottom: "1px solid rgba(99,102,241,0.1)",
            flexShrink: 0,
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#6366f1",
              marginBottom: 3,
            }}>
              Architecture Segments
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {nodes.length} total components
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[
                { label: "Frontend", count: frontendNodes.length, color: "#818cf8" },
                { label: "Backend", count: backendNodes.length, color: "#06b6d4" },
                { label: "Data", count: dataNodes.length, color: "#7c3aed" },
              ].map((s) => (
                <div key={s.label} style={{
                  flex: 1,
                  background: `${s.color}14`,
                  border: `1px solid ${s.color}30`,
                  borderRadius: 7,
                  padding: "4px 0",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 7.5, color: "#64748b", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 16px" }}>
            {frontendNodes.length > 0 && (
              <SegmentSection
                title="Frontend"
                icon={Monitor}
                accentColor="#818cf8"
                nodes={frontendNodes}
              />
            )}

            {backendNodes.length > 0 && (
              <SegmentSection
                title="Backend"
                icon={Server}
                accentColor="#06b6d4"
                nodes={backendNodes}
              />
            )}

            {dataNodes.length > 0 && (
              <SegmentSection
                title="Data Layer"
                icon={Database}
                accentColor="#7c3aed"
                nodes={dataNodes}
              />
            )}

            {nodes.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 40, color: "#374151" }}>
                <Server size={24} style={{ margin: "0 auto 10px" }} />
                <div style={{ fontSize: 11 }}>No architecture loaded</div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
