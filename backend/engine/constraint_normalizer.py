"""
Arch.AI — Constraint Normalizer
Converts raw classifier output + optional interview answers into structured
constraints for the architecture reasoner.

Always produces a complete, typed constraint object — even when the user
skips the interview — so the reasoner never operates blind.
"""

import re
import logging

logger = logging.getLogger("Arch.AI.constraints")

# ── Keyword → structured feature mapping ──────────────────────────────────
# Replaces flat regex-list feature detection with deterministic flag derivation.
FEATURE_KEYWORD_MAP: dict[str, list[str]] = {
    "real_time":         ["real-time", "live", "streaming", "websocket", "socket.io", "sse"],
    "async_processing":  ["webhook", "queue", "worker", "background", "async", "event-driven", "celery"],
    "ai_feature":        ["ai", "ml", "model", "training", "inference", "prediction", "neural", "llm", "gpt"],
    "search":            ["search", "elastic", "algolia", "full-text", "filter"],
    "payments":          ["payment", "billing", "subscription", "stripe", "checkout", "commerce"],
    "file_storage":      ["upload", "file", "media", "image", "video", "s3", "storage"],
    "multi_tenant":      ["multi-tenant", "saas", "organization", "workspace", "team"],
    "analytics":         ["analytics", "dashboard", "metrics", "reporting", "bi"],
    "geo":               ["map", "location", "geo", "gps", "routing"],
    "compliance":        ["gdpr", "hipaa", "sox", "compliance", "audit", "pci"],
    "notifications":     ["notification", "push", "alert", "email", "sms"],
    "caching":           ["cache", "redis", "memcached", "cdn"],
}

# ── Scale-tier inference from idea text ───────────────────────────────────
SCALE_SIGNALS: dict[str, list[str]] = {
    "mvp":        ["prototype", "mvp", "poc", "proof of concept", "weekend project", "small", "simple", "basic", "demo", "hackathon"],
    "startup":    ["startup", "early stage", "seed", "beta", "launch", "first version", "v1"],
    "growth":     ["growth", "series", "scaling", "thousands", "10k", "50k"],
    "enterprise": ["enterprise", "millions", "global", "fortune 500", "b2b enterprise", "100k", "1m users", "million users", "large scale", "massive"],
}

# ── Complexity budget by scale tier ───────────────────────────────────────
SCALE_TO_COMPLEXITY: dict[str, str] = {
    "mvp":        "low",
    "startup":    "medium",
    "growth":     "medium",
    "medium":     "medium",
    "enterprise": "high",
}


def normalize_constraints(
    classifier_output: dict,
    interview_constraints: dict = None,
    idea: str = "",
) -> dict:
    """
    Produce a complete structured constraint object from all available signals.

    Priority:
      1. Interview constraints (most explicit — user answered questions)
      2. Classifier sub_features (extracted from idea text)  
      3. Inferred defaults (from idea keywords or safe fallbacks)

    Returns:
        {
            "scale_tier": "mvp" | "startup" | "growth" | "medium" | "enterprise",
            "complexity_budget": "low" | "medium" | "high",
            "features": {
                "real_time": bool,
                "async_processing": bool,
                "ai_feature": bool,
                "search": bool,
                "payments": bool,
                "file_storage": bool,
                "multi_tenant": bool,
                "analytics": bool,
                "geo": bool,
                "compliance": bool,
                "notifications": bool,
                "caching": bool,
            },
            "latency_sensitivity": "low" | "medium" | "high",
            "security_level": "standard" | "elevated" | "strict",
        }
    """
    interview_constraints = interview_constraints or {}
    idea_lower = (idea or classifier_output.get("idea", "")).lower()
    sub_features = classifier_output.get("sub_features", [])
    domain = classifier_output.get("domain", "")

    # ── 1. Scale tier ─────────────────────────────────────────
    scale_tier = _resolve_scale_tier(interview_constraints, idea_lower)

    # ── 2. Structured features ────────────────────────────────
    features = _resolve_features(sub_features, idea_lower, interview_constraints)

    # ── 3. Complexity budget ──────────────────────────────────
    complexity_budget = interview_constraints.get(
        "complexity_budget",
        SCALE_TO_COMPLEXITY.get(scale_tier, "medium"),
    )

    # ── 4. Latency sensitivity ────────────────────────────────
    latency_sensitivity = _resolve_latency(interview_constraints, features, domain)

    # ── 5. Security level ─────────────────────────────────────
    security_level = _resolve_security(interview_constraints, features, domain)

    result = {
        "scale_tier": scale_tier,
        "complexity_budget": complexity_budget,
        "features": features,
        "latency_sensitivity": latency_sensitivity,
        "security_level": security_level,
    }

    logger.info(f"Normalized constraints: scale={scale_tier}, complexity={complexity_budget}, "
                f"features={[k for k,v in features.items() if v]}")

    return result


def _resolve_scale_tier(interview: dict, idea: str) -> str:
    """Determine scale tier from interview answers or idea text."""
    # Interview is authoritative
    if interview.get("scale_tier"):
        return interview["scale_tier"]

    # Infer from idea text
    for tier in ["enterprise", "growth", "startup", "mvp"]:  # Check high → low
        signals = SCALE_SIGNALS.get(tier, [])
        if any(s in idea for s in signals):
            return tier

    # Check for numeric user counts
    user_match = re.search(r"(\d+)\s*(?:k|K)\s*(?:user|client|customer)", idea)
    if user_match:
        count = int(user_match.group(1))
        if count >= 100:
            return "enterprise"
        elif count >= 10:
            return "growth"
        elif count >= 1:
            return "startup"

    million_match = re.search(r"(\d+)\s*(?:m|M|million)\s*(?:user|client|customer)?", idea)
    if million_match:
        return "enterprise"

    return "medium"  # Safe default


def _resolve_features(sub_features: list[str], idea: str, interview: dict) -> dict:
    """Convert sub_features list + idea text into structured boolean flags."""
    flags: dict[str, bool] = {}

    for feature_name, keywords in FEATURE_KEYWORD_MAP.items():
        # Check sub_features list (from classifier)
        in_features = feature_name in sub_features

        # Check idea text directly
        in_idea = any(kw in idea for kw in keywords)

        # Check interview answers
        in_interview = interview.get(f"needs_{feature_name}", False) or \
                       interview.get(feature_name, False)

        flags[feature_name] = in_features or in_idea or bool(in_interview)

    return flags


def _resolve_latency(interview: dict, features: dict, domain: str) -> str:
    """Determine latency sensitivity."""
    if interview.get("latency_sensitivity"):
        return interview["latency_sensitivity"]

    # Domains with inherent latency needs
    if domain in ("iot_system", "fintech"):
        return "high"
    if features.get("real_time"):
        return "high"
    if domain in ("data_platform", "devops_tool"):
        return "low"

    return "medium"


def _resolve_security(interview: dict, features: dict, domain: str) -> str:
    """Determine security level."""
    if interview.get("security_level"):
        return interview["security_level"]

    if domain in ("fintech",):
        return "strict"
    if features.get("compliance") or features.get("payments"):
        return "elevated"
    if domain in ("marketplace",):
        return "elevated"

    return "standard"

