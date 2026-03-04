"""
Arch.AI — Architecture Reasoner (Gen-3: Constraint-Driven)

Constraint-driven component selection engine. Replaces flat "include everything"
logic with necessity scoring, scale-tier injection, and dependency chaining.

Pipeline:
  1. Load domain components
  2. Normalize constraints (via constraint_normalizer)
  3. Score each component's necessity (include_score)
  4. Inject scale-tier requirements
  5. Resolve dependency chains
  6. Layout, edge, cost, summary generation
"""

import json
import os
import logging
import uuid
from typing import Optional

logger = logging.getLogger("Arch.AI.reasoner")

COMPONENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "components")

# ── Layer Y positions for diagram layout ──────────────────────────────────
LAYER_Y = {
    "client": 0,
    "gateway": 160,
    "service": 340,
    "data": 530,
    "external": 720,
}

# ── Necessity score threshold ─────────────────────────────────────────────
# Components must meet this minimum to be included in the architecture.
INCLUSION_THRESHOLD = 2

# ── Scale-tier → auto-inject component IDs ────────────────────────────────
# These are injected by ID if they exist in the domain library.
SCALE_INJECT: dict[str, list[str]] = {
    "enterprise": ["load_balancer", "cdn", "cache", "message_queue", "monitoring", "workers"],
    "growth":     ["load_balancer", "cache", "message_queue", "monitoring"],
    "medium":     ["cache", "monitoring"],
    "startup":    [],
    "mvp":        [],
}

# ── Feature → auto-inject component IDs ───────────────────────────────────
FEATURE_INJECT: dict[str, list[str]] = {
    "real_time":        ["websocket_service", "message_queue", "real_time_server"],
    "async_processing": ["message_queue", "workers", "webhook_manager"],
    "ai_feature":       ["ml_service", "model_registry"],
    "search":           ["search_engine"],
    "payments":         ["payment_service"],
    "file_storage":     ["object_storage"],
    "analytics":        ["monitoring", "analytics_service"],
    "caching":          ["cache"],
    "notifications":    ["notification_service", "push_service"],
}

# ── Complexity ceilings by budget ─────────────────────────────────────────
COMPLEXITY_CEILING: dict[str, int] = {
    "low":    5,    # MVP: exclude components with complexity > 5
    "medium": 7,    # Standard: exclude very heavy components
    "high":   10,   # Enterprise: include everything
}

# ── Scale order for min_scale comparison ──────────────────────────────────
SCALE_ORDER = {"mvp": 0, "startup": 1, "medium": 2, "growth": 3, "enterprise": 4}


# ══════════════════════════════════════════════════════════════════════════
#  COMPONENT LOADING
# ══════════════════════════════════════════════════════════════════════════

def _load_domain_components(domain: str) -> list[dict]:
    """Load components from domain JSON, with registry fallback (future-proof)."""
    # Future: check for global registry.json first
    registry_path = os.path.join(COMPONENTS_DIR, "registry.json")
    if os.path.exists(registry_path):
        return _load_from_registry(registry_path, domain)

    # Current: domain-specific JSON files
    filepath = os.path.join(COMPONENTS_DIR, f"{domain}.json")
    if not os.path.exists(filepath):
        logger.warning(f"No component file for domain '{domain}', using fallback")
        filepath = os.path.join(COMPONENTS_DIR, "ai_saas.json")
    if not os.path.exists(filepath):
        return []

    with open(filepath, "r") as f:
        data = json.load(f)
    return data.get("components", [])


def _load_from_registry(registry_path: str, domain: str) -> list[dict]:
    """Future-proof: load from unified registry if it exists."""
    try:
        with open(registry_path, "r") as f:
            registry = json.load(f)
        # Registry format: { "components": {...}, "domains": { "api_platform": ["id1", "id2"] } }
        all_components = {c["id"]: c for c in registry.get("components", [])}
        domain_ids = registry.get("domains", {}).get(domain, [])
        if domain_ids:
            return [all_components[cid] for cid in domain_ids if cid in all_components]
    except Exception as e:
        logger.warning(f"Registry load failed: {e}")

    # Fallback to domain file
    filepath = os.path.join(COMPONENTS_DIR, f"{domain}.json")
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f).get("components", [])
    return []


# ══════════════════════════════════════════════════════════════════════════
#  NECESSITY SCORING — replaces "include by default"
# ══════════════════════════════════════════════════════════════════════════

