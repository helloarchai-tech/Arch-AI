"""
Arch.AI — Intent Classifier
Classifies user product ideas into domain categories using keyword matching + LLM fallback.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger("Arch.AI.classifier")

# ── Domain definitions with keyword patterns ──────────────────────────────
DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "ai_saas": [
        "ai saas", "machine learning", "ml pipeline", "model training",
        "ai platform", "deep learning", "neural network", "llm",
        "gpt", "ai-powered saas", "ml saas", "prediction service",
        "recommendation engine", "computer vision", "nlp platform",
        "inference", "model serving", "feature store",
    ],
    "api_platform": [
        "api integration", "api platform", "api gateway", "api management",
        "api marketplace", "third-party api", "api connector", "webhook",
        "rest api platform", "graphql platform", "api aggregator",
        "integration platform", "ipaas", "api hub", "api catalog",
        "developer platform", "api-first",
    ],
    "rag_system": [
        "rag", "retrieval augmented", "vector database", "knowledge base",
        "document search", "semantic search", "embedding", "chatbot",
        "ai chatbot", "question answering", "document qa", "context retrieval",
        "pinecone", "weaviate", "chroma", "ai assistant",
    ],
    "mobile_app": [
        "mobile app", "ios app", "android app", "react native", "flutter",
        "mobile backend", "push notification", "offline-first",
        "mobile social", "dating app", "fitness app", "health app",
        "food delivery", "ride sharing", "uber clone",
    ],
    "marketplace": [
        "marketplace", "e-commerce", "ecommerce", "online store",
        "multi-vendor", "shopping", "product catalog", "cart",
        "payment", "checkout", "seller dashboard", "buyer",
        "auction", "rental", "booking platform",
    ],
    "iot_system": [
        "iot", "internet of things", "smart device", "sensor",
        "telemetry", "mqtt", "edge computing", "embedded",
        "smart home", "industrial iot", "connected device",
        "device management", "firmware", "wearable",
    ],
    "devops_tool": [
        "devops", "ci/cd", "deployment", "kubernetes", "docker",
        "monitoring tool", "observability", "infrastructure",
        "terraform", "ansible", "pipeline", "build system",
        "developer tool", "dev tool", "code review",
    ],
    "data_platform": [
        "data platform", "data pipeline", "etl", "data lake",
        "data warehouse", "analytics platform", "bi tool",
        "business intelligence", "data engineering", "spark",
        "kafka", "stream processing", "real-time analytics",
        "dashboard platform", "reporting",
    ],
    "fintech": [
        "fintech", "banking", "payment", "neobank", "lending",
        "crypto", "blockchain", "trading", "stock", "insurance",
        "wallet", "financial", "compliance", "kyc", "aml",
        "transaction", "ledger", "accounting",
    ],
    "social_platform": [
        "social media", "social network", "community", "forum",
        "messaging", "chat app", "video call", "live stream",
        "content platform", "blog platform", "user generated",
        "social app", "feed", "followers", "stories",
    ],
}

# ── External systems commonly associated with each domain ─────────────────
DOMAIN_EXTERNAL_SYSTEMS: dict[str, list[dict]] = {
    "ai_saas": [
        {"name": "OpenAI / HuggingFace", "type": "AI Provider"},
        {"name": "AWS SageMaker", "type": "ML Infrastructure"},
        {"name": "Weights & Biases", "type": "Experiment Tracking"},
    ],
    "api_platform": [
        {"name": "Stripe API", "type": "Payment"},
        {"name": "Twilio API", "type": "Communication"},
        {"name": "Google APIs", "type": "Cloud Services"},
        {"name": "Slack / Discord", "type": "Messaging"},
        {"name": "Salesforce", "type": "CRM"},
    ],
    "rag_system": [
        {"name": "OpenAI / Anthropic", "type": "LLM Provider"},
        {"name": "Pinecone / Weaviate", "type": "Vector DB"},
        {"name": "S3 / GCS", "type": "Document Storage"},
    ],
    "mobile_app": [
        {"name": "Firebase", "type": "Push / Analytics"},
        {"name": "Apple / Google Pay", "type": "Payment"},
        {"name": "Maps API", "type": "Geolocation"},
    ],
    "marketplace": [
        {"name": "Stripe / PayPal", "type": "Payment Gateway"},
        {"name": "Algolia / Elasticsearch", "type": "Search"},
        {"name": "Shippo / EasyPost", "type": "Shipping"},
        {"name": "Twilio / SendGrid", "type": "Notifications"},
    ],
    "iot_system": [
        {"name": "AWS IoT Core", "type": "Device Cloud"},
        {"name": "MQTT Broker", "type": "Messaging Protocol"},
        {"name": "InfluxDB Cloud", "type": "Time-Series DB"},
    ],
    "devops_tool": [
        {"name": "GitHub / GitLab", "type": "Source Control"},
        {"name": "AWS / GCP / Azure", "type": "Cloud Provider"},
        {"name": "PagerDuty", "type": "Incident Management"},
    ],
    "data_platform": [
        {"name": "Snowflake / BigQuery", "type": "Data Warehouse"},
        {"name": "Apache Kafka", "type": "Stream Processing"},
        {"name": "dbt", "type": "Data Transform"},
    ],
    "fintech": [
        {"name": "Stripe / Plaid", "type": "Payment / Banking"},
        {"name": "Onfido / Jumio", "type": "KYC Provider"},
        {"name": "Chainalysis", "type": "Compliance"},
    ],
    "social_platform": [
        {"name": "Twilio / Agora", "type": "Real-time Comm"},
        {"name": "Cloudinary / Mux", "type": "Media Processing"},
        {"name": "Firebase", "type": "Push Notifications"},
    ],
}

# ── Human-readable domain labels ─────────────────────────────────────────
DOMAIN_LABELS: dict[str, str] = {
    "ai_saas": "AI / ML SaaS Platform",
    "api_platform": "API Integration Platform",
    "rag_system": "RAG / AI Knowledge System",
    "mobile_app": "Mobile App Backend",
    "marketplace": "Marketplace / E-Commerce",
    "iot_system": "IoT / Smart Device System",
    "devops_tool": "DevOps / Developer Tool",
    "data_platform": "Data / Analytics Platform",
    "fintech": "Fintech / Financial Platform",
    "social_platform": "Social / Community Platform",
}


def classify_intent(idea: str) -> dict:
    """
    Classify a product idea into a domain category.

    Returns:
        {
            "domain": str,          # e.g. "api_platform"
            "domain_label": str,    # e.g. "API Integration Platform"
            "confidence": float,    # 0.0 - 1.0
            "sub_features": list,   # detected sub-features
            "external_systems": list,  # relevant third-party systems
        }
    """
    idea_lower = idea.lower().strip()

    # Score each domain by keyword matches
    scores: dict[str, float] = {}
    matched_keywords: dict[str, list[str]] = {}

    for domain, keywords in DOMAIN_KEYWORDS.items():
        matches = []
        for kw in keywords:
            if kw in idea_lower:
                # Multi-word matches get higher weight
                weight = 1.0 + (kw.count(" ") * 0.5)
                matches.append(kw)
                scores[domain] = scores.get(domain, 0) + weight
        matched_keywords[domain] = matches

    if not scores:
        # No keyword matches — default to generic SaaS
        return {
            "domain": "ai_saas",
            "domain_label": "General SaaS Platform",
            "confidence": 0.3,
            "sub_features": _extract_sub_features(idea_lower),
            "external_systems": [],
        }

    # Normalize scores
    max_score = max(scores.values())
    best_domain = max(scores, key=scores.get)  # type: ignore
    confidence = min(1.0, max_score / 4.0)  # 4+ matches = full confidence

    # Detect sub-features from the idea
    sub_features = _extract_sub_features(idea_lower)

    # Get relevant external systems
    external_systems = DOMAIN_EXTERNAL_SYSTEMS.get(best_domain, [])

    logger.info(f"Classified '{idea[:60]}...' → {best_domain} (confidence={confidence:.2f})")

    return {
        "domain": best_domain,
        "domain_label": DOMAIN_LABELS.get(best_domain, best_domain),
        "confidence": round(confidence, 2),
        "sub_features": sub_features,
        "external_systems": external_systems,
        "matched_keywords": matched_keywords.get(best_domain, []),
    }


def _extract_sub_features(idea: str) -> list[str]:
    """Extract mentioned sub-features from the idea text."""
    feature_patterns = {
        "authentication": r"\b(auth|login|signup|sso|oauth)\b",
        "real_time": r"\b(real.?time|live|websocket|streaming)\b",
        "notifications": r"\b(notif|push|alert|email)\b",
        "search": r"\b(search|filter|query|elastic)\b",
        "payments": r"\b(pay|billing|subscri|stripe|checkout)\b",
        "analytics": r"\b(analytic|dashboard|metric|report)\b",
        "file_storage": r"\b(upload|file|storage|media|image|video)\b",
        "multi_tenant": r"\b(multi.?tenant|saas|organization)\b",
        "caching": r"\b(cache|redis|memcache)\b",
        "queue": r"\b(queue|worker|background|async|celery)\b",
        "api": r"\b(api|rest|graphql|grpc)\b",
        "ml_ai": r"\b(ml|ai|model|train|predict|inference)\b",
        "geo": r"\b(map|location|geo|gps)\b",
        "compliance": r"\b(gdpr|hipaa|sox|compliance|audit)\b",
    }
    found = []
    for feature, pattern in feature_patterns.items():
        if re.search(pattern, idea, re.IGNORECASE):
            found.append(feature)
    return found


def get_all_domains() -> list[dict]:
    """Return all available domains with labels."""
    return [
        {"domain": k, "label": v}
        for k, v in DOMAIN_LABELS.items()
    ]

