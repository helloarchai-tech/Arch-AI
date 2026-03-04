"""
Arch.AI — Interview Agent
Generates adaptive clarification questions based on detected domain.
Manages multi-turn interview state.
"""

import logging
from typing import Optional

logger = logging.getLogger("Arch.AI.interview")

# ── Domain-specific clarification questions ───────────────────────────────
DOMAIN_QUESTIONS: dict[str, list[dict]] = {
    "ai_saas": [
        {"id": "users", "question": "How many users do you expect in the first year?", "type": "select", "options": ["< 1,000", "1K - 10K", "10K - 100K", "100K - 1M", "1M+"]},
        {"id": "ml_type", "question": "What type of AI/ML will your platform use?", "type": "select", "options": ["NLP / Text", "Computer Vision", "Recommendation Engine", "Predictive Analytics", "Generative AI", "Multiple"]},
        {"id": "training", "question": "Will users train custom models, or use pre-built ones?", "type": "select", "options": ["Pre-built models only", "Custom model training", "Both", "Not sure yet"]},
        {"id": "latency", "question": "What's the acceptable inference latency?", "type": "select", "options": ["Real-time (< 100ms)", "Near real-time (< 1s)", "Batch processing OK", "Not critical"]},
        {"id": "data_sensitivity", "question": "How sensitive is the data you'll process?", "type": "select", "options": ["Public data", "Business data (moderate)", "PII / Healthcare (high)", "Financial (regulated)"]},
    ],
    "api_platform": [
        {"id": "api_volume", "question": "Expected API requests per day?", "type": "select", "options": ["< 10K", "10K - 100K", "100K - 1M", "1M - 10M", "10M+"]},
        {"id": "api_type", "question": "Public or private APIs?", "type": "select", "options": ["Public APIs only", "Private / Internal", "Both public and private", "API marketplace"]},
        {"id": "integration_style", "question": "Real-time or batch integrations?", "type": "select", "options": ["Real-time (sync)", "Batch / scheduled", "Event-driven (async)", "Mix of all"]},
        {"id": "third_party_count", "question": "How many third-party APIs will you connect?", "type": "select", "options": ["1-5", "5-20", "20-50", "50+"]},
        {"id": "auth_model", "question": "API authentication model?", "type": "select", "options": ["API keys", "OAuth 2.0", "JWT tokens", "Multiple methods"]},
    ],
    "rag_system": [
        {"id": "doc_volume", "question": "How many documents will the knowledge base hold?", "type": "select", "options": ["< 1,000", "1K - 10K", "10K - 100K", "100K+"]},
        {"id": "doc_types", "question": "What types of documents?", "type": "select", "options": ["PDFs / Text", "Web pages", "Code / Technical docs", "Mixed formats"]},
        {"id": "llm_choice", "question": "Preferred LLM provider?", "type": "select", "options": ["OpenAI (GPT-4)", "Anthropic (Claude)", "Open-source (Llama, Mistral)", "Self-hosted", "Flexible / multiple"]},
        {"id": "update_freq", "question": "How often will the knowledge base update?", "type": "select", "options": ["Static (rarely)", "Daily", "Real-time / streaming", "On-demand"]},
        {"id": "accuracy", "question": "How critical is answer accuracy?", "type": "select", "options": ["Best-effort is fine", "High accuracy needed", "Mission-critical (citations required)", "Legal / compliance grade"]},
    ],
    "mobile_app": [
        {"id": "platforms", "question": "Which platforms are you targeting?", "type": "select", "options": ["iOS only", "Android only", "Both iOS & Android", "Cross-platform + Web"]},
        {"id": "users", "question": "Expected monthly active users?", "type": "select", "options": ["< 1K", "1K - 10K", "10K - 100K", "100K - 1M", "1M+"]},
        {"id": "offline", "question": "Does the app need offline support?", "type": "select", "options": ["No, always online", "Basic offline caching", "Full offline-first", "Sync-heavy (collaborative)"]},
        {"id": "real_time", "question": "Any real-time features needed?", "type": "select", "options": ["No", "Chat / messaging", "Live updates / feed", "Video / audio calls", "Location tracking"]},
        {"id": "monetization", "question": "Monetization model?", "type": "select", "options": ["Free (ad-supported)", "Freemium / subscription", "One-time purchase", "In-app purchases", "Not decided"]},
    ],
    "marketplace": [
        {"id": "marketplace_type", "question": "What type of marketplace?", "type": "select", "options": ["Product (physical goods)", "Digital goods / services", "Service marketplace", "Rental / booking", "B2B marketplace"]},
        {"id": "users", "question": "Expected number of sellers/vendors?", "type": "select", "options": ["< 100", "100 - 1K", "1K - 10K", "10K+"]},
        {"id": "payment_model", "question": "Payment model?", "type": "select", "options": ["Direct payment", "Escrow / split payments", "Subscription", "Commission-based", "Multiple"]},
        {"id": "search", "question": "How important is search/discovery?", "type": "select", "options": ["Basic search", "Advanced filters + categories", "AI-powered recommendations", "Full-text + faceted search"]},
        {"id": "logistics", "question": "Does it involve shipping/delivery?", "type": "select", "options": ["No (digital only)", "Standard shipping", "Same-day / express", "Service delivery (on-site)"]},
    ],
    "iot_system": [
        {"id": "device_count", "question": "How many devices do you expect to manage?", "type": "select", "options": ["< 100", "100 - 1K", "1K - 10K", "10K - 100K", "100K+"]},
        {"id": "data_frequency", "question": "How frequently do devices send data?", "type": "select", "options": ["Every few hours", "Every minute", "Every second", "Sub-second (real-time)"]},
        {"id": "protocol", "question": "Communication protocol?", "type": "select", "options": ["MQTT", "HTTP/REST", "WebSocket", "CoAP", "Multiple / hybrid"]},
        {"id": "edge_compute", "question": "Need edge computing?", "type": "select", "options": ["No, cloud-only", "Basic edge processing", "Heavy edge ML inference", "Fog computing layer"]},
        {"id": "ota", "question": "Need over-the-air (OTA) firmware updates?", "type": "select", "options": ["No", "Yes, basic", "Yes, with rollback", "Critical (safety devices)"]},
    ],
    "devops_tool": [
        {"id": "tool_type", "question": "What type of DevOps tool?", "type": "select", "options": ["CI/CD pipeline", "Monitoring / observability", "Infrastructure as Code", "Security scanning", "Developer portal", "Multiple"]},
        {"id": "scale", "question": "Target team size?", "type": "select", "options": ["Solo / small team (< 10)", "Medium team (10-50)", "Large org (50-500)", "Enterprise (500+)"]},
        {"id": "cloud", "question": "Target cloud provider?", "type": "select", "options": ["AWS", "GCP", "Azure", "Multi-cloud", "Cloud-agnostic"]},
        {"id": "integration", "question": "Key integrations needed?", "type": "select", "options": ["GitHub / GitLab", "Kubernetes", "Terraform", "Jenkins", "Multiple"]},
    ],
    "data_platform": [
        {"id": "data_volume", "question": "Expected daily data volume?", "type": "select", "options": ["< 1 GB", "1-100 GB", "100 GB - 1 TB", "1 TB+"]},
        {"id": "processing", "question": "Batch or real-time processing?", "type": "select", "options": ["Batch only", "Real-time streaming", "Both", "Not sure"]},
        {"id": "sources", "question": "Number of data sources?", "type": "select", "options": ["1-5", "5-20", "20-50", "50+"]},
        {"id": "users", "question": "Who will use the platform?", "type": "select", "options": ["Data engineers only", "Analysts / BI users", "Business stakeholders", "All of the above"]},
        {"id": "governance", "question": "Data governance requirements?", "type": "select", "options": ["Minimal", "Basic lineage + catalog", "Full governance (GDPR, SOC2)", "Healthcare / Finance regulated"]},
    ],
    "fintech": [
        {"id": "fintech_type", "question": "What type of financial product?", "type": "select", "options": ["Payments / wallet", "Banking / neobank", "Lending / credit", "Trading / investment", "Insurance", "Crypto / DeFi"]},
        {"id": "regulation", "question": "Regulatory requirements?", "type": "select", "options": ["Minimal (MVP stage)", "Basic KYC needed", "Full compliance (PCI-DSS, SOC2)", "Banking license level"]},
        {"id": "transactions", "question": "Expected daily transactions?", "type": "select", "options": ["< 1K", "1K - 10K", "10K - 100K", "100K+"]},
        {"id": "currency", "question": "Currency support?", "type": "select", "options": ["Single currency", "Multi-currency (fiat)", "Crypto + fiat", "Stablecoins"]},
    ],
    "social_platform": [
        {"id": "social_type", "question": "What type of social platform?", "type": "select", "options": ["Social network (feed-based)", "Messaging / chat", "Community / forum", "Content creation", "Video / streaming", "Professional network"]},
        {"id": "users", "question": "Expected users at launch?", "type": "select", "options": ["< 1K", "1K - 10K", "10K - 100K", "100K+"]},
        {"id": "content", "question": "Primary content type?", "type": "select", "options": ["Text posts", "Images", "Video", "Audio", "Mixed media"]},
        {"id": "real_time", "question": "Real-time features needed?", "type": "select", "options": ["Basic (notifications)", "Chat / messaging", "Live streaming", "Collaborative editing"]},
        {"id": "moderation", "question": "Content moderation needs?", "type": "select", "options": ["Manual only", "Basic automated", "AI-powered moderation", "Regulatory-grade"]},
    ],
}


