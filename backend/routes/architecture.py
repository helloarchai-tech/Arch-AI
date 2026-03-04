"""
Arch.AI Backend — Architecture Routes (Agentic Pipeline)
"""

from fastapi import APIRouter, HTTPException
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
from engine.context_manager import get_context, get_architecture_context

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


# ── Agentic Pipeline Endpoints ───────────────────────────────────────────

@router.post("/classify")
async def classify(req: ClassifyRequest):
    """Step 1: Classify user idea into a domain category."""
    try:
        result = classify_idea(req.idea)
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
        result = submit_answers(req.project_id, req.answers)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answer submission failed: {str(e)}")


@router.post("/generate")
async def generate(req: GenerateRequest):
    """Step 3: Generate domain-specific architecture."""
    try:
        result = generate_architecture(
            idea=req.idea,
            target_users=req.target_users or 10000,
            constraints=req.constraints or "",
            project_id=req.project_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Architecture generation failed: {str(e)}")


@router.post("/chat")
async def chat(req: ChatRequest):
    """Context-aware chat about the architecture."""
    try:
        result = chat_response(
            message=req.message,
            project_id=req.project_id,
            context=req.context,
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
        result = scale_architecture(
            project_id=req.project_id,
            target_users=req.target_users,
            current_title=title,
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
        result = generate_component_paragraphs(
            project_id=req.project_id,
            idea=req.idea,
            components=[c.model_dump() for c in req.components],
        )
        return {"paragraphs": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Component paragraph generation failed: {str(e)}")

