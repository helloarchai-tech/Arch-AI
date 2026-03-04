"""Quick test for the agentic pipeline."""
import json
import sys
sys.path.insert(0, ".")

from engine.ai_engine import classify_idea, get_questions, generate_architecture

# Test 1: Classify API Platform idea
print("=== TEST 1: Classify API Platform ===")
r = classify_idea("API Integration Platform connecting Stripe, Twilio and Slack with real-time webhooks")
print(f"Domain: {r['domain']}")
print(f"Label: {r['domain_label']}")
print(f"Confidence: {r['confidence']}")
print(f"Project ID: {r['project_id']}")
print()

# Test 2: Get questions
print("=== TEST 2: Interview Questions ===")
q = get_questions(r["project_id"])
for quest in q.get("questions", [])[:3]:
    print(f"  Q: {quest['question']}")
    print(f"     Options: {quest['options'][:3]}...")
print()

# Test 3: Generate architecture
print("=== TEST 3: Generate Architecture ===")
arch = generate_architecture(
    idea="API Integration Platform connecting Stripe, Twilio and Slack",
    project_id=r["project_id"],
)
print(f"Domain: {arch.get('domain')}")
print(f"Title: {arch.get('title')}")
print(f"Nodes ({len(arch['nodes'])}):")
for n in arch["nodes"]:
    print(f"  - {n['data']['label']} ({n['data']['category']})")
print(f"Edges: {len(arch['edges'])}")
print(f"Health: {arch.get('healthScores')}")
print(f"Risks: {arch.get('risks', [])[:2]}")
print()

# Test 4: Classify IoT idea
print("=== TEST 4: Classify IoT ===")
r2 = classify_idea("IoT Smart Home system with 10000 sensors and real-time monitoring")
print(f"Domain: {r2['domain']} ({r2['domain_label']})")
arch2 = generate_architecture(
    idea="IoT Smart Home system with sensors",
    project_id=r2["project_id"],
)
print(f"Nodes ({len(arch2['nodes'])}):")
for n in arch2["nodes"]:
    print(f"  - {n['data']['label']} ({n['data']['category']})")
print()

# Test 5: Classify RAG
print("=== TEST 5: Classify RAG ===")
r3 = classify_idea("Document Q&A chatbot using semantic search and vector database")
print(f"Domain: {r3['domain']} ({r3['domain_label']})")
arch3 = generate_architecture(idea="RAG chatbot", project_id=r3["project_id"])
print(f"Nodes ({len(arch3['nodes'])}):")
for n in arch3["nodes"]:
    print(f"  - {n['data']['label']}")

print("\n=== ALL TESTS PASSED ===")
