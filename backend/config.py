import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
REPORTS_DIR = BASE_DIR / "reports"
DB_DIR = BASE_DIR / "database" / "chromadb"

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
DB_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    CHROMA_DB_DIR: str = str(DB_DIR)
    UPLOAD_DIR: str = str(UPLOAD_DIR)
    REPORTS_DIR: str = str(REPORTS_DIR)
    # Free models available on OpenRouter - no payment required
    # Primary: google/gemma-4-31b-it:free (confirmed working)
    # Fallback chain: nvidia/nemotron-3-super-120b-a12b:free -> meta-llama/llama-3.2-3b-instruct:free
    EMBEDDING_MODEL: str = "openai/text-embedding-3-small"
    LLM_MODEL: str = "google/gemma-4-31b-it:free"
    COMPARE_LLM_MODEL: str = "google/gemma-4-31b-it:free"
    # Comma-separated ordered fallback models if primary is rate-limited
    LLM_FALLBACK_MODELS: str = "nvidia/nemotron-3-super-120b-a12b:free,meta-llama/llama-3.2-3b-instruct:free"

    # Neo4j Settings (optional)
    NEO4J_URI: str = os.getenv("NEO4J_URI", "")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
