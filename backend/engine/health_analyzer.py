"""
Arch.AI — Metadata-Driven Health Analyzer
Architectural evaluation engine using structured component metadata.

Replaces keyword-based heuristics with property-based scoring:
  - scalability_score: per-component horizontal scaling capability (1-10)
  - latency_impact: milliseconds added to request path (negative = reduces latency)
  - complexity_weight: operational overhead (1-10)
  - failure_blast_radius: low / medium / high / critical
  - base_cost: {low, high} monthly cost range

All scoring is deterministic, O(n) over components, no LLM calls.
"""

import json
import os
import logging
from typing import Optional

logger = logging.getLogger("Arch.AI.health")

COMPONENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "components")

# ── Category-based defaults for backward compatibility ────────────────────
# Used when component metadata fields are missing from the JSON
CATEGORY_DEFAULTS: dict[str, dict] = {
    "frontend":       {"scalability_score": 8,  "latency_impact": 5,   "complexity_weight": 3, "failure_blast_radius": "low"},
    "backend":        {"scalability_score": 6,  "latency_impact": 15,  "complexity_weight": 5, "failure_blast_radius": "medium"},
    "database":       {"scalability_score": 5,  "latency_impact": 12,  "complexity_weight": 4, "failure_blast_radius": "critical"},
    "ai":             {"scalability_score": 4,  "latency_impact": 40,  "complexity_weight": 8, "failure_blast_radius": "high"},
    "infrastructure": {"scalability_score": 8,  "latency_impact": 3,   "complexity_weight": 2, "failure_blast_radius": "low"},
    "external":       {"scalability_score": 6,  "latency_impact": 30,  "complexity_weight": 2, "failure_blast_radius": "medium"},
}

# ── Scale tier multipliers ────────────────────────────────────────────────
SCALE_WEIGHTS: dict[str, float] = {
    "mvp": 0.6,
    "startup": 0.8,
    "growth": 1.0,
    "medium": 1.0,
    "enterprise": 1.3,
}

# ── Blast radius severity mapping ────────────────────────────────────────
BLAST_RADIUS_SCORE: dict[str, float] = {
    "low": 0.2,
    "medium": 0.5,
    "high": 0.8,
    "critical": 1.0,
}


def _load_component_metadata(domain: str) -> dict[str, dict]:
    """Load full component metadata from domain JSON, keyed by component ID."""
    filepath = os.path.join(COMPONENTS_DIR, f"{domain}.json")
    if not os.path.exists(filepath):
        return {}
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        return {c["id"]: c for c in data.get("components", [])}
    except Exception:
        return {}


def _get_meta(node: dict, metadata_map: dict) -> dict:
    """Get metadata for a node, falling back to category defaults."""
    node_id = node.get("id", "")
    category = node.get("data", {}).get("category", "backend")

    # Try exact match from component library
    if node_id in metadata_map:
        return metadata_map[node_id]

    # Fall back to category defaults
    defaults = CATEGORY_DEFAULTS.get(category, CATEGORY_DEFAULTS["backend"])
    return {
        "id": node_id,
        "name": node.get("data", {}).get("label", node_id),
        "category": category,
        **defaults,
        "base_cost": {"low": 50, "high": 100},
    }


def _safe_float(meta: dict, key: str, default: float) -> float:
    """Safely extract a numeric value from metadata."""
    val = meta.get(key, default)
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


# ══════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ══════════════════════════════════════════════════════════════════════════

def analyze_health(
    nodes: list[dict],
    edges: list[dict],
    constraints: dict = None,
    domain: str = "",
) -> dict:
    """
    Metadata-driven architectural health analysis.

    Returns per-dimension scores with explainable justifications:
    {
        "scalability":      {"score": 8, "reasons": [...]},
        "costEfficiency":   {"score": 7, "reasons": [...]},
        "security":         {"score": 6, "reasons": [...]},
        "maintainability":  {"score": 7, "reasons": [...]},
    }
    """
    constraints = constraints or {}
    scale_tier = constraints.get("scale_tier", "medium")

    # Load component metadata from the domain library
    metadata_map = _load_component_metadata(domain) if domain else {}

    # Build enriched component list
    components = [_get_meta(n, metadata_map) for n in nodes]

    scalability = _score_scalability(components, edges, scale_tier)
    cost = _score_cost_efficiency(components, scale_tier, constraints)
    security = _score_security(components, edges, domain)
    maintainability = _score_maintainability(components, edges)

    return {
        "scalability": scalability,
        "costEfficiency": cost,
        "security": security,
        "maintainability": maintainability,
    }


