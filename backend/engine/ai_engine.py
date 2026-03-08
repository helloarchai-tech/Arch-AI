"""
Arch.AI AI Engine — Upgraded Agentic Orchestrator.
Pipeline: Classify → Interview → Reason → Analyze → Return.
Supports Ollama Cloud or any OpenAI-compatible API, with smart mock fallback.
"""

import json
import os
import uuid
import logging
from typing import Optional

from openai import OpenAI
from dotenv import load_dotenv

from engine.intent_classifier import classify_intent
from engine.interview_agent import get_interview_questions, process_interview_answers
from engine.health_analyzer import analyze_health, get_risks, get_security_suggestions
from engine.ollama_architecture_agent import generate_dynamic_architecture
from engine.context_manager import (
    create_context, get_context, set_classification,
    set_interview_answers, set_architecture, add_chat_message,
    get_architecture_context, update_context,
)
from engine.prompts import SYSTEM_PROMPT, CHAT_PROMPT

load_dotenv()
logger = logging.getLogger("Arch.AI.engine")

# ── LLM Client Setup ─────────────────────────────────────────────────────
_client: Optional[OpenAI] = None
_model: str = ""


def _get_client() -> tuple[Optional[OpenAI], str]:
    global _client, _model
    if _client is not None:
        return _client, _model

    ollama_url = os.getenv("OLLAMA_BASE_URL")
    ollama_model = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")
    if ollama_url:
        try:
            _client = OpenAI(base_url=ollama_url, api_key="ollama")
            _model = ollama_model
            logger.info(f"Using Ollama Cloud: {ollama_url} / {ollama_model}")
            return _client, _model
        except Exception as e:
            logger.warning(f"Ollama Cloud init failed: {e}")

    openai_key = os.getenv("OPENAI_API_KEY")
    openai_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    openai_model = os.getenv("OPENAI_MODEL", "gpt-4")
    if openai_key:
        try:
            _client = OpenAI(base_url=openai_url, api_key=openai_key)
            _model = openai_model
            logger.info(f"Using OpenAI-compatible: {openai_url} / {openai_model}")
            return _client, _model
        except Exception as e:
            logger.warning(f"OpenAI init failed: {e}")

    logger.info("No LLM configured — using component-based architecture engine")
    return None, ""


