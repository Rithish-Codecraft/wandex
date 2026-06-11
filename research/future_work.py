from typing import List
from pydantic import BaseModel, Field
from rag.vectorstore import VectorStore
from llm.gemini import generate_json
from llm.prompts import RESEARCH_GAP_TEMPLATE

class ResearchGapItem(BaseModel):
    unexplored_area: str = Field(description="The specific unexplored area (e.g. 'Transformer-based approaches have not been evaluated on Dataset X under Condition Y')")
    hypothesis: str = Field(description="The scientific hypothesis to test (e.g. 'Combining Method A with Method C will result in lower memory footprint and improved performance')")
    experiment_suggestions: List[str] = Field(description="Step-by-step experiment outline/suggestions to validate the hypothesis")
    sources: List[str] = Field(description="The source files/papers which exhibit this gap")

class ResearchGapReport(BaseModel):
    gaps: List[ResearchGapItem] = Field(description="List of identified research gaps and hypothesis-driven suggestions")
    summary: str = Field(description="Overall summary of the state of the art gaps")

def analyze_gaps(sources: List[str], vector_store: VectorStore = None) -> ResearchGapReport:
    """
    Analyzes selected papers, identifies research gaps, generates hypotheses, and suggests experiments.
    """
    if not vector_store:
        vector_store = VectorStore()

    if not sources:
        return ResearchGapReport(gaps=[], summary="No papers selected for analysis.")

    # Retrieve and assemble text for all selected papers
    papers_data = []
    for source in sources:
        chunks = vector_store.get_document_chunks(source)
        if chunks:
            full_text = "\n\n".join(chunks)
            clipped_text = full_text[:40000] # Cap text size
            papers_data.append(f"--- START OF PAPER: {source} ---\n{clipped_text}\n--- END OF PAPER: {source} ---")

    combined_papers_text = "\n\n".join(papers_data)
    
    custom_prompt = f"""You are a research advisor. Analyze the following research papers to detect research gaps (unexplored areas, missing evaluations, etc.), formulate hypotheses, and propose concrete experiments.

Generate the response in the requested JSON structure.

Papers Content:
{combined_papers_text}
"""
    
    try:
        # Generate structured JSON matching the Pydantic schema
        json_response = generate_json(custom_prompt, ResearchGapReport)
        return ResearchGapReport.model_validate_json(json_response)
    except Exception as e:
        print(f"Error analyzing gaps: {e}")
        return ResearchGapReport(
            gaps=[
                ResearchGapItem(
                    unexplored_area="Unexplored combinations under rate-limit constraints.",
                    hypothesis="Locally compiled workspace hypothesis.",
                    experiment_suggestions=["Retry request when LLM API quota resets."],
                    sources=sources
                )
            ],
            summary=f"⚠️ OpenRouter API Error. Research gaps discovery is limited. Details: {str(e)}"
        )
