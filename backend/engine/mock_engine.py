"""
Mock AI Engine — produces realistic sample architecture data
when no LLM API is configured. Enables full demo without API key.
"""

import math


def get_mock_architecture(idea: str, project_id: str, target_users: int = 10000) -> dict:
    """Generate a comprehensive mock architecture for any product idea."""
    idea_lower = idea.lower()

    # Detect category for smarter mocks
    is_ai = any(k in idea_lower for k in ["ai", "ml", "machine learning", "llm", "rag", "gpt", "neural"])
    is_iot = any(k in idea_lower for k in ["iot", "smart device", "sensor", "embedded", "telemetry"])
    is_ecom = any(k in idea_lower for k in ["ecommerce", "e-commerce", "marketplace", "shop", "store", "vendor"])
    is_mobile = any(k in idea_lower for k in ["mobile", "app", "ios", "android", "react native"])
    is_fintech = any(k in idea_lower for k in ["fintech", "finance", "payment", "banking", "trading"])

    # Base nodes present in ALL architectures
    nodes = [
        {"id": "client", "type": "component", "position": {"x": 400, "y": 0},
         "data": {"label": "Web / Mobile Client", "category": "frontend", "tech": "React / Next.js", "icon": "monitor"}},
        {"id": "cdn", "type": "component", "position": {"x": 700, "y": 0},
         "data": {"label": "CDN", "category": "infrastructure", "tech": "CloudFront / Cloudflare", "icon": "globe"}},
        {"id": "lb", "type": "component", "position": {"x": 400, "y": 130},
         "data": {"label": "Load Balancer", "category": "infrastructure", "tech": "ALB / Nginx", "icon": "server"}},
        {"id": "gateway", "type": "component", "position": {"x": 400, "y": 260},
         "data": {"label": "API Gateway", "category": "backend", "tech": "Kong / AWS API GW", "icon": "shield"}},
        {"id": "auth", "type": "component", "position": {"x": 100, "y": 260},
         "data": {"label": "Auth Service", "category": "backend", "tech": "JWT / OAuth 2.0", "icon": "lock"}},
        {"id": "api", "type": "component", "position": {"x": 400, "y": 400},
         "data": {"label": "Core API Service", "category": "backend", "tech": "FastAPI / Node.js", "icon": "cpu"}},
        {"id": "cache", "type": "component", "position": {"x": 150, "y": 530},
         "data": {"label": "Cache Layer", "category": "database", "tech": "Redis", "icon": "database"}},
        {"id": "db", "type": "component", "position": {"x": 400, "y": 550},
         "data": {"label": "Primary Database", "category": "database", "tech": "PostgreSQL", "icon": "database"}},
        {"id": "storage", "type": "component", "position": {"x": 700, "y": 550},
         "data": {"label": "Object Storage", "category": "infrastructure", "tech": "S3 / GCS", "icon": "hard-drive"}},
        {"id": "monitor", "type": "component", "position": {"x": 100, "y": 130},
         "data": {"label": "Monitoring & Logging", "category": "infrastructure", "tech": "Grafana / Datadog", "icon": "bar-chart"}},
    ]

    edges = [
        {"id": "e1", "source": "client", "target": "lb", "label": "HTTPS"},
        {"id": "e2", "source": "client", "target": "cdn", "label": "Static assets"},
        {"id": "e3", "source": "lb", "target": "gateway"},
        {"id": "e4", "source": "gateway", "target": "auth", "label": "Verify token"},
        {"id": "e5", "source": "gateway", "target": "api"},
        {"id": "e6", "source": "api", "target": "db", "label": "Read/Write"},
        {"id": "e7", "source": "api", "target": "cache", "label": "Cache lookup"},
        {"id": "e8", "source": "monitor", "target": "api", "label": "Metrics", "animated": True},
    ]

    tech_stack = [
        {"category": "Frontend", "technology": "React / Next.js", "reason": "SSR, great DX, large ecosystem"},
        {"category": "Backend", "technology": "FastAPI (Python)", "reason": "High performance, auto-docs, async"},
        {"category": "Database", "technology": "PostgreSQL", "reason": "ACID, JSON support, mature tooling"},
        {"category": "Cache", "technology": "Redis", "reason": "In-memory, pub/sub, session mgmt"},
        {"category": "Cloud", "technology": "AWS (EC2, RDS, S3)", "reason": "Most mature, widest services"},
        {"category": "CI/CD", "technology": "GitHub Actions", "reason": "Native GH integration, flexible"},
        {"category": "Monitoring", "technology": "Grafana + Prometheus", "reason": "Open-source, dashboards"},
        {"category": "Auth", "technology": "JWT + OAuth 2.0", "reason": "Stateless, widely supported"},
    ]

    risks = [
        "Single point of failure at API Gateway without redundancy",
        "Database may become bottleneck at 100K+ concurrent writes",
        "No disaster recovery plan for cross-region failover",
        "Missing rate limiting could lead to API abuse",
    ]

    security = [
        "Implement rate limiting (100 req/min per user)",
        "Enable encryption at rest for DB and storage",
        "Use secrets manager for credential storage",
        "Add WAF in front of Load Balancer",
        "Implement CORS policies and CSP headers",
        "Regular dependency vulnerability scanning",
    ]

    # --- Domain-specific additions ---
    if is_ai:
        nodes.extend([
            {"id": "ai", "type": "component", "position": {"x": 100, "y": 400},
             "data": {"label": "AI/ML Service", "category": "ai", "tech": "Python / PyTorch", "icon": "brain"}},
            {"id": "vectordb", "type": "component", "position": {"x": 100, "y": 680},
             "data": {"label": "Vector Database", "category": "database", "tech": "Chroma / Pinecone", "icon": "database"}},
            {"id": "worker", "type": "component", "position": {"x": 700, "y": 400},
             "data": {"label": "ML Workers", "category": "backend", "tech": "Celery / Ray", "icon": "zap"}},
            {"id": "mq", "type": "component", "position": {"x": 700, "y": 260},
             "data": {"label": "Message Queue", "category": "infrastructure", "tech": "RabbitMQ / Redis", "icon": "mail"}},
        ])
        edges.extend([
            {"id": "e_ai1", "source": "api", "target": "ai", "label": "ML inference", "animated": True},
            {"id": "e_ai2", "source": "ai", "target": "vectordb", "label": "Embeddings"},
            {"id": "e_ai3", "source": "api", "target": "mq", "label": "Async jobs"},
            {"id": "e_ai4", "source": "mq", "target": "worker"},
            {"id": "e_ai5", "source": "worker", "target": "storage", "label": "Model artifacts"},
        ])
        tech_stack.extend([
            {"category": "AI/ML", "technology": "Python + PyTorch", "reason": "Industry standard for ML"},
            {"category": "Vector DB", "technology": "Chroma / Pinecone", "reason": "Semantic search, RAG pipeline"},
        ])
        risks.append("AI/ML inference latency may impact UX under load")

    elif is_iot:
        nodes.extend([
            {"id": "mqtt", "type": "component", "position": {"x": 100, "y": 400},
             "data": {"label": "MQTT Broker", "category": "infrastructure", "tech": "Mosquitto / HiveMQ", "icon": "mail"}},
            {"id": "timeseries", "type": "component", "position": {"x": 100, "y": 680},
             "data": {"label": "Time-Series DB", "category": "database", "tech": "InfluxDB / TimescaleDB", "icon": "database"}},
            {"id": "stream", "type": "component", "position": {"x": 700, "y": 400},
             "data": {"label": "Stream Processor", "category": "backend", "tech": "Apache Kafka", "icon": "zap"}},
        ])
        edges.extend([
            {"id": "e_iot1", "source": "api", "target": "mqtt", "label": "Device commands"},
            {"id": "e_iot2", "source": "mqtt", "target": "stream", "label": "Telemetry data", "animated": True},
            {"id": "e_iot3", "source": "stream", "target": "timeseries", "label": "Store metrics"},
        ])
        tech_stack.extend([
            {"category": "IoT", "technology": "MQTT + HiveMQ", "reason": "Low latency, lightweight protocol"},
            {"category": "Time-Series", "technology": "InfluxDB", "reason": "Optimized for time-series data"},
        ])
        risks.append("High device volume may overwhelm MQTT broker")

    elif is_ecom:
        nodes.extend([
            {"id": "payment", "type": "component", "position": {"x": 100, "y": 400},
             "data": {"label": "Payment Service", "category": "backend", "tech": "Stripe / PayPal", "icon": "shield"}},
            {"id": "search", "type": "component", "position": {"x": 700, "y": 400},
             "data": {"label": "Search Engine", "category": "backend", "tech": "Elasticsearch", "icon": "cpu"}},
            {"id": "mq", "type": "component", "position": {"x": 700, "y": 260},
             "data": {"label": "Event Bus", "category": "infrastructure", "tech": "RabbitMQ / Kafka", "icon": "mail"}},
        ])
        edges.extend([
            {"id": "e_ec1", "source": "api", "target": "payment", "label": "Process payment"},
            {"id": "e_ec2", "source": "api", "target": "search", "label": "Product search"},
            {"id": "e_ec3", "source": "api", "target": "mq", "label": "Order events"},
        ])
        tech_stack.extend([
            {"category": "Payments", "technology": "Stripe", "reason": "PCI compliant, excellent API"},
            {"category": "Search", "technology": "Elasticsearch", "reason": "Full-text search, faceting"},
        ])
        risks.append("Payment processing failures need robust retry logic")

    else:
        # Generic additions
        nodes.extend([
            {"id": "worker", "type": "component", "position": {"x": 700, "y": 400},
             "data": {"label": "Background Workers", "category": "backend", "tech": "Celery / Bull", "icon": "zap"}},
            {"id": "mq", "type": "component", "position": {"x": 700, "y": 260},
             "data": {"label": "Message Queue", "category": "infrastructure", "tech": "Redis / RabbitMQ", "icon": "mail"}},
        ])
        edges.extend([
            {"id": "e_g1", "source": "api", "target": "mq", "label": "Async jobs"},
            {"id": "e_g2", "source": "mq", "target": "worker"},
            {"id": "e_g3", "source": "worker", "target": "storage", "label": "File processing"},
        ])

    # Cost estimation based on scale
    scale_factor = max(1, math.log10(target_users) - 2)
    base_cost = int(200 * scale_factor)
    monthly_low = base_cost
    monthly_high = int(base_cost * 1.8)

    return {
        "project_id": project_id,
        "title": idea,
        "summary": f'A scalable architecture for "{idea}" featuring a modern frontend, API gateway, '
                   f'microservices backend, managed database, caching layer, and cloud infrastructure '
                   f'with CI/CD pipeline. Designed for {target_users:,}+ users with horizontal scaling.',
        "nodes": nodes,
        "edges": edges,
        "techStack": tech_stack,
        "costEstimate": {
            "monthly": f"${monthly_low:,} - ${monthly_high:,}",
            "yearly": f"${monthly_low * 12:,} - ${monthly_high * 12:,}",
            "breakdown": [
                {"service": "Compute (EC2/ECS)", "cost": f"${int(base_cost * 0.35)}-{int(base_cost * 0.55)}/mo"},
                {"service": "Database (RDS)", "cost": f"${int(base_cost * 0.2)}-{int(base_cost * 0.3)}/mo"},
                {"service": "Cache (ElastiCache)", "cost": f"${int(base_cost * 0.1)}-{int(base_cost * 0.15)}/mo"},
                {"service": "Storage (S3)", "cost": f"${int(base_cost * 0.05)}-{int(base_cost * 0.08)}/mo"},
                {"service": "CDN (CloudFront)", "cost": f"${int(base_cost * 0.06)}-{int(base_cost * 0.1)}/mo"},
                {"service": "Load Balancer", "cost": f"${int(base_cost * 0.04)}-{int(base_cost * 0.06)}/mo"},
                {"service": "Monitoring", "cost": f"${int(base_cost * 0.03)}-{int(base_cost * 0.05)}/mo"},
            ],
        },
        "healthScores": {
            "scalability": min(10, 7 + int(scale_factor * 0.5)),
            "costEfficiency": max(4, 9 - int(scale_factor)),
            "security": 7,
            "maintainability": 8,
        },
        "risks": risks,
        "securitySuggestions": security,
    }


