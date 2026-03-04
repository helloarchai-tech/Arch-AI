"""
Arch.AI Backend — FastAPI Application Entry Point
Supports Ollama Cloud (gpt-oss:120b-cloud) and OpenAI-compatible APIs.
"""

import logging
import os
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.architecture import router as architecture_router
from routes.projects import router as projects_router

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

app = FastAPI(
    title="Arch.AI API",
    description="AI-powered software architecture designer backend",
    version="1.0.0",
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://arch-ai-chi-lac.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Key Dependency (applied per-router, not globally) ────────────────
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "my-super-secret-key")

def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != BACKEND_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

# Register routes — API key required only for /api/* routes
app.include_router(architecture_router, dependencies=[Depends(verify_api_key)])
app.include_router(projects_router, dependencies=[Depends(verify_api_key)])


import json
import urllib.request
from urllib.error import URLError

@app.on_event("startup")
async def check_ollama():
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    ollama_model = os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")
    
    # Clean /v1 to access raw Ollama API
    base_url = ollama_url.split("/v1")[0]
    if not base_url:
        base_url = "http://localhost:11434"
        
    print("\n" + "=" * 65)
    print("🤖 SYSTEM DIAGNOSTICS: OLLAMA AI ENGINE")
    print("=" * 65)
    
    try:
        print(f"📡 Pinging Ollama at {base_url}...")
        req = urllib.request.Request(f"{base_url}/api/tags")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                print("✅ CONNECTION: SUCCESS (Ollama is running)")
                data = json.loads(response.read().decode())
                models = [m["name"] for m in data.get("models", [])]
                
                print(f"🔍 Pinging model '{ollama_model}'...")
                if ollama_model in models or f"{ollama_model}:latest" in models:
                    print("✅ MODEL: READY AND LOADED")
                else:
                    print(f"❌ MODEL MISSING: '{ollama_model}' is not installed.")
                    print(f"   Available models: {', '.join(models)}")
                    print(f"   Action: Please run 'ollama pull {ollama_model}'")
            else:
                print(f"❌ CONNECTION: Ollama returned HTTP {response.status}")
    except URLError as e:
        print(f"❌ CONNECTION FAILED: Cannot reach Ollama at {base_url}")
        print(f"   Reason: {e.reason}")
        print("   Action: Ensure the Ollama application is running locally.")
    except Exception as e:
        print(f"❌ DIAGNOSTIC ERROR: {e}")
    
    print("=" * 65 + "\n")



@app.get("/")
async def root():
    return {
        "name": "Arch.AI API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}

