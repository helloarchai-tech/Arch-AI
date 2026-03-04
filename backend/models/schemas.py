from pydantic import BaseModel
from typing import Optional


class ArchitectureRequest(BaseModel):
    idea: str
    target_users: Optional[int] = 10000
    budget: Optional[str] = None
    constraints: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    project_id: str
    context: Optional[dict] = None


class ScaleRequest(BaseModel):
    project_id: str
    target_users: int


class DiagramNode(BaseModel):
    id: str
    type: str = "component"
    position: dict  # {x, y}
    data: dict  # {label, category, tech, icon}


class DiagramEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: Optional[bool] = False


class TechStackItem(BaseModel):
    category: str
    technology: str
    reason: str


class CostBreakdownItem(BaseModel):
    service: str
    cost: str


class CostEstimate(BaseModel):
    monthly: str
    yearly: str
    breakdown: list[CostBreakdownItem]


class HealthScores(BaseModel):
    scalability: int
    costEfficiency: int
    security: int
    maintainability: int


class ArchitectureResponse(BaseModel):
    project_id: str
    title: str
    summary: str
    nodes: list[DiagramNode]
    edges: list[DiagramEdge]
    techStack: list[TechStackItem]
    costEstimate: CostEstimate
    healthScores: HealthScores
    risks: list[str]
    securitySuggestions: list[str]


class ChatResponse(BaseModel):
    response: str
    updated_architecture: Optional[dict] = None