def get_mock_chat_response(message: str, title: str) -> dict:
    """Generate a context-aware mock chat response."""
    msg_lower = message.lower()

    if any(k in msg_lower for k in ["firebase", "supabase"]):
        resp = (f"For your {title} project, Firebase could work well for rapid prototyping with its real-time database "
                "and built-in auth. However, for production scale, PostgreSQL + custom backend gives you more "
                "control over data modeling, querying, and cost optimization.\n\n"
                "**My recommendation:** Start with Supabase (PostgreSQL + real-time + auth) — it gives you "
                "Firebase-like DX but with PostgreSQL underneath, so you won't hit scaling walls.")
    elif any(k in msg_lower for k in ["microservice", "monolith"]):
        resp = (f"For {title}, I'd recommend starting with a **modular monolith** approach:\n\n"
                "• Keep all services in one codebase but with clear module boundaries\n"
                "• Extract to microservices only when a specific module needs independent scaling\n"
                "• This avoids premature complexity while keeping the door open\n\n"
                "**When to split:** When one module needs different scaling, deployment frequency, "
                "or technology than others.")
    elif any(k in msg_lower for k in ["cost", "budget", "expensive", "pricing"]):
        resp = (f"Here's a cost optimization strategy for {title}:\n\n"
                "**Quick wins:**\n"
                "• Use spot/preemptible instances for non-critical workers (60-90% savings)\n"
                "• Implement aggressive caching with Redis (reduce DB load by 70%+)\n"
                "• Use CDN for static assets (cheaper than compute)\n"
                "• Reserved instances for baseline capacity\n\n"
                "**At scale (100K+ users):** Consider multi-cloud arbitrage and auto-scaling policies.")
    else:
        resp = (f"Based on your {title} architecture, here's my analysis:\n\n"
                "The current architecture provides strong separation of concerns with the API gateway pattern. "
                "Key strengths include the caching layer for performance and the message queue for async processing.\n\n"
                "**Recommendations:**\n"
                "• Consider adding a CDN for static asset delivery\n"
                "• Implement circuit breakers between services\n"
                "• Add health check endpoints for each service\n"
                "• Set up structured logging for debugging\n\n"
                "Would you like me to dive deeper into any specific area?")

    return {"response": resp, "updated_architecture": None}


def get_mock_scale_response(target_users: int) -> dict:
    """Generate mock scaling recommendations."""
    factor = math.log10(max(100, target_users)) / 6

    scores = {
        "scalability": min(10, int(6 + factor * 4)),
        "costEfficiency": max(3, int(9 - factor * 4)),
        "security": min(10, int(7 + factor * 2)),
        "maintainability": max(4, int(9 - factor * 3)),
    }

    return {
        "healthScores": scores,
        "recommendations": f"Architecture adjusted for {target_users:,} users. "
                           f"{'Microservices recommended. ' if target_users > 50000 else ''}"
                           f"{'Multi-region deployment needed. ' if target_users > 500000 else ''}",
    }