def _score_necessity(
    comp: dict,
    constraints: dict,
) -> tuple[int, str]:
    """
    Score how necessary a component is for this specific architecture.

    Returns (score, reason) — include if score >= INCLUSION_THRESHOLD.

    Scoring:
      +3  core component
      +2  feature match (requires_features ∩ active features)
      +2  scale-tier auto-inject
      +1  feature-inject match
      -3  complexity too high for budget
      -2  high latency impact in latency-sensitive architecture
      -1  non-core in MVP scale
    """
    score = 0
    reason = ""

    features = constraints.get("features", {})
    scale_tier = constraints.get("scale_tier", "medium")
    complexity_budget = constraints.get("complexity_budget", "medium")
    latency_sensitivity = constraints.get("latency_sensitivity", "medium")

    comp_id = comp.get("id", "")
    comp_complexity = comp.get("complexity_weight", 5)
    comp_latency = comp.get("latency_impact", 10)

    # ── Positive signals ──────────────────────────────────────
    # Core components always get strong inclusion signal
    if comp.get("core", False):
        score += 3
        reason = "core"

    # requires_features match
    required = comp.get("requires_features", [])
    if required and any(features.get(f, False) for f in required):
        score += 2
        reason = "feature-match"

    # Scale-tier auto-inject
    inject_list = SCALE_INJECT.get(scale_tier, [])
    if comp_id in inject_list:
        score += 2
        reason = "scale-inject"

    # Feature-inject
    for feat_name, inject_ids in FEATURE_INJECT.items():
        if features.get(feat_name, False) and comp_id in inject_ids:
            score += 1
            reason = reason or "feature-inject"
            break

    # ── Negative signals ──────────────────────────────────────
    # min_scale enforcement: component requires higher scale tier
    comp_min_scale = comp.get("min_scale", "mvp")
    if SCALE_ORDER.get(comp_min_scale, 0) > SCALE_ORDER.get(scale_tier, 2):
        score -= 2
        reason = f"requires {comp_min_scale} scale (current: {scale_tier})"

    # Complexity ceiling enforcement
    ceiling = COMPLEXITY_CEILING.get(complexity_budget, 7)
    if comp_complexity > ceiling and not comp.get("core", False):
        score -= 3
        reason = f"complexity({comp_complexity})>ceiling({ceiling})"

    # High latency in sensitive arch
    if latency_sensitivity == "high" and comp_latency > 40 and not comp.get("core", False):
        score -= 2
        reason = f"latency({comp_latency}ms) in sensitive arch"

    # MVP penalty for non-core
    if scale_tier == "mvp" and not comp.get("core", False) and score < 2:
        score -= 1

    return score, reason


# ══════════════════════════════════════════════════════════════════════════
#  DEPENDENCY CHAINING
# ══════════════════════════════════════════════════════════════════════════

def _resolve_dependencies(
    selected_ids: set[str],
    all_components_map: dict[str, dict],
) -> set[str]:
    """
    Recursively resolve dependencies for selected components.
    Prevents duplicates. Deterministic traversal order.
    """
    resolved = set(selected_ids)
    queue = list(selected_ids)

    while queue:
        comp_id = queue.pop(0)
        comp = all_components_map.get(comp_id)
        if not comp:
            continue

        deps = comp.get("dependencies", [])
        for dep_id in deps:
            if dep_id not in resolved and dep_id in all_components_map:
                resolved.add(dep_id)
                queue.append(dep_id)
                logger.debug(f"Dependency chain: {comp_id} → {dep_id}")

    return resolved


# ══════════════════════════════════════════════════════════════════════════
#  LAYOUT + EDGES + STACK + COST (unchanged logic, kept for compatibility)
# ══════════════════════════════════════════════════════════════════════════

