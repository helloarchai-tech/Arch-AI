"""Batch augment component JSONs with scoring metadata."""
import json, os, sys

COMPONENTS_DIR = os.path.join(os.path.dirname(__file__), "components")

# Per-name scoring overrides (domain-aware tradeoffs)
NAME_SCORES = {
    # High scalability components
    "load balancer":    {"s": 10, "l": 2,  "c": 2, "b": "critical"},
    "cdn":              {"s": 10, "l": -20,"c": 1, "b": "low"},
    "cache":            {"s": 9,  "l": -15,"c": 2, "b": "medium"},
    "response cache":   {"s": 9,  "l": -15,"c": 2, "b": "medium"},
    "message queue":    {"s": 9,  "l": 5,  "c": 4, "b": "high"},
    "event bus":        {"s": 9,  "l": 5,  "c": 4, "b": "high"},
    "object storage":   {"s": 10, "l": 20, "c": 1, "b": "low"},
    "blob storage":     {"s": 10, "l": 20, "c": 1, "b": "low"},
    # Gateway / security
    "api gateway":      {"s": 9,  "l": 10, "c": 5, "b": "critical"},
    "auth":             {"s": 8,  "l": 8,  "c": 4, "b": "critical"},
    "rate limiter":     {"s": 9,  "l": 2,  "c": 3, "b": "medium"},
    # AI / ML
    "ml":               {"s": 5,  "l": 50, "c": 8, "b": "high"},
    "inference":        {"s": 5,  "l": 50, "c": 8, "b": "high"},
    "training":         {"s": 6,  "l": 0,  "c": 9, "b": "medium"},
    "embedding":        {"s": 6,  "l": 30, "c": 7, "b": "medium"},
    "vector":           {"s": 6,  "l": 15, "c": 6, "b": "high"},
    # Data
    "database":         {"s": 5,  "l": 12, "c": 4, "b": "critical"},
    "primary database": {"s": 5,  "l": 12, "c": 4, "b": "critical"},
    "time-series":      {"s": 7,  "l": 8,  "c": 5, "b": "high"},
    "data warehouse":   {"s": 7,  "l": 20, "c": 6, "b": "high"},
    "graph database":   {"s": 5,  "l": 15, "c": 6, "b": "high"},
    # Infrastructure
    "monitoring":       {"s": 7,  "l": 0,  "c": 3, "b": "low"},
    "worker":           {"s": 8,  "l": 0,  "c": 4, "b": "medium"},
    "background":       {"s": 8,  "l": 0,  "c": 4, "b": "medium"},
    # IoT specific
    "mqtt":             {"s": 8,  "l": 5,  "c": 5, "b": "high"},
    "edge gateway":     {"s": 7,  "l": 3,  "c": 6, "b": "high"},
    "device registry":  {"s": 6,  "l": 10, "c": 5, "b": "high"},
    "telemetry":        {"s": 8,  "l": 5,  "c": 5, "b": "medium"},
    # Fintech
    "ledger":           {"s": 4,  "l": 15, "c": 8, "b": "critical"},
    "transaction":      {"s": 5,  "l": 12, "c": 7, "b": "critical"},
    "fraud":            {"s": 6,  "l": 20, "c": 7, "b": "high"},
    "kyc":              {"s": 5,  "l": 25, "c": 8, "b": "high"},
    "compliance":       {"s": 5,  "l": 15, "c": 7, "b": "high"},
    # Marketplace
    "search engine":    {"s": 7,  "l": 20, "c": 6, "b": "medium"},
    "product catalog":  {"s": 6,  "l": 10, "c": 4, "b": "medium"},
    "order":            {"s": 6,  "l": 15, "c": 6, "b": "high"},
    "payment":          {"s": 7,  "l": 12, "c": 5, "b": "critical"},
    "notification":     {"s": 8,  "l": 5,  "c": 3, "b": "low"},
    "push":             {"s": 8,  "l": 5,  "c": 3, "b": "low"},
    # Social
    "feed":             {"s": 6,  "l": 20, "c": 7, "b": "high"},
    "social graph":     {"s": 5,  "l": 15, "c": 7, "b": "high"},
    "real-time":        {"s": 7,  "l": 5,  "c": 5, "b": "medium"},
    "content moderation":{"s": 6, "l": 25, "c": 6, "b": "medium"},
    # DevOps
    "pipeline":         {"s": 7,  "l": 0,  "c": 6, "b": "medium"},
    "agent":            {"s": 8,  "l": 0,  "c": 4, "b": "low"},
    "log":              {"s": 8,  "l": 0,  "c": 3, "b": "low"},
    # Data Platform
    "ingestion":        {"s": 8,  "l": 10, "c": 5, "b": "medium"},
    "stream processor": {"s": 8,  "l": 8,  "c": 6, "b": "high"},
    "etl":              {"s": 7,  "l": 0,  "c": 6, "b": "medium"},
    # RAG
    "retrieval":        {"s": 6,  "l": 25, "c": 6, "b": "high"},
    "document":         {"s": 7,  "l": 15, "c": 5, "b": "medium"},
    "chunking":         {"s": 7,  "l": 10, "c": 4, "b": "low"},
}

# Category-level defaults
CAT_DEFAULTS = {
    "frontend":       {"s": 8,  "l": 5,  "c": 3, "b": "low"},
    "backend":        {"s": 6,  "l": 15, "c": 5, "b": "medium"},
    "database":       {"s": 5,  "l": 12, "c": 4, "b": "critical"},
    "ai":             {"s": 4,  "l": 40, "c": 8, "b": "high"},
    "infrastructure": {"s": 8,  "l": 3,  "c": 2, "b": "low"},
    "external":       {"s": 6,  "l": 30, "c": 2, "b": "medium"},
}


def find_scores(comp):
    name = comp.get("name", "").lower()
    # Try exact name match first
    for key, vals in NAME_SCORES.items():
        if key in name:
            return vals
    # Fall back to category
    cat = comp.get("category", "backend")
    return CAT_DEFAULTS.get(cat, CAT_DEFAULTS["backend"])


def augment_file(filepath):
    with open(filepath, "r") as f:
        data = json.load(f)
    
    modified = False
    for comp in data.get("components", []):
        # Only add if missing
        if "scalability_score" not in comp:
            scores = find_scores(comp)
            comp["scalability_score"] = scores["s"]
            comp["latency_impact"] = scores["l"]
            comp["complexity_weight"] = scores["c"]
            comp["failure_blast_radius"] = scores["b"]
            modified = True
    
    if modified:
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
        print(f"  ✓ Augmented: {os.path.basename(filepath)} ({len(data.get('components',[]))} components)")
    else:
        print(f"  ○ Already has metadata: {os.path.basename(filepath)}")


# Process all JSON files
print("Augmenting component libraries with scoring metadata...")
for fname in sorted(os.listdir(COMPONENTS_DIR)):
    if fname.endswith(".json"):
        augment_file(os.path.join(COMPONENTS_DIR, fname))

print("\nDone!")
