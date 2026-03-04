"""
Arch.AI Backend — Project Management Routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

router = APIRouter(prefix="/api", tags=["projects"])

# In-memory store (replace with PostgreSQL in production)
_projects_db: dict[str, dict] = {}


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    architecture_data: Optional[dict] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    architecture_data: Optional[dict] = None


@router.get("/projects")
async def list_projects():
    """List all saved projects."""
    projects = list(_projects_db.values())
    projects.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return {"projects": projects}


@router.post("/projects")
async def create_project(req: ProjectCreate):
    """Save a new project."""
    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow().isoformat()
    project = {
        "id": project_id,
        "name": req.name,
        "description": req.description or "",
        "architecture_data": req.architecture_data,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    _projects_db[project_id] = project
    return project


@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get a specific project."""
    project = _projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/projects/{project_id}")
async def update_project(project_id: str, req: ProjectUpdate):
    """Update a project."""
    project = _projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if req.name is not None:
        project["name"] = req.name
    if req.description is not None:
        project["description"] = req.description
    if req.architecture_data is not None:
        project["architecture_data"] = req.architecture_data
    project["updated_at"] = datetime.utcnow().isoformat()

    return project


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    if project_id not in _projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    del _projects_db[project_id]
    return {"message": "Project deleted"}

