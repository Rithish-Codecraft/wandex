# Prompts and templates for ResearchGPT

RAG_PROMPT_TEMPLATE = """You are an advanced Research Assistant AI. Answer the user's question using only the provided context below.
For every claim or point you make, you MUST cite the source. Use inline citations in the format `[Source_Name, p. X]` (e.g. `[Attention_Is_All_You_Need.pdf, p. 4]`).
If the context does not contain the answer, say that you cannot find the answer in the provided documents. Do not make up information.

Context:
{context}

Question:
{question}

Answer with citations:"""

COMPARE_PROMPT_TEMPLATE = """You are an expert academic reviewer. Analyze the following texts from multiple research papers and extract a comparison matrix.
For each paper, extract:
1. Paper Name (or short title)
2. Core Model/Architecture
3. Methodology (brief summary of how they did it)
4. Datasets used for evaluation
5. Key Performance/Accuracy metrics
6. Key Limitations

Papers to compare:
{papers_text}

Generate the response in the requested JSON structure. Keep descriptions clear and concise, highlighting similarities and differences where appropriate."""

CONTRADICTION_PROMPT_TEMPLATE = """You are an expert research analyst. Review the provided texts from different research papers and identify any conflicting claims, disagreements, or contradictions in their findings, methodology, results, or conclusions.

For example, if Paper A says "Model X outperforms Model Y on dataset Z" and Paper B says "Model Y is superior to Model X on dataset Z", this is a contradiction.

Papers Text:
{papers_text}

Analyze and identify all such contradictions. If no contradictions are found, return an empty list.
Provide the output in the requested JSON format, explaining the conflict, which papers are involved, what the conflicting claims are, and the citation or context where they occur."""

LITERATURE_REVIEW_TEMPLATE = """You are a senior researcher. Write a comprehensive, high-quality, and well-structured Literature Review based ONLY on the provided papers and their summaries/content below.

Your literature review should include the following sections:
1. **Introduction & Scope**: Introduce the area of study, the papers under review, and the overall objectives.
2. **Methodological Overview**: Synthesize the key methods, models, and architectures employed.
3. **Key Themes and Trends**: Discuss what patterns emerged across the papers, how the field has evolved, and the major successes.
4. **Current Challenges & Limitations**: Detail the common pain points, obstacles, and limitations identified across the literature.
5. **Synthesis & Conclusion**: A summary of where the field currently stands and its overall trajectory.

Ensure you cite the papers appropriately (e.g., "Vaswani et al. (2017)") based on the provided metadata. Keep the language academic, rigorous, and clear.

Papers Content:
{papers_text}
"""

RESEARCH_GAP_TEMPLATE = """You are a research advisor. Analyze the provided research papers to identify research gaps (e.g., missing datasets, unaddressed edge cases, untested methodologies, scalability issues) and propose concrete, novel ideas for future work.

Provide:
1. **Identified Research Gaps**: What have these papers missed? What are the limitations or areas they left unexplored?
2. **Proposed Future Work & Novel Ideas**: For each gap, propose a concrete, actionable research project, new experiment, or architectural hybrid. Explain why it is novel and what value it adds.

Papers Content:
{papers_text}
"""

GRAPH_EXTRACTION_TEMPLATE = """You are a knowledge graph extractor. Your job is to extract key scientific entities and the relationships between them from the provided text.

Entities can be:
- "Paper" (e.g., a paper title/name)
- "Model" (e.g., Transformer, BERT, ResNet)
- "Method" (e.g., Self-attention, Masked Language Modeling)
- "Dataset" (e.g., ImageNet, SQuAD, WMT)
- "Concept" (e.g., Deep Learning, Natural Language Processing)
- "Author" (e.g., Vaswani et al.)

Relationships can be:
- "uses" (e.g., Model -> uses -> Method)
- "evaluated_on" (e.g., Model/Method -> evaluated_on -> Dataset)
- "improves" (e.g., Model A -> improves -> Model B)
- "alternative_to" (e.g., Model A -> alternative_to -> Model B)
- "authored" (e.g., Author -> authored -> Paper)
- "part_of" (e.g., Concept A -> part_of -> Concept B)
- "addresses" (e.g., Paper/Model -> addresses -> Concept/Problem)

Text to analyze:
{text}

Extract up to 15 key relationships. Ensure the output is strictly in the requested JSON format, with a list of nodes (id, label, type, description) and edges (source, target, relationship_type). The description should be a 10-25 word summary, definition, key quote, or overview of that node.
"""
