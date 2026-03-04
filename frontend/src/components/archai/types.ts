export type ArchLayer = "client" | "gateway" | "service" | "data" | "external";

export interface ArchNodeData {
  label: string;
  category: string;
  tech?: string;
  icon?: string;
  layer?: ArchLayer;
  description?: string;
}

export interface ArchNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: ArchNodeData;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface TechStackItem {
  name?: string;
  technology?: string;
  category?: string;
  reason?: string;
}

export interface ArchitecturePayload {
  project_id?: string;
  title?: string;
  summary?: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
  techStack?: TechStackItem[];
}
