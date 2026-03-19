"""
Ollama-driven architecture generation agent.

The component JSON files are treated as structural templates only. For each user
prompt we fetch fresh component names, relationships, and tech stack from the LLM.
"""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from typing import Callable, Optional

logger = logging.getLogger("archai.ollama_agent")

COMPONENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "components")
CONSTRAINTS = ["client", "gateway", "service", "data", "external"]

LAYER_Y = {
    "client": 80,
    "gateway": 300,
    "service": 540,
    "data": 780,
    "external": 1020,
}

LAYER_CATEGORY = {
    "client": "frontend",
    "gateway": "backend",
    "service": "backend",
    "data": "database",
    "external": "external",
}


def _slug(text: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower()).strip("_")
    return value[:40] or f"node_{uuid.uuid4().hex[:6]}"


def _parse_json_response(text: str) -> Optional[dict]:
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    for marker in ("```json", "```"):
        if marker in text:
            try:
                start = text.index(marker) + len(marker)
                end = text.index("```", start)
                return json.loads(text[start:end].strip())
            except (ValueError, json.JSONDecodeError):
                pass
    try:
        first = text.index("{")
        last = text.rindex("}") + 1
        return json.loads(text[first:last])
    except (ValueError, json.JSONDecodeError):
        return None


def _safe_list(value: object) -> list:
    return value if isinstance(value, list) else []


def _safe_str(value: object, default: str = "") -> str:
    return value if isinstance(value, str) else default


