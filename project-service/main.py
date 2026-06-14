from fastapi import FastAPI
from routes.projects import router as projects_router

app = FastAPI(title="Project Service", version="1.0.0")

# Include project router
app.include_router(projects_router)

# Startup and shutdown events to manage DB connection
from db import db_manager

@app.on_event("startup")
async def startup_event():
    await db_manager.connect_to_database()

@app.on_event("shutdown")
async def shutdown_event():
    await db_manager.close_database_connection()