# ══════════════════════════════════════════════════════════════════════════
#  SCORING ENGINES
# ══════════════════════════════════════════════════════════════════════════

def _score_scalability(components: list[dict], edges: list, scale_tier: str) -> dict:
    """
    Scalability = weighted average of component scalability_scores,
    adjusted for architecture patterns (single points of failure, async paths).
    """
    reasons = []
    scale_weight = SCALE_WEIGHTS.get(scale_tier, 1.0)

    if not components:
        return {"score": 5, "reasons": ["No components to evaluate"]}

    # 1. Weighted average of per-component scalability scores
    scores = [_safe_float(c, "scalability_score", 6.0) for c in components]
    avg_scalability = sum(scores) / len(scores)

    # 2. Identify scaling boosters and bottlenecks
    high_scale_count = sum(1 for s in scores if s >= 8)
    bottleneck_count = sum(1 for s in scores if s <= 4)

    # Boosters: components with score >= 8
    boosters = [c.get("name", c.get("id", "?")) for c, s in zip(components, scores) if s >= 8]
    if boosters:
        reasons.append(f"✓ High-scalability components: {', '.join(boosters[:3])}")

    # Bottlenecks: components with score <= 4
    bottlenecks = [c.get("name", c.get("id", "?")) for c, s in zip(components, scores) if s <= 4]
    if bottlenecks:
        reasons.append(f"⚠ Scaling bottlenecks: {', '.join(bottlenecks[:3])}")

    # 3. Single-point-of-failure detection (critical blast radius with no redundancy cue)
    critical_spofs = [
        c.get("name", "?") for c in components
        if c.get("failure_blast_radius", "low") == "critical"
    ]
    spof_penalty = len(critical_spofs) * 0.3
    if critical_spofs:
        reasons.append(f"⚠ Single points of failure ({len(critical_spofs)}): {', '.join(critical_spofs[:2])}")

    # 4. Async processing bonus (queues / workers decouple load)
    async_comps = [
        c for c in components
        if any(kw in c.get("name", "").lower() for kw in ["queue", "worker", "stream", "async"])
    ]
    async_bonus = min(1.0, len(async_comps) * 0.4)
    if async_comps:
        reasons.append(f"✓ Async processing ({len(async_comps)} components) absorbs traffic spikes")

    # 5. Demand match: high scale tier requires high avg scalability
    demand_gap = 0
    if scale_tier in ("enterprise", "growth") and avg_scalability < 7:
        demand_gap = (7 - avg_scalability) * 0.3
        reasons.append(f"⚠ Average scalability ({avg_scalability:.1f}) may be low for {scale_tier} scale")
    elif scale_tier in ("mvp", "startup") and avg_scalability >= 7:
        reasons.append(f"✓ Components well-suited for {scale_tier} scale (avg {avg_scalability:.1f})")

    # Final calculation
    raw = avg_scalability + async_bonus - spof_penalty - demand_gap
    # Weighted by scale tier importance
    final = raw * scale_weight
    score = max(1, min(10, round(final)))

    return {"score": score, "reasons": reasons}


