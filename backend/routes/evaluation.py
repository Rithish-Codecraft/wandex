import os
from fastapi import APIRouter, HTTPException
from backend.services.evaluation import get_evaluation_summary, get_all_evaluations, EVAL_FILE

router = APIRouter(prefix="/evaluation", tags=["evaluation"])

@router.get("/summary")
def fetch_summary():
    try:
        return get_evaluation_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def fetch_history():
    try:
        return get_all_evaluations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear")
def clear_history():
    try:
        if os.path.exists(EVAL_FILE):
            os.remove(EVAL_FILE)
        return {"status": "success", "message": "Evaluation history cleared successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
