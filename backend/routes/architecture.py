"""
Arch.AI Backend — Architecture Routes (Agentic Pipeline)
All blocking LLM calls use asyncio background tasks so the HTTP connection
never has to wait for the LLM to finish — prevents tunnel timeouts.
"""

import asyncio
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
)
from engine.context_manager import get_context, get_architecture_context, update_context

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
        # Mark as complete in context
        update_context(project_id, gen_status="ready", gen_result=result)
        logger.info(f"[bg] Generation complete for {project_id} — {len(result.get('nodes', []))} nodes")
    except Exception as e:
        logger.error(f"[bg] Generation failed for {project_id}: {e}")
        update_context(project_id, gen_status="error", gen_error=str(e))


# ── Agentic Pipeline Endpoints ───────────────────────────────────────────

@router.post("/classify")
async def classify(req: ClassifyRequest):
    """Step 1: Classify user idea into a domain category."""
    try:
        result = await asyncio.to_thread(classify_idea, req.idea)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@router.get("/interview/{project_id}")
async def get_interview(project_id: str):
    """Step 2: Get clarification questions for the project domain."""
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
    """Step 2b: Submit clarification answers."""
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
    """Step 3: Start architecture generation in the background.
    Returns immediately with project_id + status='generating'.
    Frontend should poll /api/project/{id}/status until status='ready'.
    """
    import uuid
    project_id = req.project_id or f"proj_{uuid.uuid4().hex[:12]}"

    # Classify immediately (fast, no LLM)
    try:
        update_context(project_id, idea=req.idea, gen_status="generating", gen_result=None, gen_error=None)
    except Exception:
        pass

    # Fire-and-forget — LLM runs in background, HTTP returns immediately
    asyncio.create_task(_run_generate(
        idea=req.idea,
        project_id=project_id,
        target_users=req.target_users or 10000,
        constraints=req.constraints or "",
    ))

    return {"project_id": project_id, "status": "generating"}


@router.get("/project/{project_id}/status")
async def generation_status(project_id: str):
    """Poll this endpoint to check if generation is complete.
    Returns status: 'generating' | 'ready' | 'error'
    When ready, also returns the full architecture in 'result'.
    """
    ctx = get_context(project_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Project not found")

    status = ctx.get("gen_status", "generating")
    if status == "ready":
        result = ctx.get("gen_result") or ctx.get("architecture")
        return {"status": "ready", "result": result}
    elif status == "error":
        return {"status": "error", "error": ctx.get("gen_error", "Unknown error")}
    else:
        return {"status": "generating"}


@router.post("/chat")
async def chat(req: ChatRequest):
    """Context-aware chat about the architecture."""
    try:
        result = await asyncio.to_thread(
            chat_response, req.message, req.project_id, req.context,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.post("/scale")
async def scale(req: ScaleRequest):
    """Re-evaluate architecture for different user scale."""
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
    """Get full project context (domain, interview, architecture, chat)."""
    ctx = get_context(project_id)
    if not ctx:
        raise HTTPException(status_code=404, detail="Project not found")
    return get_architecture_context(project_id)


@router.get("/domains")
async def list_domains():
    """List all available domain categories."""
    from engine.intent_classifier import get_all_domains
    return {"domains": get_all_domains()}


@router.post("/component-paragraphs")
async def component_paragraphs(req: ComponentParagraphRequest):
    """Generate short walkthrough paragraphs for each component via Ollama."""
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
