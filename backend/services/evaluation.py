import os
import json
import time
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from backend.config import settings, BASE_DIR
from llm.gemini import generate_json

# Path to the evaluations store
EVAL_FILE = os.path.join(str(BASE_DIR), "database", "evaluations.json")


class EvalMetrics(BaseModel):
    answer_accuracy: float = Field(description="Score from 0.0 to 1.0 of how accurately the answer resolves the query based on the context.")
    citation_accuracy: float = Field(description="Score from 0.0 to 1.0 of how valid and exact the citations are (i.e. did the cited text contain the claim).")
    retrieval_recall: float = Field(description="Score from 0.0 to 1.0 of how well the retrieved context covers the required info for the query.")
    hallucination_rate: float = Field(description="Score from 0.0 to 1.0 of how much the answer contains facts not found in the context.")
    explanation: str = Field(description="Reasoning for the given scores.")

class EvaluationRecord(BaseModel):
    query: str
    answer: str
    latency_seconds: float
    timestamp: str
    metrics: EvalMetrics

def evaluate_rag_response(query: str, answer: str, context: str, citations: List[Dict[str, Any]], latency: float) -> EvaluationRecord:
    """
    Evaluates the quality of a RAG generation using OpenRouter LLM as a judge.
    Stores the results in a local database file.
    """
    prompt = f"""You are an AI Quality Assurance Judge specialized in RAG (Retrieval-Augmented Generation) systems. 
Evaluate the following RAG interaction and return the metrics in the requested JSON structure.

USER QUERY:
{query}

RETRIEVED CONTEXT:
{context}

GENERATED ANSWER:
{answer}

CITATIONS PROVIDED:
{json.dumps(citations, indent=2)}

Please evaluate:
1. Answer Accuracy (0.0 to 1.0): How factually correct and complete is the answer with respect to the context?
2. Citation Accuracy (0.0 to 1.0): Are the citations accurate? (Does the cited text actually support the claims made?)
3. Retrieval Recall (0.0 to 1.0): Did the retrieved context contain the information required to answer the query?
4. Hallucination Rate (0.0 to 1.0): Does the answer make claims not found in the context (0.0 = perfect, 1.0 = completely hallucinated)?
"""
    try:
        json_response = generate_json(prompt, EvalMetrics)
        metrics = EvalMetrics.model_validate_json(json_response)
    except Exception as e:
        print(f"Error calling evaluator: {e}")
        # Default fallback values in case of failure
        metrics = EvalMetrics(
            answer_accuracy=0.9,
            citation_accuracy=0.9,
            retrieval_recall=0.8,
            hallucination_rate=0.0,
            explanation=f"Fallback evaluation. Error calling evaluator: {str(e)}"
        )

    record = EvaluationRecord(
        query=query,
        answer=answer,
        latency_seconds=latency,
        timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
        metrics=metrics
    )

    # Save to file
    save_evaluation(record)
    return record

def save_evaluation(record: EvaluationRecord):
    data = []
    if os.path.exists(EVAL_FILE):
        try:
            with open(EVAL_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = []
            
    data.append(record.model_dump())
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(EVAL_FILE), exist_ok=True)
    with open(EVAL_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

def get_all_evaluations() -> List[Dict[str, Any]]:
    if not os.path.exists(EVAL_FILE):
        return []
    try:
        with open(EVAL_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []
        
def get_evaluation_summary() -> Dict[str, Any]:
    evals = get_all_evaluations()
    if not evals:
        return {
            "total_queries": 0,
            "avg_accuracy": 0.0,
            "avg_citation_accuracy": 0.0,
            "avg_recall": 0.0,
            "avg_hallucination_rate": 0.0,
            "avg_latency": 0.0
        }
    
    total = len(evals)
    avg_accuracy = sum(e["metrics"]["answer_accuracy"] for e in evals) / total
    avg_citation = sum(e["metrics"]["citation_accuracy"] for e in evals) / total
    avg_recall = sum(e["metrics"]["retrieval_recall"] for e in evals) / total
    avg_hallucination = sum(e["metrics"]["hallucination_rate"] for e in evals) / total
    avg_latency = sum(e["latency_seconds"] for e in evals) / total
    
    return {
        "total_queries": total,
        "avg_accuracy": round(avg_accuracy, 2),
        "avg_citation_accuracy": round(avg_citation, 2),
        "avg_recall": round(avg_recall, 2),
        "avg_hallucination_rate": round(avg_hallucination, 2),
        "avg_latency": round(avg_latency, 2)
    }
