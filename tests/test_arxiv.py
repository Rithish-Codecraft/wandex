import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add project root to python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Load .env variables
load_dotenv()

from backend.services.arxiv_service import search_arxiv_api

def test_arxiv_search():
    print("Testing arXiv Search API...")
    results = search_arxiv_api("attention is all you need", max_results=2)
    print(f"Found {len(results)} papers.")
    assert len(results) > 0
    for paper in results:
        print(f"- {paper['title']} (ID: {paper['id']})")
        assert 'id' in paper
        assert 'title' in paper
        assert 'pdf_url' in paper
        
    print("All tests passed!")

if __name__ == "__main__":
    test_arxiv_search()
