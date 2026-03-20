"""
Arch.AI Backend — Architecture Routes (Agentic Pipeline)
All blocking LLM calls use asyncio background tasks so the HTTP connection
never has to wait for the LLM to finish — prevents tunnel timeouts.
"""

import asyncio
import uuid as _uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Any
from engine.ai_engine import (
    classify_idea,
    get_questions,
    submit_answers,
    generate_architecture,
    chat_response,
    scale_architecture,
    generate_component_paragraphs,
    _call_llm,
)
from engine.context_manager import get_context, get_architecture_context, update_context
from engine.project_service import (
    extract_keywords,
    auto_name_project,
    save_project,
    build_chat_with_context_prompt,
    get_project_by_project_id,
)

import logging
logger = logging.getLogger("Arch.AI.routes")

router = APIRouter(prefix="/api", tags=["architecture"])


# ── Request Models ────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    idea: str

class InterviewAnswerRequest(BaseModel):
    project_id: str
    answers: dict

class GenerateRequest(BaseModel):
    idea: str
    target_users: Optional[int] = 10000
    project_id: Optional[str] = None
    constraints: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    project_id: str
    context: Optional[dict] = None

class ChatWithContextRequest(BaseModel):
    """Project-specific chat. DB context is fetched server-side by project_id."""
    message: str
    project_id: str
    system_name: Optional[str] = ""

class SaveProjectRequest(BaseModel):
    user_id: str
    project_id: str
    idea: str
    architecture: dict         # full architecture JSON

class ScaleRequest(BaseModel):
    project_id: str
    target_users: int

class ComponentInfo(BaseModel):
    id: str
    name: Optional[str] = ""
    label: Optional[str] = ""
    layer: Optional[str] = "service"
    tech: Optional[str] = ""
    description: Optional[str] = ""
    connections: Optional[list[Any]] = []

class ComponentParagraphRequest(BaseModel):
    project_id: str
    idea: str
    components: list[ComponentInfo]


# ── Background worker ─────────────────────────────────────────────────────

async def _run_generate(idea: str, project_id: str, target_users: int, constraints: str):
    """Run generation in background thread. Stores result in context_manager."""
    try:
        logger.info(f"[bg] Starting architecture generation for {project_id}")
        result = await asyncio.to_thread(
            generate_architecture, idea, target_users, constraints, project_id
        )
        update_context(project_id, gen_status="ready", gen_result=result)
        logger.info(f"[bg] Generation complete for {project_id} — {len(result.get('nodes', []))} nodes")
    except Exception as e:
        logger.error(f"[bg] Generation failed for {project_id}: {e}")
        update_context(project_id, gen_status="error", gen_error=str(e))


# ── Agentic Pipeline Endpoints ───────────────────────────────────────────

@router.post("/classify")
async def classify(req: ClassifyRequest):
    try:
        result = await asyncio.to_thread(classify_idea, req.idea)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@router.get("/interview/{project_id}")
