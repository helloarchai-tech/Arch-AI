"""
Test: Verify constraint-driven architecture produces different outputs
for MVP vs enterprise scale with the same idea.
"""
import json, sys
sys.path.insert(0, ".")

from engine.intent_classifier import classify_intent
from engine.constraint_normalizer import normalize_constraints
from engine.architecture_reasoner import generate_domain_architecture
from engine.ai_engine import generate_architecture, classify_idea

def test_constraint_normalizer():
    print("=" * 70)
    print("TEST 1: Constraint Normalizer")
    print("=" * 70)
    
    # Case A: MVP idea, no interview
    r1 = classify_intent("Simple MVP prototype API for a weekend hackathon project")
    c1 = normalize_constraints(r1, {}, r1.get("idea", "Simple MVP prototype"))
    print(f"  MVP idea → scale_tier={c1['scale_tier']}, complexity={c1['complexity_budget']}")
    print(f"  Features: {[k for k,v in c1['features'].items() if v]}")
    assert c1["scale_tier"] in ("mvp", "startup"), f"Expected mvp/startup, got {c1['scale_tier']}"
    
    # Case B: Enterprise idea, no interview
    r2 = classify_intent("Enterprise global API platform for millions of users with real-time analytics")
    c2 = normalize_constraints(r2, {}, "Enterprise global API platform for millions of users with real-time analytics")
    print(f"  Enterprise idea → scale_tier={c2['scale_tier']}, complexity={c2['complexity_budget']}")
    print(f"  Features: {[k for k,v in c2['features'].items() if v]}")
    assert c2["scale_tier"] == "enterprise", f"Expected enterprise, got {c2['scale_tier']}"
    assert c2["features"]["real_time"] == True
    assert c2["features"]["analytics"] == True
    
    # Case C: With interview constraints (should override)
    r3 = classify_intent("Some API")
    c3 = normalize_constraints(r3, {"scale_tier": "growth", "latency_sensitivity": "high"}, "Some API")
    print(f"  Interview override → scale_tier={c3['scale_tier']}, latency={c3['latency_sensitivity']}")
    assert c3["scale_tier"] == "growth"
    assert c3["latency_sensitivity"] == "high"
    
    print("  ✓ All normalizer tests passed\n")


def test_different_architectures():
    print("=" * 70)
    print("TEST 2: MVP vs Enterprise Architecture (same domain)")
    print("=" * 70)
    
    idea = "API Integration Platform connecting Stripe and Twilio"
    
    # MVP architecture
    r1 = classify_idea(idea + " simple MVP prototype")
    mvp_constraints = normalize_constraints(
        {"domain": "api_platform", "sub_features": [], "idea": idea},
        {"scale_tier": "mvp"},
        idea + " simple MVP prototype"
    )
    mvp_arch = generate_domain_architecture(
        idea=idea, domain="api_platform",
        constraints=mvp_constraints, project_id="test_mvp"
    )
    
    # Enterprise architecture
    r2 = classify_idea(idea + " enterprise global millions of users")
    ent_constraints = normalize_constraints(
        {"domain": "api_platform", "sub_features": ["real_time", "analytics"], "idea": idea},
        {"scale_tier": "enterprise"},
        idea + " enterprise global millions of users"
    )
    ent_arch = generate_domain_architecture(
        idea=idea, domain="api_platform",
        constraints=ent_constraints, project_id="test_ent"
    )
    
    mvp_nodes = [n["data"]["label"] for n in mvp_arch["nodes"]]
    ent_nodes = [n["data"]["label"] for n in ent_arch["nodes"]]
    
    print(f"\n  MVP Architecture ({len(mvp_nodes)} components):")
    for n in mvp_nodes:
        print(f"    - {n}")
    
    print(f"\n  Enterprise Architecture ({len(ent_nodes)} components):")
    for n in ent_nodes:
        print(f"    - {n}")
    
    # Key assertion: enterprise should have MORE components
    assert len(ent_nodes) > len(mvp_nodes), \
        f"Enterprise ({len(ent_nodes)}) should have more nodes than MVP ({len(mvp_nodes)})"
    
    # Enterprise should have scaling infra that MVP lacks
    ent_set = set(ent_nodes)
    mvp_set = set(mvp_nodes)
    only_enterprise = ent_set - mvp_set
    print(f"\n  Enterprise-only components: {only_enterprise}")
    
    print(f"\n  ✓ MVP has {len(mvp_nodes)} components, Enterprise has {len(ent_nodes)}")
    print("  ✓ Different architectures for different scales!\n")


def test_selection_log():
    print("=" * 70)
    print("TEST 3: Selection Log (Reasoning Transparency)")
    print("=" * 70)
    
    constraints = normalize_constraints(
        {"domain": "api_platform", "sub_features": [], "idea": "simple api"},
        {"scale_tier": "mvp"},
        "simple api mvp"
    )
    arch = generate_domain_architecture(
        idea="simple api", domain="api_platform",
        constraints=constraints, project_id="test_log"
    )
    
    log = arch.get("selection_log", [])
    print(f"  Selection log ({len(log)} entries):")
    for entry in log:
        status = "✓" if entry["included"] else "✗"
        print(f"    {status} {entry['name']}: score={entry['score']} ({entry['reason']})")
    
    excluded = [e for e in log if not e["included"]]
    print(f"\n  ✓ {len(excluded)} components excluded by necessity scoring")
    print()


def test_fintech_security():
    print("=" * 70)
    print("TEST 4: Fintech Domain (Security Level)")
    print("=" * 70)
    
    constraints = normalize_constraints(
        {"domain": "fintech", "sub_features": ["payments", "compliance"], "idea": "fintech"},
        {},
        "Fintech payment platform with KYC and compliance"
    )
    print(f"  Security: {constraints['security_level']}")
    print(f"  Latency: {constraints['latency_sensitivity']}")
    assert constraints["security_level"] == "strict", f"Expected strict, got {constraints['security_level']}"
    assert constraints["latency_sensitivity"] == "high"
    print("  ✓ Fintech correctly gets strict security + high latency sensitivity\n")


if __name__ == "__main__":
    test_constraint_normalizer()
    test_different_architectures()
    test_selection_log()
    test_fintech_security()
    print("=" * 70)
    print("ALL TESTS PASSED ✓")
    print("=" * 70)
