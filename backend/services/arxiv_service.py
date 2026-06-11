import os
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import uuid
from typing import Dict, Any, List
from backend.config import settings
from rag.chunker import PDFChunker
from rag.vectorstore import VectorStore

# In-memory store for tracking background search & index tasks
arxiv_tasks: Dict[str, Dict[str, Any]] = {}

def search_arxiv_api(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """
    Queries the public arXiv API for a search term, parses the XML, and returns a list of results.
    """
    base_url = "http://export.arxiv.org/api/query?"
    params = {
        "search_query": query,
        "max_results": max_results,
        "sortBy": "relevance",
        "sortOrder": "descending"
    }
    
    query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote_plus)
    url = base_url + query_string
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        results = []
        
        # XML namespace helper
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        
        for entry in root.findall("atom:entry", ns):
            paper = {}
            authors = []
            
            # Extract id
            id_elem = entry.find("atom:id", ns)
            if id_elem is not None and id_elem.text:
                paper["id"] = id_elem.text.split("/abs/")[-1].split("v")[0] # strip version suffix if present
                paper["id_with_version"] = id_elem.text.split("/abs/")[-1]
            
            # Extract title
            title_elem = entry.find("atom:title", ns)
            if title_elem is not None and title_elem.text:
                paper["title"] = title_elem.text.replace("\n", " ").strip()
            else:
                paper["title"] = "Untitled"
                
            # Extract summary/abstract
            summary_elem = entry.find("atom:summary", ns)
            if summary_elem is not None and summary_elem.text:
                paper["summary"] = summary_elem.text.replace("\n", " ").strip()
            else:
                paper["summary"] = ""
                
            # Extract published date
            pub_elem = entry.find("atom:published", ns)
            if pub_elem is not None and pub_elem.text:
                paper["published"] = pub_elem.text
                
            # Extract authors
            for author_node in entry.findall("atom:author", ns):
                name_node = author_node.find("atom:name", ns)
                if name_node is not None and name_node.text:
                    authors.append(name_node.text)
            paper["authors"] = authors
            
            # Extract PDF link
            paper["pdf_url"] = f"https://arxiv.org/pdf/{paper['id']}.pdf"
            for link in entry.findall("atom:link", ns):
                if link.get("title") == "pdf":
                    paper["pdf_url"] = link.get("href")
            
            results.append(paper)
            
        return results
    except Exception as e:
        print(f"Error querying arXiv: {e}")
        return []

def download_and_index_papers(task_id: str, query: str, limit: int):
    """
    Downloads and indexes papers from arXiv based on a query.
    Updates the task status dictionary during execution.
    """
    global arxiv_tasks
    arxiv_tasks[task_id] = {
        "status": "searching",
        "progress": 0,
        "total": 0,
        "message": "Searching arXiv...",
        "papers_indexed": []
    }
    
    papers = search_arxiv_api(query, max_results=limit)
    
    if not papers:
        arxiv_tasks[task_id]["status"] = "failed"
        arxiv_tasks[task_id]["message"] = "No papers found or error querying arXiv."
        return
        
    total_papers = len(papers)
    arxiv_tasks[task_id]["total"] = total_papers
    arxiv_tasks[task_id]["status"] = "processing"
    
    chunker = PDFChunker()
    vector_store = VectorStore()
    
    success_count = 0
    for idx, paper in enumerate(papers):
        paper_id = paper["id"]
        paper_title = paper["title"]
        # Sanitize filename
        safe_title = "".join([c if c.isalnum() else "_" for c in paper_title])[:60]
        filename = f"{paper_id}_{safe_title}.pdf"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        
        arxiv_tasks[task_id]["message"] = f"Downloading paper {idx+1}/{total_papers}: {paper_title[:40]}..."
        
        # Download PDF with 3 second delay for arXiv policy compliance
        time.sleep(3.0)
        try:
            req = urllib.request.Request(
                paper["pdf_url"], 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req) as response:
                pdf_data = response.read()
                
            with open(filepath, "wb") as f:
                f.write(pdf_data)
                
            arxiv_tasks[task_id]["message"] = f"Indexing paper {idx+1}/{total_papers}: {paper_title[:40]}..."
            
            # Chunk and Index
            chunks = chunker.chunk_document(filepath)
            
            # Add author/title info
            for chunk in chunks:
                chunk["author"] = ", ".join(paper["authors"]) if paper["authors"] else "Unknown"
                chunk["title"] = paper_title
                
            vector_store.add_chunks(chunks)
            
            # Index into Neo4j Graph if active
            try:
                from backend.services.neo4j_service import Neo4jService
                neo4j = Neo4jService()
                if neo4j.is_active:
                    full_text = "\n\n".join([c["text"] for c in chunks])
                    neo4j.extract_and_index_paper(filename, full_text)
            except Exception as neo_err:
                print(f"Failed to index Neo4j nodes: {neo_err}")
            
            arxiv_tasks[task_id]["papers_indexed"].append({
                "title": paper_title,
                "filename": filename,
                "authors": paper["authors"]
            })
            success_count += 1
            
        except Exception as e:
            print(f"Failed to process {paper_title}: {e}")
            # Clean up partial files
            if os.path.exists(filepath):
                os.remove(filepath)
                
        arxiv_tasks[task_id]["progress"] = idx + 1
        
    if success_count > 0:
        arxiv_tasks[task_id]["message"] = "Generating automatic literature review for the indexed papers..."
        try:
            from research.agent_workflow import generate_multi_agent_review
            sources = [p["filename"] for p in arxiv_tasks[task_id]["papers_indexed"]]
            review_res = generate_multi_agent_review(sources, vector_store=vector_store)
            arxiv_tasks[task_id]["lit_review"] = review_res
            arxiv_tasks[task_id]["message"] = f"Successfully downloaded, indexed {success_count} papers, and generated literature review."
        except Exception as review_err:
            print(f"Failed to generate review in background: {review_err}")
            arxiv_tasks[task_id]["message"] = f"Successfully downloaded and indexed {success_count} papers. (Lit review failed: {review_err})"
    else:
        arxiv_tasks[task_id]["message"] = "No papers were successfully downloaded or indexed."
        
    arxiv_tasks[task_id]["status"] = "completed"

