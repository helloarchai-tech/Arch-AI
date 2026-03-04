"""
Batch update component JSONs:
1. Demote non-essential components from core=true to core=false
2. Add 'dependencies' fields for dependency chaining
3. Add 'min_scale' field for scale-aware selection
"""
import json, os

COMPONENTS_DIR = os.path.join(os.path.dirname(__file__), "components")

# Components that should ALWAYS be core (present in every architecture)
ALWAYS_CORE = {
    "web_app", "web_console", "client",
    "api_gateway", "gateway",
    "core_api", "api",
    "primary_db", "db",
    "auth_service",
}

# Components that are OPTIONAL (conditional on scale/features)
OPTIONAL_WITH_METADATA = {
    # id: {core: false, min_scale, dependencies}
    "cdn":              {"core": False, "min_scale": "growth"},
    "load_balancer":    {"core": False, "min_scale": "growth"},
    "cache":            {"core": False, "min_scale": "startup"},
    "response_cache":   {"core": False, "min_scale": "startup"},
    "message_queue":    {"core": False, "min_scale": "startup", "dependencies": []},
    "queue":            {"core": False, "min_scale": "startup"},
    "workers":          {"core": False, "min_scale": "startup", "dependencies": ["message_queue", "queue"]},
    "background_workers":{"core": False, "min_scale": "startup", "dependencies": ["message_queue", "queue"]},
    "monitoring":       {"core": False, "min_scale": "startup"},
    "analytics_service":{"core": False, "min_scale": "growth"},
    "object_storage":   {"core": False, "min_scale": "startup"},
    
    # AI-specific (complex, not for MVP)
    "ml_service":       {"core": False, "min_scale": "startup"},
    "training_pipeline":{"core": False, "min_scale": "growth", "dependencies": ["model_registry", "object_storage"]},
    "model_registry":   {"core": False, "min_scale": "startup"},
    "feature_store":    {"core": False, "min_scale": "growth", "dependencies": ["primary_db"]},
    "inference_service":{"core": False, "min_scale": "startup"},
    
    # API Platform specific
    "api_discovery":    {"core": False, "min_scale": "startup"},
    "orchestrator":     {"core": False, "min_scale": "growth", "dependencies": ["message_queue"]},
    "connector_layer":  {"core": False, "min_scale": "startup"},
    "schema_mapper":    {"core": False, "min_scale": "growth"},
    "webhook_manager":  {"core": False, "min_scale": "startup", "dependencies": ["message_queue"]},
    "api_registry":     {"core": False, "min_scale": "startup"},
    
    # IoT specific
    "edge_gateway":     {"core": False, "min_scale": "startup"},
    "device_registry":  {"core": False, "min_scale": "startup"},
    "device_shadow":    {"core": False, "min_scale": "growth"},
    "ota_service":      {"core": False, "min_scale": "growth"},
    "telemetry_processor":{"core": False, "min_scale": "startup"},
    "stream_processor": {"core": False, "min_scale": "growth", "dependencies": ["message_queue"]},
    
    # Fintech specific
    "fraud_detection":  {"core": False, "min_scale": "startup", "dependencies": ["primary_db"]},
    "compliance_engine":{"core": False, "min_scale": "startup"},
    "notification_service": {"core": False, "min_scale": "startup"},
    
    # Social specific
    "feed_service":     {"core": False, "min_scale": "startup", "dependencies": ["cache", "primary_db"]},
    "social_graph_db":  {"core": False, "min_scale": "startup"},
    "real_time_server": {"core": False, "min_scale": "startup"},
    "content_moderation":{"core": False, "min_scale": "growth"},
    "media_processor":  {"core": False, "min_scale": "startup", "dependencies": ["object_storage"]},
    
    # Data Platform
    "etl_pipeline":     {"core": False, "min_scale": "startup"},
    "data_warehouse":   {"core": False, "min_scale": "growth"},
    "dashboard_service":{"core": False, "min_scale": "startup"},
    
    # Marketplace
    "search_engine":    {"core": False, "min_scale": "startup"},
    "order_service":    {"core": False, "min_scale": "startup"},
    "payment_service":  {"core": False, "min_scale": "startup"},
    "review_service":   {"core": False, "min_scale": "growth"},
    "seller_dashboard": {"core": False, "min_scale": "startup"},
    
    # RAG
    "retrieval_pipeline":{"core": False, "min_scale": "startup"},
    "embedding_service":{"core": False, "min_scale": "startup"},
    "document_processor":{"core": False, "min_scale": "startup", "dependencies": ["object_storage"]},
    "chunking_engine":  {"core": False, "min_scale": "startup"},
    
    # DevOps
    "pipeline_engine":  {"core": False, "min_scale": "startup"},
    "worker_agents":    {"core": False, "min_scale": "startup"},
    "log_collector":    {"core": False, "min_scale": "startup"},
    "artifact_storage": {"core": False, "min_scale": "startup", "dependencies": ["object_storage"]},
}


def update_file(filepath):
    with open(filepath, "r") as f:
        data = json.load(f)
    
    modified = False
    for comp in data.get("components", []):
        cid = comp.get("id", "")
        
        # Check if this component should be demoted
        if cid in OPTIONAL_WITH_METADATA:
            overrides = OPTIONAL_WITH_METADATA[cid]
            if comp.get("core", False) and not overrides.get("core", True):
                comp["core"] = False
                modified = True
            if "min_scale" not in comp and "min_scale" in overrides:
                comp["min_scale"] = overrides["min_scale"]
                modified = True
            if "dependencies" not in comp and "dependencies" in overrides:
                comp["dependencies"] = overrides["dependencies"]
                modified = True
        
        # Verify ALWAYS_CORE components stay core
        if cid in ALWAYS_CORE and not comp.get("core", False):
            comp["core"] = True
            modified = True
    
    if modified:
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
        
        core_count = sum(1 for c in data["components"] if c.get("core"))
        total = len(data["components"])
        print(f"  ✓ {os.path.basename(filepath)}: {core_count}/{total} core components")
    else:
        core_count = sum(1 for c in data["components"] if c.get("core"))
        total = len(data["components"])
        print(f"  ○ {os.path.basename(filepath)}: {core_count}/{total} core (no changes needed)")


print("Updating core flags and adding dependencies...")
for fname in sorted(os.listdir(COMPONENTS_DIR)):
    if fname.endswith(".json"):
        update_file(os.path.join(COMPONENTS_DIR, fname))
print("\nDone!")
