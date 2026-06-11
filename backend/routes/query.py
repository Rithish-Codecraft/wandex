import time
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from rag.retriever import Retriever
from llm.gemini import generate_text
from llm.prompts import RAG_PROMPT_TEMPLATE
from backend.services.evaluation import evaluate_rag_response

router = APIRouter(prefix="/query", tags=["query"])
retriever = Retriever()

class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    filter_source: Optional[str] = None

class QueryResponse(BaseModel):
    answer: str
    citations: List[Dict[str, Any]]

@router.post("", response_model=QueryResponse)
def query_knowledge_base(request: QueryRequest, background_tasks: BackgroundTasks):
    try:
        start_time = time.time()
        # Prepare filters if provided
        filters = {}
        if request.filter_source:
            filters["source"] = request.filter_source
        
        # Get relevant context & citations from Retriever
        context, citations = retriever.get_context_for_query(
            query=request.query, 
            top_k=request.top_k, 
            filters=filters if filters else None
        )
        
        if not context.strip():
            return QueryResponse(
                answer="I couldn't find any relevant information in the uploaded documents. Please upload some papers first.",
                citations=[]
            )
            
        # Format the prompt with context and question
        prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=request.query)
        
        # Generate answer via OpenRouter
        try:
            answer = generate_text(prompt)
        except Exception as e:
            print(f"Error generating text in query: {e}")
            # Format fallback answer showing the retrieved chunks directly
            answer_parts = [
                "⚠️ **OpenRouter API Error**\n\n"
                "I was unable to synthesize a response due to an API error. Here are the relevant chunks retrieved from your workspace documents:\n"
            ]
            for idx, cit in enumerate(citations[:3]):
                src = cit.get("source", "Document")
                text = cit.get("text", "")
                page = cit.get("page", 1)
                answer_parts.append(f"**[{idx + 1}] Source: {src} (p. {page})**\n> {text}\n")
            
            answer = "\n".join(answer_parts)
        
        latency = time.time() - start_time
        
        # Evaluate response in the background (skip if it was a fallback to prevent secondary failures)
        if "OpenRouter API Error" not in answer:
            background_tasks.add_task(
                evaluate_rag_response,
                query=request.query,
                answer=answer,
                context=context,
                citations=citations,
                latency=latency
            )
        
        return QueryResponse(
            answer=answer,
            citations=citations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


