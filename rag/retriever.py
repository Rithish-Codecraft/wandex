from typing import List, Dict, Any
from rag.vectorstore import VectorStore

class Retriever:
    def __init__(self, vector_store: VectorStore = None):
        self.vector_store = vector_store or VectorStore()

    def get_context_for_query(self, query: str, top_k: int = 5, filters: Dict[str, Any] = None) -> tuple[str, List[Dict[str, Any]]]:
        """
        Retrieves relevant document chunks and formats them as a context block,
        returning both the formatted string and the raw search results for reference.
        """
        results = self.vector_store.search(query, top_k=top_k, filters=filters)
        
        context_parts = []
        citations = []
        
        for idx, result in enumerate(results, 1):
            meta = result["metadata"]
            source = meta.get("source", "Unknown Source")
            page = meta.get("page", "?")
            text = result["text"]
            
            context_parts.append(
                f"--- DOCUMENT SOURCE: {source}, PAGE: {page} ---\n{text}\n"
            )
            
            citations.append({
                "source": source,
                "page": page,
                "text": text[:200] + "..." if len(text) > 200 else text
            })
            
        context = "\n".join(context_parts)
        return context, citations