def _score_cost_efficiency(components: list[dict], scale_tier: str, constraints: dict) -> dict:
    """
    Cost efficiency = total cost appropriateness for the chosen scale tier.
    Penalizes over-engineering, rewards lean architectures.
    """
    reasons = []

    if not components:
        return {"score": 7, "reasons": ["No components to evaluate"]}

    # 1. Compute total monthly cost range
    total_low = sum(_safe_float(c.get("base_cost", {}), "low", 50) for c in components if isinstance(c.get("base_cost"), dict))
    total_high = sum(_safe_float(c.get("base_cost", {}), "high", 100) for c in components if isinstance(c.get("base_cost"), dict))
    # Fallback for components without base_cost dict
    for c in components:
        if not isinstance(c.get("base_cost"), dict):
            total_low += 50
            total_high += 100

    scale_mult = SCALE_WEIGHTS.get(scale_tier, 1.0)
    adjusted_low = total_low * scale_mult
    adjusted_high = total_high * scale_mult

    # 2. Cost/scale appropriateness thresholds
    cost_thresholds = {
        "mvp": (0, 500),
        "startup": (200, 1500),
        "growth": (500, 4000),
        "medium": (300, 3000),
        "enterprise": (1000, 10000),
    }
    ideal_low, ideal_high = cost_thresholds.get(scale_tier, (300, 3000))

    score = 7.0  # Baseline

    if adjusted_high > ideal_high * 1.5:
        overshoot = (adjusted_high - ideal_high) / ideal_high
        score -= min(3, overshoot * 2)
        reasons.append(f"⚠ Estimated cost ${int(adjusted_low)}-${int(adjusted_high)}/mo exceeds typical {scale_tier} budget (${ideal_high}/mo)")
    elif adjusted_high <= ideal_high:
        reasons.append(f"✓ Cost range ${int(adjusted_low)}-${int(adjusted_high)}/mo fits {scale_tier} budget well")
        score += 0.5

    # 3. Heavy infrastructure penalty (GPU, ML, stream processing)
    heavy_comps = [
        c for c in components
        if _safe_float(c, "complexity_weight", 5) >= 7
    ]
    if heavy_comps:
        heavy_names = [c.get("name", "?") for c in heavy_comps[:3]]
        if scale_tier in ("mvp", "startup"):
            score -= len(heavy_comps) * 0.5
            reasons.append(f"⚠ High-complexity components ({', '.join(heavy_names)}) may be costly for {scale_tier}")
        else:
            reasons.append(f"✓ High-complexity components ({', '.join(heavy_names)}) justified at {scale_tier} scale")

    # 4. Component count efficiency
    n = len(components)
    if scale_tier in ("mvp",) and n > 10:
        score -= 1
        reasons.append(f"⚠ {n} services for MVP — consider simplifying")
    elif n <= 8:
        score += 0.5
        reasons.append(f"✓ Lean architecture ({n} components) reduces operational overhead")

    # 5. Low-cost high-value components (caches, CDNs = cheap scalability)
    cheap_boosters = [
        c for c in components
        if _safe_float(c, "scalability_score", 6) >= 8
        and _safe_float(c.get("base_cost", {}), "high", 100) <= 100
    ]
    if cheap_boosters:
        names = [c.get("name", "?") for c in cheap_boosters[:2]]
        score += 0.3 * len(cheap_boosters)
        reasons.append(f"✓ Cost-effective scaling via {', '.join(names)}")

    return {"score": max(1, min(10, round(score))), "reasons": reasons}


def _score_security(components: list[dict], edges: list, domain: str) -> dict:
    """
    Security = presence and positioning of security-critical components,
    weighted by domain sensitivity.
    """
    reasons = []
    score = 5.0  # Baseline

    categories = {c.get("category", "") for c in components}
    names_lower = {c.get("name", "").lower() for c in components}

    # 1. Auth layer detection (from metadata, not grep)
    has_auth = any(
        c.get("category") == "backend" and any(kw in c.get("name", "").lower() for kw in ["auth", "identity", "sso"])
        for c in components
    )
    if has_auth:
        score += 1.5
        reasons.append("✓ Authentication service detected in architecture")
    else:
        score -= 2
        reasons.append("⚠ No authentication layer — critical security gap")

    # 2. Gateway / WAF (critical blast radius + gateway layer = security boundary)
    gateway_comps = [c for c in components if c.get("layer") == "gateway"]
    if gateway_comps:
        score += 1.0
        names = [c.get("name", "?") for c in gateway_comps[:2]]
        reasons.append(f"✓ Security boundary: {', '.join(names)}")
        # WAF-specific bonus
        has_waf = any("waf" in c.get("name", "").lower() or "waf" in c.get("tech", "").lower() for c in gateway_comps)
        if has_waf:
            score += 0.5
            reasons.append("✓ WAF provides OWASP protection")
    else:
        score -= 1
        reasons.append("⚠ No gateway layer — services directly exposed")

    # 3. Rate limiting
    has_rate_limit = any("rate" in c.get("name", "").lower() or "limiter" in c.get("name", "").lower() for c in components)
    if has_rate_limit:
        score += 0.5
        reasons.append("✓ Rate limiting prevents abuse")

    # 4. Monitoring (security observability)
    has_monitoring = any("monitor" in c.get("name", "").lower() or "observ" in c.get("name", "").lower() for c in components)
    if has_monitoring:
        score += 0.5
        reasons.append("✓ Monitoring enables security anomaly detection")

    # 5. Domain-specific security requirements
    if domain in ("fintech",):
        has_compliance = any("compliance" in c.get("name", "").lower() or "kyc" in c.get("name", "").lower() for c in components)
        has_fraud = any("fraud" in c.get("name", "").lower() for c in components)
        if has_compliance:
            score += 1
            reasons.append("✓ Compliance/KYC engine present for fintech")
        else:
            score -= 1
            reasons.append("⚠ Fintech platform without compliance engine — regulatory risk")
        if has_fraud:
            score += 0.5
            reasons.append("✓ Fraud detection layer active")

    if domain in ("iot_system",):
        has_device_auth = any("registry" in c.get("name", "").lower() for c in components)
        if has_device_auth:
            score += 0.5
            reasons.append("✓ Device registry provides device-level auth")
        else:
            reasons.append("⚠ No device registry — IoT devices lack identity control")

    # 6. Critical blast radius components without redundancy
    critical_no_backup = [
        c for c in components
        if c.get("failure_blast_radius") == "critical" and not c.get("alternatives")
    ]
    if len(critical_no_backup) > 2:
        score -= 0.5
        reasons.append(f"⚠ {len(critical_no_backup)} critical components without defined failover alternatives")

    return {"score": max(1, min(10, round(score))), "reasons": reasons}