def _call_llm(messages: list[dict], temperature: float = 0.7) -> Optional[str]:
    client, model = _get_client()
    if client is None:
        return None
    try:
        response = client.chat.completions.create(
            model=model, messages=messages, temperature=temperature, max_tokens=4096,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return None


def _parse_json_response(text: str) -> Optional[dict]:
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    for marker in ["```json", "```"]:
        if marker in text:
            try:
                start = text.index(marker) + len(marker)
                end = text.index("```", start)
                return json.loads(text[start:end].strip())
            except (json.JSONDecodeError, ValueError):
                pass
    try:
        first = text.index("{")
        last = text.rindex("}") + 1
        return json.loads(text[first:last])
    except (ValueError, json.JSONDecodeError):
        pass
    return None


# ══════════════════════════════════════════════════════════════════════════
#  PUBLIC API — Agentic Pipeline
# ══════════════════════════════════════════════════════════════════════════

def classify_idea(idea: str) -> dict:
    """Step 1: Classify the product idea into a domain."""
    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    classification = classify_intent(idea)

    # Create project context
    ctx = create_context(project_id, idea)
    set_classification(project_id, classification)

    return {
        "project_id": project_id,
        "idea": idea,
        **classification,
    }


def get_questions(project_id: str) -> dict:
    """Step 2: Get clarification questions for the classified domain."""
    ctx = get_context(project_id)
    if not ctx:
        return {"error": "Project not found"}

    domain = ctx.get("domain", "ai_saas")
    existing = ctx.get("interview_answers", {})
    return {
        "project_id": project_id,
        **get_interview_questions(domain, existing),
    }


def submit_answers(project_id: str, answers: dict) -> dict:
    """Step 2b: Submit answers and get updated constraints."""
    ctx = get_context(project_id)
    if not ctx:
        return {"error": "Project not found"}

    set_interview_answers(project_id, answers)
    domain = ctx.get("domain", "ai_saas")
    constraints = process_interview_answers(domain, answers)
    update_context(project_id, constraints=constraints)

    return {
        "project_id": project_id,
        "state": "interviewed",
        "constraints": constraints,
    }


def generate_architecture(
    idea: str,
    target_users: int = 10000,
    constraints: str = "",
    project_id: str = None,
) -> dict:
    """
    Generate architecture with prompt-driven Ollama agent.
    Predefined component JSON files are only used as structural templates.
    """
    ctx = None
    if project_id:
        ctx = get_context(project_id)

    if not ctx:
        classification = classify_intent(idea)
        project_id = project_id or f"proj_{uuid.uuid4().hex[:12]}"
        create_context(project_id, idea)
        set_classification(project_id, classification)
        ctx = get_context(project_id)
    else:
        incoming_idea = (idea or "").strip()
        existing_idea = (ctx.get("idea", "") or "").strip()
        if incoming_idea and incoming_idea != existing_idea:
            update_context(project_id, idea=incoming_idea, interview_answers={}, constraints={})
            new_classification = classify_intent(incoming_idea)
            set_classification(project_id, new_classification)
            ctx = get_context(project_id)
            idea = incoming_idea
        else:
            idea = existing_idea or idea

    interview_answers = ctx.get("interview_answers", {})
    constraints_dict = ctx.get("constraints", {})
    prompt_context_parts = []
    if constraints:
        prompt_context_parts.append(f"Explicit constraints: {constraints}")
    if interview_answers:
        prompt_context_parts.append(f"Interview answers: {json.dumps(interview_answers)}")
    if constraints_dict:
        prompt_context_parts.append(f"Normalized constraints: {json.dumps(constraints_dict)}")
    if target_users:
        prompt_context_parts.append(f"Target users: {target_users}")

    llm_idea = idea
    if prompt_context_parts:
        llm_idea = f"{idea}\n\n" + "\n".join(prompt_context_parts)

    architecture = generate_dynamic_architecture(
        idea=llm_idea,
        call_llm=_call_llm,
        project_id=project_id,
    )

    if not architecture or not isinstance(architecture, dict):
        logger.error("generate_dynamic_architecture returned invalid result")
        return {
            "error": "Architecture generation produced an invalid result",
            "nodes": [],
            "edges": [],
        }

    # Keep domain metadata for continuity in existing views and chat context.
    domain = ctx.get("domain", "dynamic")
    architecture["domain"] = domain
    architecture["domain_label"] = ctx.get("domain_label", architecture.get("domain_label", "Prompt-Driven Architecture"))
    architecture["interview_answers"] = interview_answers

    # Preserve health/risk analysis with category defaults where metadata is missing.
    try:
        health = analyze_health(
            architecture.get("nodes") or [],
            architecture.get("edges") or [],
            constraints_dict,
            domain="",
        )
        architecture["healthScores"] = {k: v["score"] for k, v in health.items()}
        architecture["healthDetails"] = health
        architecture["risks"] = get_risks(architecture.get("nodes") or [], "", constraints_dict)
        architecture["securitySuggestions"] = get_security_suggestions(architecture.get("nodes") or [], "", constraints_dict)
    except Exception as health_err:
        logger.warning(f"Health analysis failed (non-fatal): {health_err}")
        architecture.setdefault("healthScores", {})
        architecture.setdefault("healthDetails", {})
        architecture.setdefault("risks", [])
        architecture.setdefault("securitySuggestions", [])

    set_architecture(project_id, architecture)
    return architecture


def chat_response(
    message: str,
    project_id: str,
    context: Optional[dict] = None,
) -> dict:
    """Handle follow-up chat with architecture context awareness."""
    ctx = get_context(project_id)
    arch_context = get_architecture_context(project_id) if ctx else {}

    # Build rich context for the LLM
    title = arch_context.get("idea", context.get("title", "the project") if context else "the project")
    domain = arch_context.get("domain_label", "")
    summary = ""
    if arch_context.get("current_architecture"):
        arch = arch_context["current_architecture"]
        summary = arch.get("summary", "")
        comp_list = ", ".join(n["data"]["label"] for n in arch.get("nodes", [])[:8])
        summary += f"\nComponents: {comp_list}"

    chat_history = arch_context.get("chat_summary", "")

    user_prompt = CHAT_PROMPT.format(
        title=title,
        summary=f"Domain: {domain}\n{summary}\n\nRecent conversation:\n{chat_history}",
        message=message,
    )

    # Track chat messages
    add_chat_message(project_id, "user", message)

    response_text = _call_llm([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ])

    if response_text:
        add_chat_message(project_id, "assistant", response_text)
        return {"response": response_text, "updated_architecture": None}

    # Mock response with context awareness
    mock_resp = _generate_contextual_mock_response(message, title, domain)
    add_chat_message(project_id, "assistant", mock_resp)
    return {"response": mock_resp, "updated_architecture": None}


def scale_architecture(
    project_id: str,
    target_users: int,
    current_title: str = "Architecture",
) -> dict:
    """Re-evaluate and regenerate architecture for a different scale."""
    ctx = get_context(project_id)
    if ctx:
        idea = ctx.get("idea", current_title)
        interview_constraints = ctx.get("constraints", {})
        if target_users >= 100000:
            interview_constraints["scale_tier"] = "enterprise"
        elif target_users >= 10000:
            interview_constraints["scale_tier"] = "growth"
        elif target_users >= 1000:
            interview_constraints["scale_tier"] = "startup"
        else:
            interview_constraints["scale_tier"] = "mvp"
        update_context(project_id, constraints=interview_constraints)
        return generate_architecture(
            idea=idea,
            target_users=target_users,
            project_id=project_id,
        )

    # Fallback: regenerate from scratch
    return generate_architecture(idea=current_title, target_users=target_users)


def _generate_contextual_mock_response(message: str, title: str, domain: str) -> str:
    """Generate a context-aware mock response when LLM is unavailable."""
    msg_lower = message.lower()

    if any(w in msg_lower for w in ["scale", "users", "traffic", "grow"]):
        return (
            f"For scaling your {domain or 'system'}, I'd recommend: "
            f"1) Add horizontal auto-scaling to your API services, "
            f"2) Implement read replicas for your database, "
            f"3) Add a CDN for static assets, and "
            f"4) Use a message queue for background processing. "
            f"These changes can handle 10x your current traffic."
        )

    if any(w in msg_lower for w in ["cost", "budget", "expensive", "cheap"]):
        return (
            f"To optimize costs for \"{title}\": "
            f"1) Use reserved instances for predictable workloads (30-50% savings), "
            f"2) Implement auto-scaling to scale down during off-peak, "
            f"3) Use spot instances for background processing, "
            f"4) Consider serverless for infrequent operations."
        )

    if any(w in msg_lower for w in ["security", "secure", "auth", "vulnerability"]):
        return (
            f"Security recommendations for your architecture: "
            f"1) Implement OAuth 2.0 + JWT for authentication, "
            f"2) Add a WAF in front of your API Gateway, "
            f"3) Enable encryption at rest and in transit, "
            f"4) Use secrets management (Vault/AWS Secrets Manager), "
            f"5) Implement audit logging for compliance."
        )

    return (
        f"Great question about \"{title}\"! "
        f"Based on your {domain or 'architecture'}, this is a common consideration. "
        f"I'd suggest reviewing the component interactions in your diagram and "
        f"considering how this change impacts your scalability and security posture. "
        f"Would you like me to suggest specific architectural modifications?"
    )


def generate_component_paragraphs(
    project_id: str,
    idea: str,
    components: list[dict],
) -> dict:
    """
    Generate short component walkthrough paragraphs via Ollama.
    Returns a mapping: { component_id: paragraph }.
    """
    ctx = get_context(project_id) or {}
    cached = ctx.get("component_paragraphs", {})
    missing = [c for c in components if c.get("id") and c.get("id") not in cached]
    if not missing and cached:
        return cached

    component_payload = []
    for comp in missing:
        relation_summary = _build_relation_summary(comp.get("connections", []))
        component_payload.append(
            {
                "id": comp.get("id", ""),
                "name": comp.get("name", comp.get("label", "")),
                "layer": comp.get("layer", "service"),
                "tech": comp.get("tech", ""),
                "description": comp.get("description", ""),
                "connections": comp.get("connections", []),
                "relation_summary": relation_summary,
            }
        )

    prompt = (
        "You are writing concise architecture walkthrough notes.\n"
        "For each component produce exactly one short paragraph (4-6 lines, plain text, non-bulleted).\n"
        "Explain role, why placed in this layer, key interaction, and one practical engineering note.\n"
        "IMPORTANT: If relations exist, add a dedicated line that starts with 'Relations:' and summarize component relationships.\n"
        "Return ONLY JSON: {\"paragraphs\": [{\"id\": \"...\", \"text\": \"...\"}]}\n"
        f"User idea: {idea}\n"
        f"Components: {json.dumps(component_payload)}"
    )

    paragraphs: dict[str, str] = {}
    text = _call_llm([{"role": "user", "content": prompt}], temperature=0.3)
    parsed = _parse_json_response(text or "")
    if parsed and isinstance(parsed.get("paragraphs"), list):
        for item in parsed["paragraphs"]:
            cid = item.get("id")
            para = item.get("text")
            if isinstance(cid, str) and isinstance(para, str) and cid:
                paragraphs[cid] = para.strip()

    # Deterministic fallback for any missing entries.
    for comp in missing:
        cid = comp.get("id", "")
        if not cid or cid in paragraphs:
            continue
        name = comp.get("name", comp.get("label", "Component"))
        layer = comp.get("layer", "service")
        tech = comp.get("tech", "its selected stack")
        relation_summary = _build_relation_summary(comp.get("connections", []))
        paragraphs[cid] = (
            f"{name} is a core part of the {layer} layer and supports the primary system flow. "
            f"It uses {tech} to balance delivery speed and operational reliability. "
            f"This component coordinates with adjacent services through defined relationships in the diagram. "
            f"Keep interfaces stable here, since changes in this node can cascade into downstream components.\n"
            f"Relations: {relation_summary}"
        )

    merged = {**cached, **paragraphs}
    update_context(project_id, component_paragraphs=merged)
    return merged


def _build_relation_summary(connections: list) -> str:
    if not isinstance(connections, list) or not connections:
        return "No explicit component-level relation is defined."
    parts = []
    for conn in connections[:5]:
        if isinstance(conn, dict):
            target = conn.get("component", "another component")
            relation = conn.get("relation", "interacts with")
            direction = conn.get("direction", "")
            dir_prefix = f"{direction} " if direction else ""
            parts.append(f"{dir_prefix}{relation} {target}")
        elif isinstance(conn, str):
            parts.append(f"interacts with {conn}")
    if not parts:
        return "No explicit component-level relation is defined."
    return "; ".join(parts)