async def get_interview(project_id: str):
    try:
        result = get_questions(project_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview fetch failed: {str(e)}")


@router.post("/interview/submit")
async def submit_interview(req: InterviewAnswerRequest):
    try:
        result = await asyncio.to_thread(submit_answers, req.project_id, req.answers)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answer submission failed: {str(e)}")


@router.post("/generate")
async def generate(req: GenerateRequest):
    """Start architecture generation in background. Returns instantly.
    Frontend polls /api/project/{id}/status until status='ready'.
    """
    project_id = req.project_id or f"proj_{_uuid.uuid4().hex[:12]}"
    try:
        update_context(project_id, idea=req.idea, gen_status="generating", gen_result=None, gen_error=None)
    except Exception:
        pass

    asyncio.create_task(_run_generate(
        idea=req.idea,
        project_id=project_id,
        target_users=req.target_users or 10000,
        constraints=req.constraints or "",
    ))

    return {"project_id": project_id, "status": "generating"}


@router.get("/project/{project_id}/status")
async def generation_status(project_id: str):
    """Poll this to check generation progress. Returns status + result when done."""
    ctx = get_context(project_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Project not found")

    status = ctx.get("gen_status", "generating")
    if status == "ready":
        result = ctx.get("gen_result") or ctx.get("architecture")
        return {"status": "ready", "result": result}
    elif status == "error":
        return {"status": "error", "error": ctx.get("gen_error", "Unknown error")}
    return {"status": "generating"}


@router.post("/project/save")
async def save_project_endpoint(req: SaveProjectRequest):
    """Save generated architecture to Supabase projects table.
    Called by frontend after generation completes.
    Extracts keywords and auto-names the project from the architecture.
    """
    try:
        keywords = await asyncio.to_thread(extract_keywords, req.idea, req.architecture)
        name = auto_name_project(req.idea, req.architecture)
        result = await asyncio.to_thread(
            save_project,
            req.user_id, req.project_id, name, keywords, req.architecture, req.idea
        )
        return {"saved": True, "name": name, "keywords": keywords, "result": result}
    except Exception as e:
        logger.error(f"Save project failed: {e}")
        return JSONResponse(status_code=500, content={"saved": False, "error": str(e)})


@router.post("/chat")
async def chat(req: ChatRequest):
    """Legacy context-aware chat (uses server-side context memory)."""
    try:
        result = await asyncio.to_thread(
            chat_response, req.message, req.project_id, req.context,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.post("/chat-with-context")
async def chat_with_context(req: ChatWithContextRequest):
    """Project-specific chat.
    prompt_1 = user's chat message
    prompt_2 = keywords + idea fetched from DB using project_id
    """
    try:
        project_raw = await asyncio.to_thread(get_project_by_project_id, req.project_id)
        project = project_raw if isinstance(project_raw, dict) else {}
        db_keywords = project.get("keywords", [])
        db_idea = project.get("idea", "")
        db_name = project.get("name", "")
        project_arch = project.get("architecture", {})

        if not isinstance(db_keywords, list):
            db_keywords = []

        enriched_keywords: list[str] = [str(k).strip() for k in db_keywords if str(k).strip()]

        # Pull component labels + tech from saved architecture for stronger component grounding.
        if isinstance(project_arch, dict):
            for node in project_arch.get("nodes", []) or []:
                data = node.get("data", {}) if isinstance(node, dict) else {}
                label = str(data.get("label", "")).strip()
                tech = str(data.get("tech", "")).strip()
                if label:
                    enriched_keywords.append(label)
                if tech:
                    enriched_keywords.append(tech)

        # Fallback to in-memory architecture context when DB row is missing/incomplete.
        if not enriched_keywords:
            ctx_arch_raw = get_architecture_context(req.project_id)
            ctx_arch = ctx_arch_raw if isinstance(ctx_arch_raw, dict) else {}
            current_arch = ctx_arch.get("current_architecture", {})
            for node in current_arch.get("nodes", []) or []:
                data = node.get("data", {}) if isinstance(node, dict) else {}
                label = str(data.get("label", "")).strip()
                tech = str(data.get("tech", "")).strip()
                if label:
                    enriched_keywords.append(label)
                if tech:
                    enriched_keywords.append(tech)
            if not db_idea:
                db_idea = str(ctx_arch.get("idea", "")).strip()

        # Deduplicate while preserving order.
        seen = set()
        safe_keywords = []
        for kw in enriched_keywords:
            key = kw.lower()
            if not kw or key in seen:
                continue
            seen.add(key)
            safe_keywords.append(kw)

        system_name = (req.system_name or db_name or req.project_id).strip()

        prompt = build_chat_with_context_prompt(
            phases=safe_keywords,
            system_name=system_name,
            user_query=req.message,
            project_idea=db_idea,
        )
        messages = [
            {"role": "system", "content": "You are a software architecture expert. Be concise and specific."},
            {"role": "user", "content": prompt},
        ]
        response_text = await asyncio.to_thread(_call_llm, messages, 0.5)
        if not response_text:
            return {"response": "I'm unable to reach the AI right now. Please try again shortly."}
        return {"response": response_text.strip()}
    except Exception as e:
        logger.error(f"chat-with-context failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@router.post("/scale")
async def scale(req: ScaleRequest):
    try:
        ctx = get_context(req.project_id)
        title = ctx.get("idea", "Architecture") if ctx else "Architecture"
        result = await asyncio.to_thread(
            scale_architecture, req.project_id, req.target_users, title,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scale evaluation failed: {str(e)}")


@router.get("/project/{project_id}/context")
async def project_context(project_id: str):
    ctx = get_context(project_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Project not found")
    return get_architecture_context(project_id)


@router.get("/domains")
async def list_domains():
    from engine.intent_classifier import get_all_domains
    return {"domains": get_all_domains()}


@router.post("/component-paragraphs")
async def component_paragraphs(req: ComponentParagraphRequest):
    try:
        result = await asyncio.to_thread(
            generate_component_paragraphs,
            req.project_id,
            req.idea,
            [c.model_dump() for c in req.components],
        )
        return {"paragraphs": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Component paragraph generation failed: {str(e)}")