def _score_maintainability(components: list[dict], edges: list) -> dict:
    """
    Maintainability = f(complexity_weight, coupling, component count).
    Uses actual metadata instead of guessing from names.
    """
    reasons = []
    n = len(components)

    if not components:
        return {"score": 6, "reasons": ["No components to evaluate"]}

    # 1. Average complexity weight
    complexities = [_safe_float(c, "complexity_weight", 5.0) for c in components]
    avg_complexity = sum(complexities) / len(complexities)

    # High complexity components
    high_complex = [
        (c.get("name", "?"), int(_safe_float(c, "complexity_weight", 5)))
        for c in components
        if _safe_float(c, "complexity_weight", 5) >= 7
    ]

    # 2. Coupling ratio (edges / nodes)
    edge_count = len(edges)
    coupling_ratio = edge_count / max(n, 1)

    # 3. Scoring formula
    # Start at 10 and subtract based on complexity + coupling + size
    score = 10.0

    # Complexity penalty: avg_complexity * 0.4 (range: ~2 to ~4 subtracted)
    complexity_penalty = avg_complexity * 0.4
    score -= complexity_penalty

    if high_complex:
        names = [f"{name} ({cw})" for name, cw in high_complex[:3]]
        reasons.append(f"⚠ High-complexity components: {', '.join(names)}")
    else:
        reasons.append(f"✓ All components have manageable complexity (avg {avg_complexity:.1f})")

    # Coupling penalty: high coupling = harder to change
    if coupling_ratio > 2.5:
        score -= 1.0
        reasons.append(f"⚠ High coupling (ratio {coupling_ratio:.1f}) — many inter-service dependencies")
    elif coupling_ratio <= 1.5:
        score += 0.5
        reasons.append(f"✓ Low coupling (ratio {coupling_ratio:.1f}) — services are loosely connected")

    # Size penalty
    if n > 15:
        score -= 1.0
        reasons.append(f"⚠ Large service count ({n}) increases deployment complexity")
    elif n <= 8:
        score += 0.5
        reasons.append(f"✓ Manageable service count ({n})")

    # 4. Monitoring bonus (aids debugging)
    has_monitoring = any("monitor" in c.get("name", "").lower() for c in components)
    if has_monitoring:
        score += 0.5
        reasons.append("✓ Monitoring aids debugging and incident response")

    # 5. Low-blast-radius ratio (more low = easier to maintain)
    blast_scores = [BLAST_RADIUS_SCORE.get(c.get("failure_blast_radius", "medium"), 0.5) for c in components]
    avg_blast = sum(blast_scores) / len(blast_scores)
    if avg_blast <= 0.4:
        score += 0.5
        reasons.append("✓ Most components have low failure blast radius")
    elif avg_blast >= 0.7:
        score -= 0.5
        reasons.append("⚠ Many components have high failure blast radius — cascading failure risk")

    return {"score": max(1, min(10, round(score))), "reasons": reasons}