def get_interview_questions(domain: str, existing_answers: Optional[dict] = None) -> dict:
    """
    Get clarification questions for a domain.

    Returns:
        {
            "domain": str,
            "questions": [{ id, question, type, options }],
            "total": int,
            "answered": int,
        }
    """
    questions = DOMAIN_QUESTIONS.get(domain, DOMAIN_QUESTIONS.get("ai_saas", []))
    answered = existing_answers or {}

    # Filter out already-answered questions
    remaining = [q for q in questions if q["id"] not in answered]

    return {
        "domain": domain,
        "questions": remaining,
        "total": len(questions),
        "answered": len(answered),
    }


def process_interview_answers(domain: str, answers: dict) -> dict:
    """
    Process interview answers and generate architecture constraints.

    Returns constraints dict for the architecture reasoner.
    """
    constraints = {
        "domain": domain,
        "scale_tier": "medium",
        "security_level": "standard",
        "latency_requirement": "moderate",
        "features": [],
    }

    # Scale tier from user count answers
    user_answers = answers.get("users") or answers.get("api_volume") or answers.get("device_count") or ""
    if any(x in user_answers.lower() for x in ["1m+", "100k+", "10m+"]):
        constraints["scale_tier"] = "enterprise"
    elif any(x in user_answers.lower() for x in ["10k", "100k"]):
        constraints["scale_tier"] = "growth"
    elif any(x in user_answers.lower() for x in ["1k", "1,000"]):
        constraints["scale_tier"] = "startup"
    else:
        constraints["scale_tier"] = "mvp"

    # Security level
    sensitivity = answers.get("data_sensitivity", "") or answers.get("regulation", "")
    if any(x in sensitivity.lower() for x in ["regulated", "pii", "healthcare", "financial", "compliance", "banking"]):
        constraints["security_level"] = "high"
    elif any(x in sensitivity.lower() for x in ["business", "moderate", "basic"]):
        constraints["security_level"] = "moderate"

    # Latency
    latency = answers.get("latency", "") or answers.get("data_frequency", "")
    if any(x in latency.lower() for x in ["real-time", "sub-second", "< 100ms"]):
        constraints["latency_requirement"] = "low"
    elif any(x in latency.lower() for x in ["batch", "hours"]):
        constraints["latency_requirement"] = "relaxed"

    # Store all raw answers for prompt construction
    constraints["raw_answers"] = answers

    logger.info(f"Processed interview → scale={constraints['scale_tier']}, security={constraints['security_level']}")
    return constraints

