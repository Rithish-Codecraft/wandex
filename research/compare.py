from typing import List
from pydantic import BaseModel, Field
from rag.vectorstore import VectorStore
from llm.gemini import generate_json
from llm.prompts import COMPARE_PROMPT_TEMPLATE

# Define the Pydantic models for structured output
class PaperComparisonRow(BaseModel):
    paper_name: str = Field(description="The name or title of the paper.")
    model_architecture: str = Field(description="Core machine learning or neural network architecture used.")
    methodology: str = Field(description="Brief summary of the methodology, techniques, or approach.")
    datasets: str = Field(description="Datasets used for training or evaluation.")
    metrics: str = Field(description="Key performance results, accuracy, or other metrics reported.")
    limitations: str = Field(description="Key limitations or drawbacks noted by the authors.")

class ComparisonMatrix(BaseModel):
    comparison_rows: List[PaperComparisonRow] = Field(description="A list of comparison rows, one for each paper.")
    overall_synthesis: str = Field(description="A brief paragraph summarizing the key similarities and differences between these papers.")

def compare_papers(sources: List[str], vector_store: VectorStore = None) -> ComparisonMatrix:
    """
    Retrieves content for multiple papers and generates a structured comparison matrix.
    """
    if not vector_store:
        vector_store = VectorStore()

    if not sources:
        return ComparisonMatrix(comparison_rows=[], overall_synthesis="No papers selected for comparison.")

    # Fetch and assemble the full content or key sections for each paper
    papers_data = []
    for source in sources:
        chunks = vector_store.get_document_chunks(source)
        if chunks:
            # Join all chunks to form the full text of the paper.
            # (Cap at ~40k characters to avoid token overflow)
            full_text = "\n\n".join(chunks)
            # Clip if extremely large, e.g., to ~40k characters to save tokens/time
            clipped_text = full_text[:40000]
            papers_data.append(f"--- START OF PAPER: {source} ---\n{clipped_text}\n--- END OF PAPER: {source} ---")

    combined_papers_text = "\n\n".join(papers_data)
    prompt = COMPARE_PROMPT_TEMPLATE.format(papers_text=combined_papers_text)
    
    try:
        # Generate structured JSON according to the Pydantic model
        json_response = generate_json(prompt, ComparisonMatrix)
        # Parse and return as Pydantic object (or let Pydantic handle it)
        return ComparisonMatrix.model_validate_json(json_response)
    except Exception as e:
        print(f"Error comparing papers: {e}")
        rows = []
        for source in sources:
            rows.append(PaperComparisonRow(
                paper_name=source,
                model_architecture="Local Fallback (API Limit)",
                methodology="Workspace document chunk details.",
                datasets="N/A",
                metrics="N/A",
                limitations="Throttled by free-tier API quota limit."
            ))
        return ComparisonMatrix(
            comparison_rows=rows,
            overall_synthesis=f"⚠️ OpenRouter API Error. Showing local workspace placeholders. Details: {str(e)}"
        )