# ══════════════════════════════════════════════════════════════════════════
#  RISK & SECURITY GENERATORS
# ══════════════════════════════════════════════════════════════════════════

def get_risks(nodes: list[dict], domain: str = "", constraints: dict = None) -> list[str]:
    """Generate risk assessments from component metadata."""
    constraints = constraints or {}
    metadata_map = _load_component_metadata(domain) if domain else {}
    components = [_get_meta(n, metadata_map) for n in nodes]
    risks = []

    # Single points of failure
    critical = [c.get("name", "?") for c in components if c.get("failure_blast_radius") == "critical"]
    if len(critical) > 1:
        risks.append(f"Multiple critical SPOFs: {', '.join(critical[:3])} — any failure cascades across the system")

    # High latency path
    total_latency = sum(_safe_float(c, "latency_impact", 10) for c in components if c.get("layer") in ("gateway", "service"))
    if total_latency > 80:
        risks.append(f"Cumulative service latency ~{int(total_latency)}ms — may exceed SLA under load")

    # No async processing
    has_queue = any("queue" in c.get("name", "").lower() for c in components)
    if not has_queue and len(components) > 6:
        risks.append("No message queue — synchronous processing may cause cascading failures under load")

    # No monitoring
    has_monitoring = any("monitor" in c.get("name", "").lower() for c in components)
    if not has_monitoring:
        risks.append("No monitoring service — difficult to detect and diagnose production issues")

    # High complexity components
    very_complex = [c.get("name", "?") for c in components if _safe_float(c, "complexity_weight", 5) >= 8]
    if very_complex:
        risks.append(f"High operational complexity: {', '.join(very_complex[:2])} require specialized expertise")

    # Scale mismatch
    scale = constraints.get("scale_tier", "medium")
    avg_scale = sum(_safe_float(c, "scalability_score", 6) for c in components) / max(len(components), 1)
    if scale in ("enterprise",) and avg_scale < 6:
        risks.append(f"Architecture avg scalability ({avg_scale:.1f}/10) may be insufficient for enterprise scale")

    # Domain-specific
    if domain == "fintech" and not any("compliance" in c.get("name", "").lower() for c in components):
        risks.append("Fintech platform without dedicated compliance engine — regulatory risk")
    if domain == "iot_system" and not any("edge" in c.get("name", "").lower() for c in components):
        risks.append("IoT system without edge computing — high latency for device operations")

    return risks[:6]


def get_security_suggestions(nodes: list[dict], domain: str = "", constraints: dict = None) -> list[str]:
    """Generate security suggestions from architecture metadata."""
    constraints = constraints or {}
    metadata_map = _load_component_metadata(domain) if domain else {}
    components = [_get_meta(n, metadata_map) for n in nodes]
    suggestions = []

    has_waf = any("waf" in c.get("name", "").lower() or "waf" in c.get("tech", "").lower() for c in components)
    has_rate_limit = any("rate" in c.get("name", "").lower() for c in components)

    if not has_waf:
        suggestions.append("Add Web Application Firewall (WAF) to protect against OWASP Top 10")
    if not has_rate_limit:
        suggestions.append("Implement rate limiting to prevent API abuse and DDoS attacks")

    suggestions.append("Enable TLS/HTTPS for all inter-service communication")
    suggestions.append("Implement secrets management (AWS Secrets Manager / HashiCorp Vault)")

    has_audit = any("audit" in c.get("name", "").lower() or "compliance" in c.get("name", "").lower() for c in components)
    if not has_audit:
        suggestions.append("Add audit logging for compliance and security forensics")

    # Critical components should have failover
    critical_no_alt = [
        c.get("name", "?") for c in components
        if c.get("failure_blast_radius") == "critical" and not c.get("alternatives")
    ]
    if critical_no_alt:
        suggestions.append(f"Define failover strategies for critical components: {', '.join(critical_no_alt[:2])}")

    if domain in ("fintech", "marketplace"):
        suggestions.append("Implement PCI-DSS compliance for payment data handling")
    if domain == "iot_system":
        suggestions.append("Use mutual TLS (mTLS) for device-to-cloud authentication")

    return suggestions[:6]

