from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.services.studio_service import (
    generate_podcast_audio, 
    generate_slideshow_deck, 
    SlideshowDeck,
    generate_infographic_data,
    generate_infographic_png,
    InfographicReport
)

router = APIRouter(prefix="/studio", tags=["studio"])

class StudioRequest(BaseModel):
    sources: List[str]
    style: Optional[str] = "Clean Corporate"

@router.post("/audio")
def run_podcast_generation(request: StudioRequest):
    try:
        res = generate_podcast_audio(request.sources)
        if not res["filepath"]:
            raise HTTPException(status_code=500, detail="Failed to synthesize podcast audio file.")
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/slides", response_model=SlideshowDeck)
def run_slideshow_generation(request: StudioRequest):
    try:
        return generate_slideshow_deck(request.sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/infographic")
def run_infographic_generation(request: StudioRequest):
    try:
        data = generate_infographic_data(request.sources)
        img_filename = generate_infographic_png(data, request.style or "Clean Corporate")
        return {
            "data": data.model_dump(),
            "filename": img_filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