def _load_templates() -> dict[str, list[dict]]:
    """
    Build a per-layer template pool from all component JSON files.
    Templates are used only for visual metadata defaults.
    """
    layer_templates: dict[str, list[dict]] = {layer: [] for layer in CONSTRAINTS}
    if not os.path.isdir(COMPONENTS_DIR):
        return layer_templates

    for filename in os.listdir(COMPONENTS_DIR):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(COMPONENTS_DIR, filename)
        try:
            with open(path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            for comp in payload.get("components", []):
                layer = comp.get("layer")
                if layer in layer_templates:
                    layer_templates[layer].append(comp)
        except Exception as exc:
            logger.warning("Template load failed for %s: %s", path, exc)
    return layer_templates


def _pick_template_meta(layer: str, idx: int, templates: dict[str, list[dict]]) -> dict:
    pool = templates.get(layer, [])
    if not pool:
        default_icon = {
            "client": "monitor",
            "gateway": "shield",
            "service": "cpu",
            "data": "database",
            "external": "globe",
        }[layer]
        return {"category": LAYER_CATEGORY[layer], "icon": default_icon, "tech": ""}

    template = pool[idx % len(pool)]
    return {
        "category": template.get("category", LAYER_CATEGORY[layer]),
        "icon": template.get("icon", "cpu"),
        "tech": template.get("tech", ""),
    }


def _build_fallback_layer(layer: str) -> dict:
    defaults = {
        "client": ["Web Client", "Mobile Client"],
        "gateway": ["API Gateway", "Auth Service"],
        "service": ["Core Service", "Notification Worker"],
        "data": ["Primary Database", "Cache"],
        "external": ["Payment Provider"],
    }
    names = defaults[layer]
    return {
        "constraint": layer,
        "components": [{"name": n, "tech": ""} for n in names],
        "relationships": [],
    }


def _estimate_cost(nodes: list[dict]) -> dict:
    base_low = 30
    base_high = 110
    total_low = len(nodes) * base_low
    total_high = len(nodes) * base_high
    return {
        "monthly": f"${total_low:,} - ${total_high:,}",
        "yearly": f"${total_low * 12:,} - ${total_high * 12:,}",
        "breakdown": [],
    }


def _score_health(nodes: list[dict], edges: list[dict]) -> dict:
    count = len(nodes)
    density = (len(edges) / max(count, 1)) if count else 0
    return {
        "scalability": min(10, max(5, round(6 + (count / 8)))),
        "costEfficiency": min(10, max(4, round(8 - (count / 10)))),
        "security": min(10, max(4, round(6 + (density / 2)))),
        "maintainability": min(10, max(4, round(8 - (density / 2)))),
    }


def _to_node_id_lookup(nodes: list[dict]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for node in nodes:
        label = _safe_str(node.get("data", {}).get("label")).strip().lower()
        if label:
            lookup[label] = node["id"]
    return lookup


def _build_system_message() -> str:
    """Strong system-level instruction prepended to every LLM call."""
    return (
        "You are an expert software architect. You design architectures that are "
        "UNIQUE and SPECIFIC to each user's product idea. "
        "NEVER produce generic boilerplate. Every component name, technology choice, "
        "and relationship MUST reflect the user's actual product domain. "
        "For example, if the user wants a 'food delivery app', components should be named "
        "'Order Service', 'Restaurant Dashboard', 'Delivery Tracker', NOT 'Core Service' or 'Component 1'. "
        "Always return ONLY valid JSON with no extra text."
    )


def _build_layer_prompt(idea: str, layer: str, global_context: dict) -> str:
    layer_guidance = {
        "client": "frontend/client-facing components the end-user interacts with (web apps, mobile apps, dashboards, admin panels specific to this product)",
        "gateway": "API gateways, load balancers, auth middleware, rate limiters — the entry points that protect and route traffic for this specific system",
        "service": "core backend/business-logic services that implement the SPECIFIC features of this product (NOT generic names — name them after what they actually do)",
        "data": "databases, caches, message queues, data stores — pick technologies that match this product's specific data patterns",
        "external": "third-party APIs, external services, cloud providers this specific product would integrate with",
    }
    return (
        f"You are designing the '{layer}' layer of a software architecture.\n"
        f"Layer purpose: {layer_guidance.get(layer, 'system components')}.\n\n"
        f"THE PRODUCT: {idea}\n\n"
        "CRITICAL RULES:\n"
        f"1. constraint MUST be '{layer}' exactly.\n"
        "2. Component names MUST be specific to this product. "
        "Do NOT use generic names like 'Core Service', 'Main Component', or 'Service A'. "
        "Name each component after its actual role in THIS specific system.\n"
        "3. Tech choices must match what this specific product needs.\n"
        "4. Keep 2-5 components (only what this product actually needs).\n"
        "5. Relationships should reference component names from OTHER layers when needed.\n\n"
        "Return ONLY JSON:\n"
        "{\n"
        f'  "constraint": "{layer}",\n'
        '  "components": [{"name": "Product-Specific Name", "tech": "Actual Technology", "description": "What it does in this system"}],\n'
        '  "relationships": [{"source": "Component Name", "target": "Other Component", "relation": "what data flows", "animated": true}]\n'
        "}\n\n"
        f"System context so far: {json.dumps(global_context)}\n"
    )


def _build_global_prompt(idea: str) -> str:
    return (
        "Analyze this product idea and extract the architecture intent.\n"
        "Think deeply about what THIS SPECIFIC product needs — its unique domain, "
        "the specific data it handles, the user interactions it supports, "
        "and the integrations it requires.\n\n"
        f"PRODUCT IDEA: {idea}\n\n"
        "Return ONLY JSON:\n"
        "{\n"
        '  "system_name": "A specific name for this system (not generic)",\n'
        '  "problem_summary": "What problem this product solves and its key requirements",\n'
        '  "key_features": ["feature1", "feature2", "..."],\n'
        '  "domain_specific_concerns": ["concern1", "concern2"],\n'
        '  "cross_constraint_relationships": [\n'
        '    {"source": "Specific Component", "target": "Other Component", "relation": "what flows between them"}\n'
        "  ]\n"
        "}\n"
    )


def _build_stack_prompt(idea: str, layer_payloads: list[dict]) -> str:
    return (
        "Based on the product idea and the architecture components already designed, "
        "generate a SPECIFIC tech stack tailored to this product's needs.\n"
        "Do NOT suggest generic stacks — pick technologies that solve this product's "
        "actual requirements (e.g., if it's a real-time app, suggest WebSocket/Socket.io; "
        "if it handles payments, suggest Stripe; if it needs search, suggest Elasticsearch).\n\n"
        f"PRODUCT IDEA: {idea}\n\n"
        "Return ONLY JSON:\n"
        "{\n"
        '  "tech_stack": [\n'
        '    {"name": "Technology Name", "category": "frontend|backend|database|infra|external", "reason": "Why this product specifically needs it"}\n'
        "  ]\n"
        "}\n"
        "Include 6-12 items. Reasons must reference this specific product.\n"
        f"Architecture designed so far: {json.dumps(layer_payloads)}\n"
    )


def generate_dynamic_architecture(
    idea: str,
    call_llm: Callable[[list[dict], float], Optional[str]],
    project_id: Optional[str] = None,
) -> dict:
    """
    Generate architecture content dynamically with Ollama.
    The fixed constraints are client/gateway/service/data/external.
    """
    pid = project_id or f"proj_{uuid.uuid4().hex[:12]}"
    templates = _load_templates()
    sys_msg = {"role": "system", "content": _build_system_message()}

    global_context: dict = {}
    global_resp = call_llm(
        [sys_msg, {"role": "user", "content": _build_global_prompt(idea)}],
        0.4,
    )
    parsed_global = _parse_json_response(global_resp or "")
    if parsed_global:
        global_context = parsed_global

    layer_payloads: list[dict] = []
    for layer in CONSTRAINTS:
        layer_resp = call_llm(
            [sys_msg, {"role": "user", "content": _build_layer_prompt(idea, layer, global_context)}],
            0.5,
        )
        parsed = _parse_json_response(layer_resp or "")
        if parsed and isinstance(parsed.get("components"), list):
            layer_payloads.append(parsed)
        else:
            layer_payloads.append(_build_fallback_layer(layer))

    stack_resp = call_llm(
        [sys_msg, {"role": "user", "content": _build_stack_prompt(idea, layer_payloads)}],
        0.3,
    )
    parsed_stack = _parse_json_response(stack_resp or "") or {}
    tech_stack = _safe_list(parsed_stack.get("tech_stack"))
    if not tech_stack:
        tech_stack = [
            {"name": "Frontend Framework", "category": "client", "reason": "UI for end users"},
            {"name": "API Gateway", "category": "gateway", "reason": "Routing and auth entry point"},
            {"name": "Application Service", "category": "service", "reason": "Business logic execution"},
            {"name": "Primary Database", "category": "data", "reason": "Persistent storage"},
        ]

    nodes: list[dict] = []
    all_relationships: list[dict] = _safe_list(global_context.get("cross_constraint_relationships"))
    for layer in CONSTRAINTS:
        payload = next((p for p in layer_payloads if p.get("constraint") == layer), None)
        components = _safe_list(payload.get("components") if payload else None)
        if not components:
            components = _build_fallback_layer(layer)["components"]
        count = len(components)
        spacing = 280
        total_width = max(0, (count - 1) * spacing)
        start_x = max(100, (1400 - total_width) // 2)
        y = LAYER_Y[layer]

        for idx, comp in enumerate(components):
            name = _safe_str(comp.get("name"), f"{layer.title()} Component {idx + 1}")
            node_id = _slug(f"{layer}_{name}_{idx}")
            template_meta = _pick_template_meta(layer, idx, templates)
            tech = _safe_str(comp.get("tech"), template_meta["tech"])
            nodes.append(
                {
                    "id": node_id,
                    "type": "component",
                    "position": {"x": start_x + idx * spacing, "y": y},
                    "data": {
                        "label": name,
                        "category": template_meta["category"],
                        "icon": template_meta["icon"],
                        "tech": tech,
                        "layer": layer,
                        "description": _safe_str(comp.get("description")),
                    },
                }
            )
        all_relationships.extend(_safe_list(payload.get("relationships") if payload else None))

    node_lookup = _to_node_id_lookup(nodes)
    edges: list[dict] = []
    edge_seen: set[tuple[str, str, str]] = set()

    def add_edge(source_name: str, target_name: str, relation: str, animated: bool) -> None:
        source_id = node_lookup.get(source_name.strip().lower())
        target_id = node_lookup.get(target_name.strip().lower())
        if not source_id or not target_id or source_id == target_id:
            return
        key = (source_id, target_id, relation.strip().lower())
        if key in edge_seen:
            return
        edge_seen.add(key)
        edges.append(
            {
                "id": f"e{len(edges)}",
                "source": source_id,
                "target": target_id,
                "label": relation[:40],
                "animated": animated,
            }
        )

    for rel in all_relationships:
        source = _safe_str(rel.get("source"))
        target = _safe_str(rel.get("target"))
        if not source or not target:
            continue
        relation = _safe_str(rel.get("relation"), "connects")
        animated = bool(rel.get("animated", True))
        add_edge(source, target, relation, animated)

    # Ensure at least a readable linear flow across constraints.
    layer_first: dict[str, str] = {}
    for layer in CONSTRAINTS:
        node = next((n for n in nodes if n.get("data", {}).get("layer") == layer), None)
        if node:
            layer_first[layer] = _safe_str(node.get("data", {}).get("label"))

    for source_layer, target_layer in zip(CONSTRAINTS, CONSTRAINTS[1:]):
        source_name = layer_first.get(source_layer)
        target_name = layer_first.get(target_layer)
        if source_name and target_name:
            add_edge(source_name, target_name, f"{source_layer}->{target_layer}", True)

    health_scores = _score_health(nodes, edges)
    summary = (
        f"Dynamic architecture generated from prompt using Ollama across "
        f"{', '.join(CONSTRAINTS)} constraints with {len(nodes)} components."
    )

    return {
        "project_id": pid,
        "title": _safe_str(global_context.get("system_name"), idea[:80]),
        "summary": summary,
        "domain": "dynamic",
        "domain_label": "Prompt-Driven Architecture",
        "nodes": nodes,
        "edges": edges,
        "techStack": tech_stack,
        "costEstimate": _estimate_cost(nodes),
        "healthScores": health_scores,
        "healthDetails": {
            key: {"score": value, "reasons": ["Generated from dynamic prompt analysis"]}
            for key, value in health_scores.items()
        },
        "risks": [],
        "securitySuggestions": [],
        "generationMode": "ollama_dynamic_constraints",
    }
