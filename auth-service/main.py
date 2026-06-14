from fastapi import FastAPI
from .routes.auth import router as auth_router

app = FastAPI(title="Auth Service", version="1.0.0")

# Include auth router
app.include_router(auth_router)

# Startup and shutdown events to manage DB connection
from .db import db_manager

@app.on_event("startup")
async def startup_event():
    await db_manager.connect_to_database()

@app.on_event("shutdown")
async def shutdown_event():
    await db_manager.close_database_connection()
