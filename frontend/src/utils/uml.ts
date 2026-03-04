export type ArchNode = {
    id: string;
    data: {
        label?: string;
        category?: string;
        layer?: string;
        tech?: string;
    };
    position?: { x: number; y: number };
};

export type ArchEdge = {
    id: string;
    source: string;
    target: string;
    label?: string;
};

const LAYER_ORDER = ["client", "gateway", "service", "data", "external"];

const sanitize = (value: string) => value.replace(/[^A-Za-z0-9_]/g, "_");

const nodeKeyword = (category?: string) => {
    if (!category) return "component";
    if (category === "database" || category === "data") return "database";
    if (category === "external") return "actor";
    return "component";
};

export function toPlantUML(nodes: ArchNode[] = [], edges: ArchEdge[] = []) {
    const lines: string[] = ["@startuml"];

    nodes.forEach((n) => {
        const name = n.data?.label || n.id;
        const id = sanitize(n.id);
        const keyword = nodeKeyword(n.data?.category);
        lines.push(`${keyword} "${name}" as ${id}`);
    });

    edges.forEach((e) => {
        const source = sanitize(e.source);
        const target = sanitize(e.target);
        const label = e.label ? ` : ${e.label}` : "";
        lines.push(`${source} --> ${target}${label}`);
    });

    lines.push("@enduml");
    return lines.join("\n");
}

export function buildSequenceFromGraph(nodes: ArchNode[] = [], edges: ArchEdge[] = []) {
    // Order lifelines by layer if available, fallback to their appearance order
    const orderedNodes = [...nodes].sort((a, b) => {
        const la = LAYER_ORDER.indexOf((a.data?.layer || "").toLowerCase());
        const lb = LAYER_ORDER.indexOf((b.data?.layer || "").toLowerCase());
        if (la === -1 && lb === -1) return 0;
        if (la === -1) return 1;
        if (lb === -1) return -1;
        return la - lb;
    });

    const lifelines = orderedNodes.map((n) => n.data?.label || n.id);

    const flow = edges.map((e) => {
        const from = nodes.find((n) => n.id === e.source);
        const to = nodes.find((n) => n.id === e.target);
        if (!from || !to) return null;
        return {
            from: from.data?.label || from.id,
            to: to.data?.label || to.id,
            label: e.label || "",
        };
    }).filter(Boolean) as { from: string; to: string; label: string }[];

    return { lifelines, messages: flow };
}
