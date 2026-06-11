import os
import re
from typing import List, Dict, Any
import fitz  # PyMuPDF

class PDFChunker:
    def __init__(self, chunk_size: int = 1500, chunk_overlap: int = 300):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def clean_text(self, text: str) -> str:
        # Replace multiple whitespaces/newlines with a single space
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def parse_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Parses a PDF file, extracts text page by page, and returns a list of pages.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        doc = fitz.open(file_path)
        pages_content = []

        # Try to extract some basic metadata
        metadata = doc.metadata
        title = metadata.get("title") or os.path.basename(file_path)
        author = metadata.get("author") or "Unknown"
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            cleaned_text = self.clean_text(text)
            
            if cleaned_text:
                pages_content.append({
                    "text": cleaned_text,
                    "page": page_num + 1,
                    "title": title,
                    "author": author,
                    "source": os.path.basename(file_path)
                })
        
        return pages_content

    def chunk_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Parses the PDF and chunks the content into overlapping segments.
        """
        pages = self.parse_pdf(file_path)
        chunks = []
        
        for page in pages:
            text = page["text"]
            page_num = page["page"]
            source = page["source"]
            title = page["title"]
            author = page["author"]
            
            # If the page text is smaller than chunk_size, keep it as a single chunk
            if len(text) <= self.chunk_size:
                chunks.append({
                    "text": text,
                    "page": page_num,
                    "source": source,
                    "title": title,
                    "author": author,
                    "chunk_id": f"{source}_p{page_num}_c0"
                })
                continue
            
            # Otherwise, split the page into overlapping chunks
            start = 0
            chunk_idx = 0
            while start < len(text):
                end = start + self.chunk_size
                # Adjust end to land on a space if possible, so we don't cut words
                if end < len(text):
                    last_space = text.rfind(' ', start, end)
                    if last_space != -1 and last_space > start:
                        end = last_space
                
                chunk_text = text[start:end].strip()
                if chunk_text:
                    chunks.append({
                        "text": chunk_text,
                        "page": page_num,
                        "source": source,
                        "title": title,
                        "author": author,
                        "chunk_id": f"{source}_p{page_num}_c{chunk_idx}"
                    })
                    chunk_idx += 1
                
                start = end - self.chunk_overlap
                # Prevent infinite loops
                if start >= len(text) - self.chunk_overlap:
                    break
                    
        return chunks
