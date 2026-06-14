from fastapi import APIRouter, HTTPException, Depends, Header, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from bson import ObjectId
from db import get_database
from utils.auth_helper import decode_token

router = APIRouter(prefix="/projects", tags=["projects"])

# Authentication dependency (copied from auth-service)
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization credentials invalid or missing"
        )
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signature expired or malformed"
        )
    # Use the shared MongoDB instance
    db = get_database()
    if db is None:
        # Fallback for offline testing
        return {"username": payload.get("sub"), "email": "fallback@archgen.ai"}
    user = await db["users"].find_one({"username": payload.get("sub")})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorized identity not found in database"
        )
    return {"id": str(user["_id"]), "username": user["username"], "email": user["email"]}

class ProjectSaveInput(BaseModel):
    id: Optional[str] = None
    name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    services: List[Dict[str, Any]]
    cloud_provider: str
    cost_estimate: float

@router.post("/")
async def save_project(input_data: ProjectSaveInput, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"status": "success", "message": "Mock save successful."}
    project_doc = {
        "username": current_user["username"],
        "name": input_data.name,
        "nodes": input_data.nodes,
        "edges": input_data.edges,
        "services": input_data.services,
        "cloud_provider": input_data.cloud_provider,
        "cost_estimate": input_data.cost_estimate
    }
    if input_data.id:
        try:
            object_id = ObjectId(input_data.id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid project identifier formatting.")
        result = await db["projects"].update_one(
            {"_id": object_id, "username": current_user["username"]},
            {"$set": project_doc}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Project not found or unauthorized.")
        return {"status": "success", "id": input_data.id, "message": "Project updated successfully."}
    else:
        result = await db["projects"].insert_one(project_doc)
        return {"status": "success", "id": str(result.inserted_id), "message": "Project saved successfully."}

@router.get("/")
async def list_projects(current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return []
    cursor = db["projects"].find({"username": current_user["username"]})
    projects = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        projects.append(doc)
    return projects

@router.get("/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=404, detail="Mock database active. Project not found.")
    try:
        project = await db["projects"].find_one({"_id": ObjectId(project_id), "username": current_user["username"]})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")
        project["id"] = str(project["_id"])
        del project["_id"]
        return project
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed project identifier.")

@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if db is None:
        return {"status": "success", "message": "Mock delete successful."}
    try:
        result = await db["projects"].delete_one({"_id": ObjectId(project_id), "username": current_user["username"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Project not found or unauthorized.")
        return {"status": "success", "message": "Project deleted successfully."}
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed project identifier.")
