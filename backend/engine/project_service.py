"""
Arch.AI — Project Service
Handles saving/loading projects to Supabase and extracting keywords from architectures.
"""

import os
import re
import logging
import httpx
from typing import Optional

logger = logging.getLogger("Arch.AI.project_service")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # service role key for backend writes


def _supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def extract_keywords(idea: str, architecture: dict) -> list[str]:
    """
    Extract top keywords/phases from node labels + idea.
    No LLM needed — parses component names directly.
    Returns up to 12 unique keywords.
    """
    keywords = set()

    # Pull component names from nodes
    nodes = architecture.get("nodes", [])
    for node in nodes:
        label = node.get("data", {}).get("label", "")
        if label:
            keywords.add(label.strip())

    # Also extract meaningful nouns from the idea (split on spaces, filter short words)
    stop_words = {"the", "a", "an", "and", "or", "for", "with", "is", "are", "to", "of",
                  "in", "on", "at", "by", "that", "this", "which", "will", "be", "has",
                  "have", "using", "use", "based", "system", "platform", "application",
                  "project", "app", "focuses", "developing", "integrated", "enable"}
    words = re.findall(r"[A-Za-z]{4,}", idea)
    for w in words:
        if w.lower() not in stop_words:
            keywords.add(w.strip())

    return list(keywords)[:12]


def auto_name_project(idea: str, architecture: dict) -> str:
    """
    Auto-generate a short project name.
    Priority: use the system_name from arch title, otherwise derive from idea.
    """
    # Try architecture title first
    title = architecture.get("title", "")
    if title and len(title) > 3:
        # Trim to max 60 chars
        return title[:60]

    # Fallback: take first 6–10 words of the idea
    words = idea.strip().split()
    name_words = []
    for w in words[:10]:
        if len(w) > 2:
            name_words.append(w)
        if len(name_words) >= 6:
            break
    return " ".join(name_words)[:60] or "Untitled Architecture"


def save_project(
    user_id: str,
    project_id: str,
    name: str,
    keywords: list[str],
    architecture: dict,
    idea: str,
) -> dict:
    """
    Upsert project row in Supabase projects table.
    Uses service role key so it always has write access.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.warning("Supabase not configured — project not saved to DB")
        return {"project_id": project_id, "saved": False}

    payload = {
        "user_id": user_id,
        "project_id": project_id,
        "name": name,
        "keywords": keywords,
        "architecture": architecture,
        "idea": idea,
    }

    try:
        url = f"{SUPABASE_URL}/rest/v1/projects"
        headers = {**_supabase_headers(), "Prefer": "resolution=merge-duplicates,return=representation"}
        with httpx.Client(timeout=10) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            logger.info(f"Project {project_id} saved to Supabase for user {user_id}")
            rows = resp.json()
            return rows[0] if rows else payload
    except Exception as e:
        logger.error(f"Failed to save project to Supabase: {e}")
        return {"project_id": project_id, "saved": False, "error": str(e)}


def get_user_projects(user_id: str) -> list[dict]:
    """Fetch all projects for a user (server-side fallback — frontend does this directly via supabase-js)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return []
    try:
        url = f"{SUPABASE_URL}/rest/v1/projects?user_id=eq.{user_id}&order=created_at.desc"
        with httpx.Client(timeout=10) as client:
            resp = client.get(url, headers=_supabase_headers())
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.error(f"Failed to fetch projects: {e}")
        return []


def build_chat_with_context_prompt(phases: list[str], system_name: str, user_query: str) -> str:
    """
    Build the Ollama prompt for project-specific chat.
    Uses project phases/keywords from Supabase as context.
    """
    phases_text = "\n".join(f"- {p}" for p in phases) if phases else "No phases available."
    return (
        f"You are a senior software architect assistant for the project: '{system_name}'.\n\n"
        f"This project includes the following components and technologies:\n{phases_text}\n\n"
        f"RULES:\n"
        f"1. ONLY answer questions related to THIS project's architecture, components, or design.\n"
        f"2. If the question is not related to this project, politely decline and redirect to the architecture.\n"
        f"3. Be concise, helpful, and specific to these components.\n"
        f"4. Suggest improvements or explain trade-offs based on the listed components.\n\n"
        f"User question: {user_query}\n\n"
        f"Answer:"
    )
