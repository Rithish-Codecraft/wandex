from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from backend.services.study_service import generate_flashcards, generate_quiz, FlashcardDeck, Quiz

router = APIRouter(prefix="/study", tags=["study"])

class StudyRequest(BaseModel):
    sources: List[str]
    count: int = 5

@router.post("/flashcards", response_model=FlashcardDeck)
def run_flashcard_generation(request: StudyRequest):
    try:
        return generate_flashcards(request.sources, count=request.count)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz", response_model=Quiz)
def run_quiz_generation(request: StudyRequest):
    try:
        return generate_quiz(request.sources, count=request.count)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
