"""
Arch.AI — Context Manager
In-memory session context for agentic behavior.
Stores user idea, domain, interview answers, architecture versions, and chat history.
"""

import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger("Arch.AI.context")

# ── In-memory context store (per project) ─────────────────────────────────
_contexts: dict[str, dict] = {}



def create_context(project_id: str, idea: str) -> dict:
    """Create a new project context."""
    ctx = {
        "project_id": project_id,
        "idea": idea,
        "created_at": datetime.utcnow().isoformat(),
        "state": "created",  # created → classified → interviewed → generated → ready
        "domain": None,
        "domain_label": None,
        "confidence": 0.0,
        "sub_features": [],
        "external_systems": [],
        "interview_answers": {},
        "constraints": {},
        "architecture": None,
        "architecture_versions": [],
        "chat_history": [],
    }
    _contexts[project_id] = ctx
    logger.info(f"Created context for project {project_id}")
    return ctx


def get_context(project_id: str) -> Optional[dict]:
    """Get project context."""
    return _contexts.get(project_id)


def update_context(project_id: str, **kwargs) -> dict:
    """Update fields in a project context."""
    ctx = _contexts.get(project_id)
    if not ctx:
        ctx = create_context(project_id, kwargs.get("idea", ""))
    ctx.update(kwargs)
    _contexts[project_id] = ctx
    return ctx


def set_classification(project_id: str, classification: dict) -> dict:
    """Store domain classification in context."""
    return update_context(
        project_id,
        state="classified",
        domain=classification["domain"],
        domain_label=classification["domain_label"],
        confidence=classification["confidence"],
        sub_features=classification.get("sub_features", []),
        external_systems=classification.get("external_systems", []),
    )


def set_interview_answers(project_id: str, answers: dict) -> dict:
    """Store interview answers in context."""
    ctx = get_context(project_id)
    if ctx:
        existing = ctx.get("interview_answers", {})
        existing.update(answers)
        return update_context(project_id, state="interviewed", interview_answers=existing)
    return update_context(project_id, state="interviewed", interview_answers=answers)


def set_architecture(project_id: str, architecture: dict) -> dict:
    """Store generated architecture and keep version history."""
    ctx = get_context(project_id)
    versions = []
    if ctx:
        versions = ctx.get("architecture_versions", [])
        if ctx.get("architecture"):
            versions.append({
                "version": len(versions) + 1,
                "timestamp": datetime.utcnow().isoformat(),
                "architecture": ctx["architecture"],
            })
    return update_context(
        project_id,
        state="ready",
        architecture=architecture,
        architecture_versions=versions,
    )


def add_chat_message(project_id: str, role: str, content: str) -> None:
    """Add a chat message to the project history."""
    ctx = get_context(project_id)
    if ctx:
        history = ctx.get("chat_history", [])
        history.append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
        })
        update_context(project_id, chat_history=history)


def get_chat_summary(project_id: str, max_messages: int = 10) -> str:
    """Get a summary of recent chat for LLM context."""
    ctx = get_context(project_id)
    if not ctx:
        return ""
    history = ctx.get("chat_history", [])[-max_messages:]
    lines = []
    for msg in history:
        role = "User" if msg["role"] == "user" else "Arch.AI"
        lines.append(f"{role}: {msg['content'][:200]}")
    return "\n".join(lines)


def get_architecture_context(project_id: str) -> dict:
    """Get full context for architecture refinement."""
    ctx = get_context(project_id) or {}
    return {
        "idea": ctx.get("idea", ""),
        "domain": ctx.get("domain", ""),
        "domain_label": ctx.get("domain_label", ""),
        "interview_answers": ctx.get("interview_answers", {}),
        "constraints": ctx.get("constraints", {}),
        "current_architecture": ctx.get("architecture"),
        "version_count": len(ctx.get("architecture_versions", [])),
        "chat_summary": get_chat_summary(project_id),
    }


def list_projects() -> list[dict]:
    """List all projects with basic info."""
    return [
        {
            "project_id": pid,
            "idea": ctx.get("idea", ""),
            "domain": ctx.get("domain", ""),
            "state": ctx.get("state", ""),
            "created_at": ctx.get("created_at", ""),
        }
        for pid, ctx in _contexts.items()
    ]

