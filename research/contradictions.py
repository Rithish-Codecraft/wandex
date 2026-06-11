from typing import List
from pydantic import BaseModel, Field
from rag.vectorstore import VectorStore
from llm.gemini import generate_json
from llm.prompts import CONTRADICTION_PROMPT_TEMPLATE

class ContradictionItem(BaseModel):
    conflict_area: str = Field(description="The topic or area of conflict (e.g., performance on GLUE, scalability).")
    paper_a_name: str = Field(description="Name of the first paper.")
    paper_a_claim: str = Field(description="Claim made by the first paper.")
    paper_b_name: str = Field(description="Name of the second (or other) paper.")
    paper_b_claim: str = Field(description="Claim made by the second paper (contradicting the first).")
    explanation: str = Field(description="Explanation of the discrepancy or contradiction.")

class ContradictionReport(BaseModel):
    has_contradictions: bool = Field(description="True if any contradictions or discrepancies were found, False otherwise.")
    contradictions: List[ContradictionItem] = Field(description="List of detected contradictions.")
    summary: str = Field(description="A summary of the overall consistency or disagreement across the analyzed papers.")

def detect_contradictions(sources: List[str], vector_store: VectorStore = None) -> ContradictionReport:
    """
    Analyzes multiple papers to detect conflicting claims or results.
    """
    if not vector_store:
        vector_store = VectorStore()

    if not sources:
        return ContradictionReport(has_contradictions=False, contradictions=[], summary="No papers selected for analysis.")

    # Retrieve and assemble text for all selected papers
    papers_data = []
    for source in sources:
        chunks = vector_store.get_document_chunks(source)
        if chunks:
            full_text = "\n\n".join(chunks)
            clipped_text = full_text[:40000] # Cap text size
            papers_data.append(f"--- START OF PAPER: {source} ---\n{clipped_text}\n--- END OF PAPER: {source} ---")

    combined_papers_text = "\n\n".join(papers_data)
    prompt = CONTRADICTION_PROMPT_TEMPLATE.format(papers_text=combined_papers_text)
    
    try:
        # Generate structured JSON matching the Pydantic schema
        json_response = generate_json(prompt, ContradictionReport)
        return ContradictionReport.model_validate_json(json_response)
    except Exception as e:
        print(f"Error detecting contradictions: {e}")
        return ContradictionReport(
            has_contradictions=False,
            contradictions=[],
            summary=f"⚠️ OpenRouter API Error. Contradiction analysis is unavailable. Details: {str(e)}"
        )
