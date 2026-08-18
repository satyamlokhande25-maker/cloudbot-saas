from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import router as auth_router
from app.api.train import router as train_router
from app.api.chat import router as chat_router
from app.api.bots import router as bots_router
from app.api.integrations import router as integrations_router

from app.db.database import engine, Base
from app.db import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CloudBot Backend API",
    description="SaaS Backend with Multi-Bot, JWT Auth, RAG & Vector Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(bots_router)
app.include_router(train_router)
app.include_router(chat_router)
app.include_router(integrations_router)

@app.get("/")
def root():
    return {"message": "CloudBot API is Live and Healthy"}

@app.get("/health", tags=["default"])
def health_check():
    return {"status": "healthy", "service": "CloudBot Backend"}