import os
import sys
from pathlib import Path

# Add project root to python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from rag.chunker import PDFChunker

def create_mock_pdf(filename):
    # Create a simple dummy text file and pretend it's a PDF or we can use fitz to write one
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Hello world. This is a test PDF for the ResearchGPT platform. It contains various paragraphs. Let's make sure it chunks properly. The attention mechanism is a key part of the Transformer architecture.")
    doc.save(filename)
    doc.close()

def test_chunker():
    print("Testing PDF Chunker...")
    test_pdf = "test_doc.pdf"
    create_mock_pdf(test_pdf)
    
    try:
        chunker = PDFChunker(chunk_size=100, chunk_overlap=20)
        chunks = chunker.chunk_document(test_pdf)
        
        print(f"Successfully chunked PDF into {len(chunks)} chunks!")
        for idx, chunk in enumerate(chunks):
            print(f"\nChunk {idx+1}:")
            print(f"Page: {chunk['page']}")
            print(f"Text: '{chunk['text']}'")
            print(f"Source: {chunk['source']}")
            
        assert len(chunks) > 0, "No chunks generated!"
        print("\nAll unit tests passed successfully!")
    finally:
        if os.path.exists(test_pdf):
            os.remove(test_pdf)

if __name__ == "__main__":
    test_chunker()
