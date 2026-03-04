"""Test: verify metadata-driven health scoring produces distinct scores per domain."""
import json, sys
sys.path.insert(0, ".")

from engine.ai_engine import classify_idea, generate_architecture

tests = [
    ("API Integration Platform connecting Stripe and Twilio", "api_platform"),
    ("AI SaaS platform with ML model serving and training pipelines", "ai_saas"),
    ("IoT Smart Home system with 10000 sensors and MQTT", "iot_system"),
    ("Fintech payment processing with KYC and fraud detection", "fintech"),
]

print("=" * 70)
print("METADATA-DRIVEN HEALTH SCORING VERIFICATION")
print("=" * 70)

for idea, expected_domain in tests:
    r = classify_idea(idea)
    arch = generate_architecture(idea=idea, project_id=r["project_id"])
    
    print(f"\nDomain: {arch.get('domain')} ({arch.get('domain_label')})")
    print(f"  Nodes: {len(arch['nodes'])}")
    
    print(f"  Health Scores:")
    for dim, score in arch.get("healthScores", {}).items():
        print(f"    {dim}: {score}/10")
    
    print(f"  Health Justifications:")
    for dim, detail in arch.get("healthDetails", {}).items():
        for reason in detail.get("reasons", []):
            print(f"    [{dim}] {reason}")
    
    print(f"  Risks ({len(arch.get('risks', []))}):")
    for risk in arch.get("risks", [])[:2]:
        print(f"    - {risk}")
    print("-" * 70)

# Verify scores differ between domains
print("\n=== SCORE COMPARISON ===")
results = {}
for idea, domain in tests:
    r = classify_idea(idea)
    arch = generate_architecture(idea=idea, project_id=r["project_id"])
    results[domain] = arch.get("healthScores", {})
    
print(f"{'Domain':<15} {'Scale':>6} {'Cost':>6} {'Sec':>6} {'Maint':>6}")
for domain, scores in results.items():
    print(f"{domain:<15} {scores.get('scalability', 0):>6} {scores.get('costEfficiency', 0):>6} {scores.get('security', 0):>6} {scores.get('maintainability', 0):>6}")

# Check that not all scores are identical
all_scale = [s.get("scalability") for s in results.values()]
all_same = len(set(all_scale)) == 1
if all_same:
    print("\n⚠ WARNING: All scalability scores are identical — metadata not differentiating!")
else:
    print(f"\n✓ Scalability scores vary across domains: {all_scale}")
print("\n=== DONE ===")
