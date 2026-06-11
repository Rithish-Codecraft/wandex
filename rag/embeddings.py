from chromadb import EmbeddingFunction, Documents, Embeddings
from llm.gemini import get_embeddings

class OpenRouterEmbeddingFunction(EmbeddingFunction):
    """ChromaDB-compatible embedding function backed by OpenRouter."""

    def __call__(self, input: Documents) -> Embeddings:
        return get_embeddings(input)

    def name(self) -> str:
        return "openrouter-text-embedding-3-small"
