import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.config import settings
from rag.vectorstore import VectorStore
from backend.services.media_service import MediaService
from backend.services.arxiv_service import download_and_index_papers, arxiv_tasks

router = APIRouter(prefix="/documents", tags=["documents"])
vector_store = VectorStore()
media_service = MediaService()

class SearchIndexRequest(BaseModel):
    query: str
    limit: Optional[int] = 5

class URLImportRequest(BaseModel):
    url: str

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # Save the file temporarily
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse and chunk document
        chunks = media_service.parse_and_chunk(file_path, mime_type=file.content_type)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="Could not extract content from the file.")
            
        # Add to vector store
        vector_store.add_chunks(chunks)
        
        # Index into Neo4j Graph if active
        try:
            from backend.services.neo4j_service import Neo4jService
            neo4j = Neo4jService()
            if neo4j.is_active:
                full_text = "\n\n".join([c["text"] for c in chunks])
                neo4j.extract_and_index_paper(file.filename, full_text)
        except Exception as neo_err:
            print(f"Failed to index Neo4j nodes: {neo_err}")
        
        return {
            "filename": file.filename,
            "status": "success",
            "message": f"Successfully parsed and indexed {len(chunks)} chunks from {file.filename}."
        }
    except Exception as e:
        # Cleanup file if something failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@router.post("/import-url")
def import_url(request: URLImportRequest):
    try:
        url = request.url
        clean_text = media_service.parse_url(url)
        
        # Determine source name from URL
        parsed_name = url.split("//")[-1].replace("/", "_").replace("?", "_").replace("=", "_")[:100]
        if not parsed_name.endswith(".md"):
            parsed_name += ".md"
            
        chunks = media_service.chunk_text(clean_text, parsed_name, f"Web Article: {url}", "Web Scraper")
        if not chunks:
            raise HTTPException(status_code=400, detail="Could not extract clean text from the URL.")
            
        vector_store.add_chunks(chunks)
        
        # Index into Neo4j Graph if active
        try:
            from backend.services.neo4j_service import Neo4jService
            neo4j = Neo4jService()
            if neo4j.is_active:
                neo4j.extract_and_index_paper(parsed_name, clean_text)
        except Exception as neo_err:
            print(f"Failed to index Neo4j nodes: {neo_err}")
            
        return {
            "source": parsed_name,
            "status": "success",
            "message": f"Successfully imported and indexed {len(chunks)} chunks from URL: {url}."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search-index")
def start_search_index(request: SearchIndexRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    background_tasks.add_task(download_and_index_papers, task_id, request.query, request.limit)
    return {"task_id": task_id, "status": "started", "message": "Search and index operation initiated in the background."}


@router.get("/search-index/status/{task_id}")
def get_search_index_status(task_id: str):
    if task_id not in arxiv_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return arxiv_tasks[task_id]

@router.get("", response_model=List[Dict[str, Any]])
def list_documents():
    try:
        return vector_store.list_documents()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{filename}")
def delete_document(filename: str):
    try:
        # Delete from vector store
        vector_store.delete_document(filename)
        
        # Delete the actual file from uploads directory if it exists
        file_path = os.path.join(settings.UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {"status": "success", "message": f"Document '{filename}' deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
