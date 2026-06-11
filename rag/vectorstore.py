import chromadb
from typing import List, Dict, Any
from backend.config import settings
from rag.embeddings import OpenRouterEmbeddingFunction

class VectorStore:
    def __init__(self):
        # Initialize persistent client
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DB_DIR)
        self.embedding_fn = OpenRouterEmbeddingFunction()
        # Get or create the collection using OpenRouter text-embedding-3-small (1536-dim)
        self.collection = self.client.get_or_create_collection(
            name="research_papers_or",
            embedding_function=self.embedding_fn
        )

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        """
        Adds a list of document chunks to the vector database.
        Each chunk is a dictionary containing: text, page, source, title, author, chunk_id.
        """
        if not chunks:
            return
            
        ids = [chunk["chunk_id"] for chunk in chunks]
        documents = [chunk["text"] for chunk in chunks]
        metadatas = [{
            "page": chunk["page"],
            "source": chunk["source"],
            "title": chunk["title"],
            "author": chunk["author"]
        } for chunk in chunks]

        # Batch adding to avoid any size limitations (e.g., maximum batch sizes in Chroma)
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            self.collection.add(
                ids=ids[i:i+batch_size],
                documents=documents[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size]
            )

    def search(self, query: str, top_k: int = 5, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Queries the vector database for the top K matching documents.
        Optional filters can filter by metadata (e.g. {'source': 'file.pdf'}).
        """
        if self.collection.count() == 0:
            return []

        where = None
        if filters:
            # Format filters for Chroma (if multiple, we might need a $and structure,
            # but simple direct key-value works for single match)
            where = filters

        results = self.collection.query(
            query_texts=[query],
            n_results=min(top_k, self.collection.count()),
            where=where
        )

        formatted_results = []
        if results and results["documents"] and len(results["documents"][0]) > 0:
            for idx in range(len(results["documents"][0])):
                formatted_results.append({
                    "text": results["documents"][0][idx],
                    "metadata": results["metadatas"][0][idx],
                    "id": results["ids"][0][idx],
                    "distance": results["distances"][0][idx] if "distances" in results and results["distances"] else 0.0
                })
        return formatted_results

    def list_documents(self) -> List[Dict[str, Any]]:
        """
        Lists all unique documents currently stored in the vector database.
        """
        # Fetch all metadata of items in the collection
        all_data = self.collection.get(include=["metadatas"])
        if not all_data or not all_data["metadatas"]:
            return []

        # Find unique sources by title/source name
        seen = set()
        docs = []
        for meta in all_data["metadatas"]:
            source = meta.get("source")
            if source and source not in seen:
                seen.add(source)
                docs.append({
                    "source": source,
                    "title": meta.get("title", source),
                    "author": meta.get("author", "Unknown")
                })
        return docs

    def delete_document(self, source_filename: str):
        """
        Deletes all chunks corresponding to a specific source file.
        """
        self.collection.delete(
            where={"source": source_filename}
        )
        return True
        
    def get_document_chunks(self, source_filename: str) -> List[str]:
        """
        Retrieves all text chunks of a specific document, ordered by page.
        """
        data = self.collection.get(
            where={"source": source_filename},
            include=["documents", "metadatas"]
        )
        if not data or not data["documents"]:
            return []
        
        # Sort chunks by page number
        sorted_pairs = sorted(
            zip(data["documents"], data["metadatas"]),
            key=lambda x: x[1].get("page", 0)
        )
        return [doc for doc, meta in sorted_pairs]
        
    def get_all_document_contents(self) -> Dict[str, str]:
        """
        Returns a dictionary mapping document filename to their full combined text.
        """
        data = self.collection.get(include=["documents", "metadatas"])
        if not data or not data["documents"]:
            return {}
            
        docs_text = {}
        for doc, meta in zip(data["documents"], data["metadatas"]):
            source = meta.get("source")
            if source not in docs_text:
                docs_text[source] = []
            docs_text[source].append((meta.get("page", 0), doc))
            
        # Sort by page and join
        final_docs = {}
        for source, page_tuples in docs_text.items():
            sorted_tuples = sorted(page_tuples, key=lambda x: x[0])
            final_docs[source] = "\n\n".join([text for page, text in sorted_tuples])
            
        return final_docs
