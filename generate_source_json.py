#!/usr/bin/env python3
import json
import os

os.chdir(r'c:\Users\RITHISH\OneDrive\Desktop\wandex')

# Define all files to include
file_mappings = [
    'backend/main.py',
    'backend/config.py',
    'backend/routes/documents.py',
    'backend/routes/query.py',
    'backend/routes/research.py',
    'backend/routes/evaluation.py',
    'backend/routes/study.py',
    'backend/routes/studio.py',
    'backend/services/arxiv_service.py',
    'backend/services/neo4j_service.py',
    'backend/services/studio_service.py',
    'backend/services/study_service.py',
    'backend/services/media_service.py',
    'backend/services/evaluation.py',
    'rag/chunker.py',
    'rag/embeddings.py',
    'rag/retriever.py',
    'rag/vectorstore.py',
    'llm/prompts.py',
    'llm/gemini.py',
    'research/literature_review.py',
    'research/contradictions.py',
    'research/agent_workflow.py',
    'research/compare.py',
    'research/future_work.py',
    'tests/test_full.py',
    'tests/test_query.py',
    'tests/test_services.py',
    'tests/test_arxiv.py',
    'tests/test_upgrades.py',
    'frontend-streamlit/streamlit_app.py',
    'frontend/package.json',
    'frontend/tsconfig.json',
    'frontend/vite.config.ts',
    'requirements.txt',
    'run_app.bat',
    '.env.example',
    '.gitignore',
]

files = []

for filepath in file_mappings:
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        files.append({'path': filepath, 'content': content})
        print(f'✓ {filepath}')
    except Exception as e:
        print(f'✗ {filepath}: {e}')

print(f'\nTotal: {len(files)} files collected')
output = json.dumps(files, ensure_ascii=False, indent=2)
print(output)

# Also save to file
with open('SOURCE_FILES_ARRAY.json', 'w', encoding='utf-8') as f:
    f.write(output)
print(f'\n✓ Saved to SOURCE_FILES_ARRAY.json')
