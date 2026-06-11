import os
import sys
import shutil
from pathlib import Path
from dotenv import load_dotenv

# Add project root to python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Load .env variables
load_dotenv()

from rag.chunker import PDFChunker
from rag.vectorstore import VectorStore
from rag.retriever import Retriever
from llm.gemini import generate_text
from research.compare import compare_papers
from research.contradictions import detect_contradictions
from research.literature_review import generate_literature_review
from research.future_work import analyze_gaps
from research.concept_graph import extract_concept_graph

def create_sample_pdf(filename, text_content):
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    # Simple formatting: draw multiple lines
    y = 50
    for line in text_content.split('\n'):
        if line.strip():
            page.insert_text((50, y), line)
            y += 20
    doc.save(filename)
    doc.close()

def run_integration_tests():
    print("====================================================")
    print("STARTING INTEGRATION TESTS FOR RESEARCHGPT")
    print("====================================================")
    
    # Check if API Key is present
    if not os.getenv("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY environment variable not set. Please set it in .env file first.")
        sys.exit(1)
        
    # File paths for test PDFs
    pdf1_name = "Attention_Paper.pdf"
    pdf2_name = "BERT_Paper.pdf"
    
    pdf1_content = """
    Title: Attention Is All You Need
    Authors: Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit
    Abstract: We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.
    Introduction: The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, which eschews recurrence and instead relies entirely on self-attention.
    Methodology: The Transformer uses stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. The attention function can be described as mapping a query and a set of key-value pairs to an output. We use Scaled Dot-Product Attention.
    Results: On the WMT 2014 English-to-German translation task, the Transformer model establishes a new state-of-the-art BLEU score of 28.4, outperforming the best existing models, including ensembles, by over 2.0 BLEU.
    Limitations: The Transformer can be memory intensive for extremely long sequences due to the quadratic complexity of self-attention.
    """
    
    pdf2_content = """
    Title: BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding
    Authors: Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova
    Abstract: We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations.
    Introduction: Language model pre-training has been shown to be effective for improving many natural language processing tasks. However, unidirectional models limit the power of pre-trained representations. We argue that bidirectional training is crucial.
    Methodology: We use a multi-layer bidirectional Transformer encoder. We propose a new pre-training objective: the "masked language model" (MLM), where we randomly mask some of the tokens from the input.
    Results: BERT obtains new state-of-the-art results on eleven natural language processing tasks, including a GLUE score of 80.5%.
    Limitations: Pre-training BERT is extremely computationally expensive. Fine-tuning is fast but requires task-specific output layers. Additionally, BERT does not have a decoder, so it is less suited for generative tasks like translation compared to the standard Transformer.
    """
    
    print("\n[Step 1] Creating test PDFs...")
    create_sample_pdf(pdf1_name, pdf1_content)
    create_sample_pdf(pdf2_name, pdf2_content)
    print("Test PDFs created: Attention_Paper.pdf, BERT_Paper.pdf")
    
    # Initialize components
    chunker = PDFChunker(chunk_size=1000, chunk_overlap=150)
    vector_store = VectorStore()
    retriever = Retriever(vector_store)
    
    try:
        print("\n[Step 2] Chunking and Indexing PDFs in ChromaDB...")
        chunks1 = chunker.chunk_document(pdf1_name)
        chunks2 = chunker.chunk_document(pdf2_name)
        
        print(f"Adding {len(chunks1)} chunks for {pdf1_name} to ChromaDB...")
        vector_store.add_chunks(chunks1)
        
        print(f"Adding {len(chunks2)} chunks for {pdf2_name} to ChromaDB...")
        vector_store.add_chunks(chunks2)
        
        print("Indexing completed!")
        
        # Verify documents in store
        docs = vector_store.list_documents()
        print(f"Indexed documents: {[d['source'] for d in docs]}")
        
        print("\n[Step 3] Testing RAG Query Engine...")
        query = "What is the key mechanism in the Transformer paper?"
        print(f"Query: '{query}'")
        context, citations = retriever.get_context_for_query(query, top_k=3)
        
        from llm.prompts import RAG_PROMPT_TEMPLATE
        prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=query)
        answer = generate_text(prompt)
        
        print("Answer:")
        print(answer)
        print("\nCitations Used:")
        for idx, cit in enumerate(citations):
            print(f"[{idx+1}] Source: {cit['source']}, Page: {cit['page']}")
            
        print("\n[Step 4] Testing Multi-Paper Comparison Engine...")
        sources = [pdf1_name, pdf2_name]
        comparison = compare_papers(sources, vector_store)
        print("Comparison Matrix:")
        for row in comparison.comparison_rows:
            print(f"- Paper: {row.paper_name}")
            print(f"  Model: {row.model_architecture}")
            print(f"  Method: {row.methodology}")
            print(f"  Datasets: {row.datasets}")
            print(f"  Metrics: {row.metrics}")
            print(f"  Limitations: {row.limitations}")
        print(f"\nOverall Synthesis: {comparison.overall_synthesis}")
        
        print("\n[Step 5] Testing Contradiction Detector...")
        contradictions = detect_contradictions(sources, vector_store)
        print(f"Has contradictions: {contradictions.has_contradictions}")
        print(f"Summary: {contradictions.summary}")
        for c in contradictions.contradictions:
            print(f"- Area: {c.conflict_area}")
            print(f"  {c.paper_a_name} claims: {c.paper_a_claim}")
            print(f"  {c.paper_b_name} claims: {c.paper_b_claim}")
            print(f"  Explanation: {c.explanation}")
            
        print("\n[Step 6] Testing Literature Review Generator...")
        review = generate_literature_review(sources, save_to_file=True, vector_store=vector_store)
        print(f"Literature review generated successfully at: {review['filepath']}")
        print(review['content'][:300] + "...\n[TRUNCATED]")
        
        print("\n[Step 7] Testing Research Gap & Future Work Generator...")
        gaps = analyze_gaps(sources, vector_store)
        print(f"Gap Summary: {gaps.summary}")
        for g in gaps.gaps:
            print(f"- Gap: {g.gap_title}")
            print(f"  Description: {g.description}")
            print(f"  Proposed Solution: {g.proposed_solution}")
            print(f"  Novelty: {g.novelty_justification}")
            
        print("\n[Step 8] Testing Concept Graph Generator...")
        graph_data = extract_concept_graph(sources, vector_store)
        print(f"Extracted {len(graph_data.nodes)} nodes and {len(graph_data.edges)} edges.")
        for node in graph_data.nodes[:3]:
            print(f"  Node: {node.id} ({node.label} - {node.type})")
        for edge in graph_data.edges[:3]:
            print(f"  Edge: {edge.source} -> {edge.target} ({edge.relationship})")
            
        print("\n====================================================")
        print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
        print("====================================================")
        
    finally:
        # Cleanup
        print("\nCleaning up test artifacts...")
        if os.path.exists(pdf1_name):
            os.remove(pdf1_name)
        if os.path.exists(pdf2_name):
            os.remove(pdf2_name)
            
        # Clear database records
        vector_store.delete_document(pdf1_name)
        vector_store.delete_document(pdf2_name)
        
        print("Cleanup completed.")

if __name__ == "__main__":
    run_integration_tests()
