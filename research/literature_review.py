import os
from typing import List
from datetime import datetime
from backend.config import settings
from rag.vectorstore import VectorStore
from llm.gemini import generate_text
from llm.prompts import LITERATURE_REVIEW_TEMPLATE

def generate_literature_review(sources: List[str], save_to_file: bool = True, vector_store: VectorStore = None) -> dict:
    """
    Generates a structured literature review based on selected papers and saves it to a markdown file if required.
    """
    if not vector_store:
        vector_store = VectorStore()

    if not sources:
        return {
            "content": "No papers selected. Please upload and select papers first.",
            "filepath": ""
        }

    # Retrieve and assemble text for all selected papers
    papers_data = []
    for source in sources:
        chunks = vector_store.get_document_chunks(source)
        if chunks:
            full_text = "\n\n".join(chunks)
            clipped_text = full_text[:40000] # Cap text size
            papers_data.append(f"--- START OF PAPER: {source} ---\n{clipped_text}\n--- END OF PAPER: {source} ---")

    combined_papers_text = "\n\n".join(papers_data)
    prompt = LITERATURE_REVIEW_TEMPLATE.format(papers_text=combined_papers_text)
    
    # Generate the literature review (using a larger model if configured, e.g. gemini-1.5-pro)
    review_content = generate_text(prompt, model_name=settings.COMPARE_LLM_MODEL)
    
    filepath = ""
    if save_to_file:
        timestamp = datetime.now().strftime("%Y%md_%H%M%S")
        filename = f"literature_review_{timestamp}.md"
        filepath = os.path.join(settings.REPORTS_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(review_content)

    return {
        "content": review_content,
        "filepath": filepath
    }
