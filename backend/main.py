import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environmental variables from .env if present
load_dotenv()

from backend.routes import documents, query, research, evaluation, study, studio
from fastapi.staticfiles import StaticFiles
from backend.config import settings
from rag.vectorstore import VectorStore

app = FastAPI(
    title="ResearchGPT API",
    description="A Google-level Research Intelligence Platform API",
    version="1.0.0"
)

# CORS middleware to allow the Streamlit frontend to interact with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory for reports (literature reviews, podcasts)
app.mount("/static", StaticFiles(directory=settings.REPORTS_DIR), name="static")

# Include routers
app.include_router(documents.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(research.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")
app.include_router(study.router, prefix="/api")
app.include_router(studio.router, prefix="/api")



@app.get("/")
def home():
    # Health check and basic stats
    db = VectorStore()
    docs = db.list_documents()
    api_key_set = bool(os.getenv("OPENROUTER_API_KEY"))
    return {
        "status": "healthy",
        "openrouter_api_configured": api_key_set,
        "indexed_documents_count": len(docs),
        "documents": docs
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