def _layout_nodes(components: list[dict]) -> list[dict]:
    """Assign positions to nodes in a layered layout."""
    layer_groups: dict[str, list[dict]] = {
        "client": [], "gateway": [], "service": [],
        "data": [], "external": [],
    }
    for comp in components:
        layer = comp.get("layer", "service")
        if layer not in layer_groups:
            layer = "service"
        layer_groups[layer].append(comp)

    nodes = []
    for layer_name, comps in layer_groups.items():
        y = LAYER_Y.get(layer_name, 340)
        count = len(comps)
        if count == 0:
            continue
        total_width = (count - 1) * 220
        start_x = max(50, (900 - total_width) // 2)

        for i, comp in enumerate(comps):
            x = start_x + i * 220
            node = {
                "id": comp["id"],
                "type": "component",
                "position": {"x": x, "y": y},
                "data": {
                    "label": comp["name"],
                    "category": comp.get("category", "backend"),
                    "tech": comp.get("tech", ""),
                    "icon": comp.get("icon", "cpu"),
                },
            }
            nodes.append(node)
    return nodes


def _generate_edges(components: list[dict]) -> list[dict]:
    """Generate edges between components based on declared connections."""
    comp_ids = {c["id"] for c in components}
    edges = []
    edge_id = 0
    for comp in components:
        deps = comp.get("connects_to", [])
        for dep in deps:
            target_id = dep if isinstance(dep, str) else dep.get("target", "")
            if target_id in comp_ids:
                label = dep.get("label", "") if isinstance(dep, dict) else ""
                animated = dep.get("animated", False) if isinstance(dep, dict) else False
                edges.append({
                    "id": f"e{edge_id}",
                    "source": comp["id"],
                    "target": target_id,
                    "label": label,
                    "animated": animated,
                })
                edge_id += 1
    return edges


def _build_tech_stack(components: list[dict]) -> list[dict]:
    """Extract tech stack from selected components."""
    seen = set()
    stack = []
    for comp in components:
        cat = comp.get("stack_category", comp.get("category", ""))
        tech = comp.get("tech", "")
        reason = comp.get("tech_reason", "")
        if cat and tech and cat not in seen:
            seen.add(cat)
            stack.append({"category": cat, "technology": tech, "reason": reason})
    return stack


def _estimate_costs(components: list[dict], scale_tier: str) -> dict:
    """Estimate cloud costs from component metadata."""
    multiplier = {"mvp": 0.5, "startup": 1.0, "growth": 2.0, "enterprise": 4.0, "medium": 1.0}
    mult = multiplier.get(scale_tier, 1.0)

    breakdown = []
    total_low = 0
    total_high = 0

    for comp in components:
        cost = comp.get("base_cost", {})
        if cost:
            low = int(cost.get("low", 0) * mult)
            high = int(cost.get("high", 0) * mult)
            total_low += low
            total_high += high
            breakdown.append({"service": comp["name"], "cost": f"${low}-{high}/mo"})

    return {
        "monthly": f"${total_low:,} - ${total_high:,}",
        "yearly": f"${total_low * 12:,} - ${total_high * 12:,}",
        "breakdown": breakdown,
    }


def _add_external_systems(
    components: list[dict],
    external_systems: list[dict],
    existing_ids: set,
) -> tuple[list[dict], list[dict]]:
    """Add external system nodes and edges."""
    ext_comps = []
    ext_edges = []
    edge_id = 100

    for i, ext in enumerate(external_systems[:5]):
        ext_id = f"ext_{i}"
        if ext_id in existing_ids:
            continue
        ext_comps.append({
            "id": ext_id,
            "name": ext["name"],
            "category": "external",
            "layer": "external",
            "tech": ext.get("type", "External"),
            "icon": "globe",
            "connects_to": [],
        })
        gateway = next((c for c in components if c.get("layer") == "gateway"), None)
        service = next((c for c in components if c.get("layer") == "service"), None)
        target = gateway or service
        if target:
            ext_edges.append({
                "id": f"e{edge_id}",
                "source": ext_id,
                "target": target["id"],
                "label": ext.get("type", "API"),
                "animated": True,
            })
            edge_id += 1

    return ext_comps, ext_edges


# ══════════════════════════════════════════════════════════════════════════
#  MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════

def generate_domain_architecture(
    idea: str,
    domain: str,
    constraints: dict = None,
    sub_features: list[str] = None,
    external_systems: list[dict] = None,
    project_id: str = None,
) -> dict:
    """
    Generate a constraint-driven, domain-specific architecture.

    Pipeline:
      1. Load domain components
      2. Score necessity for each component
      3. Apply scale-tier injection
      4. Resolve dependency chains
      5. Layout → edges → stack → cost → summary
    """
    constraints = constraints or {}
    sub_features = sub_features or []
    external_systems = external_systems or []
    project_id = project_id or f"proj_{uuid.uuid4().hex[:12]}"
    scale_tier = constraints.get("scale_tier", "medium")

    # 1. Load ALL domain components
    all_components = _load_domain_components(domain)
    if not all_components:
        logger.warning(f"No components loaded for {domain}, using minimal fallback")
        all_components = _get_minimal_components()

    # Build lookup map for dependency resolution
    comp_map = {c["id"]: c for c in all_components}

    # 2. Score necessity and select
    selected_ids: set[str] = set()
    selection_log: list[dict] = []

    for comp in all_components:
        score, reason = _score_necessity(comp, constraints)
        included = score >= INCLUSION_THRESHOLD
        selection_log.append({
            "id": comp["id"],
            "name": comp["name"],
            "score": score,
            "reason": reason,
            "included": included,
        })
        if included:
            selected_ids.add(comp["id"])

    # 3. Scale-tier injection (force-add if they exist in domain library)
    inject_ids = SCALE_INJECT.get(scale_tier, [])
    for inject_id in inject_ids:
        if inject_id in comp_map and inject_id not in selected_ids:
            selected_ids.add(inject_id)
            selection_log.append({
                "id": inject_id, "name": comp_map[inject_id]["name"],
                "score": 99, "reason": f"scale-inject({scale_tier})", "included": True,
            })

    # Feature-based injection
    features = constraints.get("features", {})
    for feat_name, feat_ids in FEATURE_INJECT.items():
        if features.get(feat_name, False):
            for fid in feat_ids:
                if fid in comp_map and fid not in selected_ids:
                    selected_ids.add(fid)
                    selection_log.append({
                        "id": fid, "name": comp_map[fid]["name"],
                        "score": 99, "reason": f"feature-inject({feat_name})", "included": True,
                    })

    # 4. Dependency chaining
    selected_ids = _resolve_dependencies(selected_ids, comp_map)

    # Build final component list (preserving domain JSON order for determinism)
    selected = [c for c in all_components if c["id"] in selected_ids]

    # Ensure at least minimal architecture
    if len(selected) < 3:
        selected = [c for c in all_components if c.get("core", False)]
        if len(selected) < 3:
            selected = all_components[:4]

    # 5. Add external system nodes
    existing_ids = {c["id"] for c in selected}
    ext_comps, ext_edges = _add_external_systems(selected, external_systems, existing_ids)
    selected.extend(ext_comps)

    # 6. Layout nodes
    nodes = _layout_nodes(selected)

    # 7. Generate edges
    edges = _generate_edges(selected) + ext_edges

    # 8. Build tech stack
    tech_stack = _build_tech_stack(selected)

    # 9. Estimate costs
    cost_estimate = _estimate_costs(selected, scale_tier)

    # 10. Build summary
    domain_label = constraints.get("domain_label", domain.replace("_", " ").title())
    comp_names = [c["name"] for c in selected if c.get("category") != "external"][:6]
    excluded_count = len(all_components) - len([c for c in selected if c.get("category") != "external"])

    summary = (
        f"A {scale_tier}-scale {domain_label} architecture for \"{idea}\". "
        f"Selected {len(comp_names)} key components: {', '.join(comp_names)}. "
    )
    if excluded_count > 0:
        summary += f"{excluded_count} components excluded based on scale/complexity constraints."

    return {
        "project_id": project_id,
        "title": idea[:80],
        "summary": summary,
        "domain": domain,
        "nodes": nodes,
        "edges": edges,
        "techStack": tech_stack,
        "costEstimate": cost_estimate,
        "healthScores": {"scalability": 7, "costEfficiency": 7, "security": 7, "maintainability": 7},
        "risks": [],
        "securitySuggestions": [],
        "selection_log": selection_log,  # Expose reasoning for debugging / UI
    }


def _get_minimal_components() -> list[dict]:
    """Fallback component set when no domain file exists."""
    return [
        {"id": "client", "name": "Web Client", "category": "frontend", "layer": "client", "tech": "React", "icon": "monitor", "core": True, "scalability_score": 8, "latency_impact": 5, "complexity_weight": 3, "failure_blast_radius": "low", "connects_to": [{"target": "gateway", "label": "HTTPS"}]},
        {"id": "gateway", "name": "API Gateway", "category": "backend", "layer": "gateway", "tech": "Nginx / Kong", "icon": "shield", "core": True, "scalability_score": 9, "latency_impact": 10, "complexity_weight": 5, "failure_blast_radius": "critical", "connects_to": [{"target": "api", "label": "Route"}]},
        {"id": "api", "name": "Core API", "category": "backend", "layer": "service", "tech": "FastAPI", "icon": "cpu", "core": True, "scalability_score": 7, "latency_impact": 15, "complexity_weight": 5, "failure_blast_radius": "high", "connects_to": [{"target": "db", "label": "Read/Write"}]},
        {"id": "db", "name": "Database", "category": "database", "layer": "data", "tech": "PostgreSQL", "icon": "database", "core": True, "scalability_score": 5, "latency_impact": 12, "complexity_weight": 4, "failure_blast_radius": "critical", "connects_to": []},
    ]

