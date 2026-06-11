from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from research.compare import compare_papers, ComparisonMatrix
from research.contradictions import detect_contradictions, ContradictionReport
from research.agent_workflow import generate_multi_agent_review
from research.future_work import analyze_gaps, ResearchGapReport
from research.concept_graph import extract_concept_graph, generate_vis_js_html, ConceptGraph

router = APIRouter(prefix="/research", tags=["research"])

class ResearchRequest(BaseModel):
    sources: List[str]

class LitReviewResponse(BaseModel):
    content: str
    filepath: str

class GraphResponse(BaseModel):
    graph: ConceptGraph
    html: str

@router.post("/compare", response_model=ComparisonMatrix)
def run_comparison(request: ResearchRequest):
    try:
        return compare_papers(request.sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in comparison: {str(e)}")

@router.post("/contradictions", response_model=ContradictionReport)
def run_contradiction_detection(request: ResearchRequest):
    try:
        return detect_contradictions(request.sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in contradiction detection: {str(e)}")

@router.post("/lit-review", response_model=LitReviewResponse)
def run_literature_review(request: ResearchRequest):
    try:
        res = generate_multi_agent_review(request.sources)
        return LitReviewResponse(content=res["content"], filepath=res["filepath"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating literature review: {str(e)}")


@router.post("/gaps", response_model=ResearchGapReport)
def run_gap_analysis(request: ResearchRequest):
    try:
        return analyze_gaps(request.sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in gap analysis: {str(e)}")

@router.post("/graph", response_model=GraphResponse)
def run_graph_generation(request: ResearchRequest):
    try:
        graph = extract_concept_graph(request.sources)
        html = generate_vis_js_html(graph)
        return GraphResponse(graph=graph, html=html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating concept graph: {str(e)}")
