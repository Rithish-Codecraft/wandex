# ResearchGPT: AI-Powered Research Intelligence Platform

ResearchGPT is an advanced research assistant platform designed to parse, index, search, and synthesize multiple scientific papers. It allows users to conduct RAG-based Q&A with precise source citations, perform multi-paper comparisons, detect contradictions in literature, identify research gaps, and view conceptual maps.

---

## 🛠️ Tech Stack
- **Frontend**: Streamlit (with custom dark-themed UI styling)
- **Backend**: FastAPI
- **Database/Vector Store**: ChromaDB (local persistent storage)
- **Large Language Model & Embeddings**: Gemini (using `google-genai` SDK)
- **PDF Parser & Chunker**: PyMuPDF (`fitz`) & recursive character-based chunker
- **Network Graph**: NetworkX + Vis.js (embedded via HTML iframe)

---

## 📋 Manual Setup Steps (Your Action Required)

To run the application, you need to set up a few credentials and run the services:

### 1. Get a Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Log in with your Google account.
3. Click on **Create API Key**.
4. Copy the generated key.

### 2. Configure the Environment
1. In the root directory of the project, create a new file named `.env`.
2. Add your Gemini API key inside it like this:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
   *Note: If you don't create this file, you can also enter the API key directly in the sidebar of the Streamlit app.*

---

## 🚀 How to Run the Application

Once the dependencies are installed (which is happening right now in the background), you can launch the application:

### Step 1: Start the Backend (FastAPI)
Run the following command from the root directory to launch the backend web server:
```bash
.venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 2: Start the Frontend (Streamlit)
Open another terminal/command prompt, and run:
```bash
.venv\Scripts\streamlit run frontend/streamlit_app.py
```

### Step 3: Open in Browser
- Open your browser to `http://localhost:8501` to view the Streamlit interface.
- You can access the API documentation at `http://localhost:8000/docs`.

---

## 🔍 Features & Usage Guide

1. **Document Vault**: Upload one or more PDF research papers. The system automatically extracts the text, segments it into 1500-character chunks, and indexes it into the local ChromaDB vector database.
2. **AI Research Assistant (RAG)**: Ask questions across all or specific papers. The system retrieves the 5 most relevant segments and uses Gemini to answer, providing inline citations (e.g., `[Attention.pdf, p. 4]`) and expandable sources.
3. **Paper Compare**: Select multiple papers and generate a comparative table summarizing their architecture, methodology, datasets, and performance.
4. **Contradiction Finder**: Scans selected papers to discover conflicting claims or differing experimental results.
5. **Research Gaps**: Identifies areas unexplored by the papers (such as missing evaluations on specific datasets or lack of support for multi-modality) and proposes new research directions.
6. **Concept Graph**: Generates an interactive force-directed graph showing relationships (e.g., `uses`, `improves`, `evaluated_on`) between models, papers, datasets, and authors.
