import json
from typing import List, Optional
from pydantic import BaseModel, Field
from rag.vectorstore import VectorStore
from llm.gemini import generate_json
from llm.prompts import GRAPH_EXTRACTION_TEMPLATE

class GraphNode(BaseModel):
    id: str = Field(description="Unique short ID, lowercase with underscores, e.g., 'attention_mechanism'")
    label: str = Field(description="Display name, e.g., 'Attention Mechanism'")
    type: str = Field(description="Type: 'Paper', 'Model', 'Method', 'Dataset', 'Concept', or 'Author'")
    description: str = Field(default="", description="A short summary, definition, key quote, or description of this concept/entity from the text (10-25 words)")

class GraphEdge(BaseModel):
    source: str = Field(description="The 'id' of the starting node")
    target: str = Field(description="The 'id' of the ending node")
    relationship: str = Field(description="Relationship label, e.g., 'uses', 'improves', 'evaluated_on', 'authored', 'part_of', 'addresses'")

class ConceptGraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

def extract_concept_graph_fallback(sources: List[str], vector_store: VectorStore = None, error_msg: str = "") -> ConceptGraph:
    """
    Locally extracts a concept graph from the text by searching for key entities,
    preventing 500 crashes and bypassing LLM quota limits.
    """
    nodes = []
    edges = []
    
    # 1. Add warning/info node at the center
    nodes.append(GraphNode(
        id="api_quota_warning",
        label="⚠️ API Error Info",
        type="Concept",
        description="OpenRouter API error encountered. Displaying locally extracted representative concepts and relations."
    ))
    
    # 2. Extract nodes for papers and scan text for keywords
    for source in sources:
        doc_id = source.replace(" ", "_").replace(".", "_").replace("-", "_").lower()
        if not any(n.id == doc_id for n in nodes):
            nodes.append(GraphNode(
                id=doc_id,
                label=source,
                type="Paper",
                description=f"Research document uploaded and parsed in the workspace: {source}."
            ))
            
        edges.append(GraphEdge(
            source=doc_id,
            target="api_quota_warning",
            relationship="displays_fallback"
        ))
        
        chunks = vector_store.get_document_chunks(source) if vector_store else []
        combined_text = "\n".join(chunks[:6]) if chunks else ""
        
        keywords = {
            "Transformer": ("Model", "uses", "A deep learning model architecture relying on self-attention mechanisms."),
            "Attention Mechanism": ("Method", "uses", "Dynamically weights input tokens based on similarity to capture context."),
            "Self-Attention": ("Method", "uses", "An attention mechanism relating different positions of a single sequence."),
            "BERT": ("Model", "improves", "Bidirectional Encoder Representations from Transformers for language understanding."),
            "GPT": ("Model", "improves", "Generative Pre-trained Transformer models designed for causal language generation."),
            "ResNet": ("Model", "uses", "Residual Networks using skip connections to train very deep convolutional networks."),
            "LSTM": ("Model", "alternative_to", "Long Short-Term Memory, a gated recurrent unit network for sequence learning."),
            "RNN": ("Model", "alternative_to", "Recurrent Neural Networks processing sequences step-by-step."),
            "CNN": ("Model", "uses", "Convolutional Neural Networks leveraging spatial grid operations for images/text."),
            "Deep Learning": ("Concept", "part_of", "Subfield of machine learning based on multi-layered neural networks."),
            "Neural Network": ("Concept", "part_of", "Computational models inspired by biological neural connections."),
            "RAG": ("Method", "uses", "Retrieval-Augmented Generation retrieving external facts to improve generation."),
            "Vector Database": ("Method", "uses", "Databases indexing high-dimensional vector embeddings for semantic search."),
            "ChromaDB": ("Dataset", "evaluated_on", "An open-source embedding database for AI applications and vector storage."),
            "Neo4j": ("Method", "uses", "A native graph database designed to store and query relational network nodes."),
            "LangGraph": ("Method", "uses", "A library for building stateful, multi-actor agent applications with graphs."),
            "Accuracy": ("Concept", "addresses", "Performance metric representing percentage of correct predictions."),
            "F1-score": ("Concept", "addresses", "Harmonic mean of precision and recall capturing class balance."),
            "ImageNet": ("Dataset", "evaluated_on", "Large visual database used for training computer vision classifiers."),
            "SQuAD": ("Dataset", "evaluated_on", "Stanford Question Answering Dataset containing reading comprehension pairs."),
            "GLUE": ("Dataset", "evaluated_on", "General Language Understanding Evaluation benchmark suite for NLP models."),
            "WMT": ("Dataset", "evaluated_on", "Workshop on Machine Translation benchmark datasets for translation models."),
            "Adam Optimizer": ("Method", "uses", "An adaptive learning rate optimization algorithm for neural networks."),
            "Fine-tuning": ("Method", "uses", "Adapting pre-trained models on specialized downstream data tasks."),
            "Pre-training": ("Method", "uses", "Initial model training phase on massive corpus datasets to learn representations."),
            "Sparsity": ("Concept", "addresses", "Pruning model weights or activations to reduce parameters and latency."),
            "Quantization": ("Method", "uses", "Reducing numerical precision of model weights (e.g. FP32 to INT8) for speed."),
            "Distillation": ("Method", "uses", "Training smaller student models to copy behaviors of large teacher models.")
        }
        
        found_terms = 0
        for kw, (kw_type, rel, kw_desc) in keywords.items():
            if kw.lower() in combined_text.lower():
                kw_id = kw.replace(" ", "_").lower()
                
                if not any(n.id == kw_id for n in nodes):
                    nodes.append(GraphNode(
                        id=kw_id,
                        label=kw,
                        type=kw_type,
                        description=kw_desc
                    ))
                
                edges.append(GraphEdge(
                    source=doc_id,
                    target=kw_id,
                    relationship=rel
                ))
                found_terms += 1
                
        if found_terms == 0:
            default_concepts = [
                ("Research Methodology", "Methodological design and framework details parsed from the paper."),
                ("Empirical Evaluation", "Experimental setup, quantitative benchmarks, and comparative metrics."),
                ("Statistical Findings", "Statistical findings, numerical summaries, and model performances.")
            ]
            for concept, desc in default_concepts:
                c_id = concept.replace(" ", "_").lower()
                if not any(n.id == c_id for n in nodes):
                    nodes.append(GraphNode(
                        id=c_id,
                        label=concept,
                        type="Concept",
                        description=desc
                    ))
                edges.append(GraphEdge(
                    source=doc_id,
                    target=c_id,
                    relationship="addresses"
                ))
                
    return ConceptGraph(nodes=nodes, edges=edges)

def extract_concept_graph(sources: List[str], vector_store: VectorStore = None) -> ConceptGraph:
    """
    Extracts a network of concepts, models, datasets, and authors from the selected papers.
    """
    if not vector_store:
        vector_store = VectorStore()

    if not sources:
        return ConceptGraph(nodes=[], edges=[])

    try:
        # We want a summary/intro part of all papers to capture the key concepts without overflowing token limits
        papers_data = []
        for source in sources:
            chunks = vector_store.get_document_chunks(source)
            if chunks:
                summary_chunks = chunks[:3]
                if len(chunks) > 3:
                    summary_chunks.append(chunks[-1])
                text = "\n\n".join(summary_chunks)
                papers_data.append(f"--- START OF PAPER: {source} ---\n{text}\n--- END OF PAPER: {source} ---")

        combined_text = "\n\n".join(papers_data)
        prompt = GRAPH_EXTRACTION_TEMPLATE.format(text=combined_text)
        
        json_response = generate_json(prompt, ConceptGraph)
        return ConceptGraph.model_validate_json(json_response)
    except Exception as e:
        print(f"Error generating concept graph from LLM, using local fallback: {e}")
        return extract_concept_graph_fallback(sources, vector_store, str(e))

def generate_vis_js_html(graph: ConceptGraph) -> str:
    """
    Generates an HTML string that uses Vis.js to draw an interactive network graph
    with a dual-pane dashboard containing details sidebar, search, legend, and controls.
    Clicking a node expands it dynamically, branching a floating description card off of it.
    """
    nodes_list = []
    edges_list = []
    
    color_map = {
        "Paper": "#6366f1",       # Indigo
        "Model": "#06b6d4",       # Cyan
        "Method": "#10b981",      # Emerald
        "Dataset": "#f59e0b",     # Amber
        "Concept": "#a855f7",     # Purple
        "Author": "#ec4899"       # Pink
    }
    
    for node in graph.nodes:
        node_color = color_map.get(node.type, "#94a3b8")
        if node.id == "api_quota_warning":
            node_color = "#ef4444" # red warning
        nodes_list.append({
            "id": node.id,
            "label": node.label,
            "title": f"Type: {node.type}",
            "color": node_color,
            "font": {"color": "#ffffff"},
            "description": getattr(node, "description", "") or "No details available."
        })
        
    for edge in graph.edges:
        edges_list.append({
            "from": edge.source,
            "to": edge.target,
            "label": edge.relationship,
            "arrows": "to",
            "color": {"color": "#64748b", "highlight": "#818cf8"}
        })
        
    nodes_json = json.dumps(nodes_list)
    edges_json = json.dumps(edges_list)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
        <style type="text/css">
            body {{
                margin: 0;
                padding: 0;
                background-color: #0f172a;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #e2e8f0;
            }}
            #container {{
                display: flex;
                flex-direction: row;
                height: 520px;
                width: 100%;
                border: 1px solid #334155;
                border-radius: 12px;
                overflow: hidden;
            }}
            #mynetwork {{
                flex: 3;
                height: 100%;
                background-color: #0b0f19;
                position: relative;
            }}
            #sidebar {{
                flex: 1;
                min-width: 270px;
                background-color: #1e293b;
                border-left: 1px solid #334155;
                padding: 1.25rem;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }}
            #search-box {{
                display: flex;
                gap: 6px;
            }}
            #search-input {{
                flex: 1;
                background-color: #0f172a;
                border: 1px solid #475569;
                border-radius: 6px;
                color: #f8fafc;
                padding: 8px 10px;
                font-size: 0.85rem;
                outline: none;
            }}
            #search-input:focus {{
                border-color: #6366f1;
            }}
            #btn-search, #btn-reset {{
                background-color: #6366f1;
                border: none;
                border-radius: 6px;
                color: #ffffff;
                padding: 8px 14px;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                transition: background-color 0.2s;
            }}
            #btn-search:hover, #btn-reset:hover {{
                background-color: #4f46e5;
            }}
            #btn-reset {{
                background-color: #475569;
                width: 100%;
                margin-top: auto;
            }}
            #btn-reset:hover {{
                background-color: #334155;
            }}
            #legend {{
                position: absolute;
                top: 15px;
                left: 15px;
                background: rgba(15, 23, 42, 0.85);
                border: 1px solid #334155;
                border-radius: 8px;
                padding: 10px;
                z-index: 10;
                font-size: 0.75rem;
                display: flex;
                flex-direction: column;
                gap: 6px;
                backdrop-filter: blur(4px);
            }}
            .legend-item {{
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            .legend-color {{
                width: 12px;
                height: 12px;
                border-radius: 50%;
                display: inline-block;
            }}
            h3, h4 {{
                margin: 0;
            }}
            .default-text {{
                color: #94a3b8;
                font-style: italic;
                font-size: 0.85rem;
                text-align: center;
                margin: auto 0;
            }}
        </style>
    </head>
    <body>
    <div id="container">
        <div id="mynetwork">
            <div id="legend">
                <div class="legend-item"><span class="legend-color" style="background-color: #6366f1;"></span>Paper</div>
                <div class="legend-item"><span class="legend-color" style="background-color: #06b6d4;"></span>Model</div>
                <div class="legend-item"><span class="legend-color" style="background-color: #10b981;"></span>Method</div>
                <div class="legend-item"><span class="legend-color" style="background-color: #f59e0b;"></span>Dataset</div>
                <div class="legend-item"><span class="legend-color" style="background-color: #a855f7;"></span>Concept</div>
                <div class="legend-item"><span class="legend-color" style="background-color: #ec4899;"></span>Author</div>
                <div class="legend-item"><span class="legend-color" style="background-color: #ef4444;"></span>Warning</div>
            </div>
        </div>
        <div id="sidebar">
            <div id="search-box">
                <input type="text" id="search-input" placeholder="Search concept..." onkeypress="handleKeyPress(event)">
                <button id="btn-search" onclick="searchNode()">Go</button>
            </div>
            <div id="detail-content" style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; gap: 1rem; overflow-y: auto;">
                <p class="default-text">Click on any node in the graph to view details and expand its contents.</p>
            </div>
            <button id="btn-reset" onclick="resetCamera()">Reset Camera</button>
        </div>
    </div>
    <script type="text/javascript">
        var nodesArray = {nodes_json};
        var edgesArray = {edges_json};
        
        var nodes = new vis.DataSet(nodesArray);
        var edges = new vis.DataSet(edgesArray);
        var container = document.getElementById('mynetwork');
        var data = {{
            nodes: nodes,
            edges: edges
        }};
        var options = {{
            nodes: {{
                shape: 'dot',
                size: 20,
                shadow: true,
                font: {{
                    size: 14,
                    face: 'Helvetica',
                    color: '#f8fafc'
                }},
                borderWidth: 2,
                borderWidthSelected: 4
            }},
            edges: {{
                width: 2.5,
                shadow: true,
                font: {{
                    size: 11,
                    color: '#94a3b8',
                    align: 'top'
                }},
                arrows: {{
                    to: {{enabled: true, scaleFactor: 0.6}}
                }}
            }},
            physics: {{
                barnesHut: {{
                    gravitationalConstant: -2000,
                    centralGravity: 0.2,
                    springLength: 120,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.35
                }},
                maxVelocity: 45,
                minVelocity: 0.1,
                solver: 'barnesHut',
                stabilization: {{
                    enabled: true,
                    iterations: 600,
                    updateInterval: 100,
                    fit: true
                }}
            }}
        }};
        var network = new vis.Network(container, data, options);
        
        // Build maps for interactive lookups
        const nodeMap = {{}};
        nodesArray.forEach(n => {{
            nodeMap[n.id] = n;
        }});

        const adjList = {{}};
        nodesArray.forEach(n => {{
            adjList[n.id] = {{ incoming: [], outgoing: [] }};
        }});
        edgesArray.forEach(e => {{
            if (adjList[e.from]) {{
                adjList[e.from].outgoing.push({{ to: e.to, rel: e.label }});
            }}
            if (adjList[e.to]) {{
                adjList[e.to].incoming.push({{ from: e.from, rel: e.label }});
            }}
        }});
        
        network.on("selectNode", function (params) {{
            var selectedNodeId = params.nodes[0];
            
            // If they clicked on a description node itself, do nothing
            if (selectedNodeId.toString().startsWith("desc_")) {{
                return;
            }}
            
            showNodeDetails(selectedNodeId);
            toggleNodeExpansion(selectedNodeId);
        }});
        
        network.on("click", function(params) {{
            // Collapse descriptions and reset sidebar if clicked on empty canvas space
            if (params.nodes.length === 0) {{
                collapseAllDescriptions();
                showDefaultSidebar();
            }}
        }});
        
        function showDefaultSidebar() {{
            document.getElementById("detail-content").innerHTML = `
                <p class="default-text">Click on any node in the graph to view details and expand its contents.</p>
            `;
        }}
        
        function selectNodeById(nodeId) {{
            // Filter out desc nodes
            if (nodeId.toString().startsWith("desc_")) return;
            
            network.selectNodes([nodeId]);
            showNodeDetails(nodeId);
            toggleNodeExpansion(nodeId);
            network.focus(nodeId, {{
                scale: 1.1,
                animation: {{
                    duration: 500,
                    easingFunction: "easeInOutQuad"
                }}
            }});
        }}
        
        function toggleNodeExpansion(nodeId) {{
            var descNodeId = "desc_" + nodeId;
            var edgeId = "edge_desc_" + nodeId;
            
            // Check if description node already exists
            if (nodes.get(descNodeId)) {{
                // Collapse: remove description node
                nodes.remove(descNodeId);
                edges.remove(edgeId);
            }} else {{
                var parentNode = nodeMap[nodeId];
                var descText = parentNode ? parentNode.description : "No details available.";
                
                // Add description block
                nodes.add({{
                    id: descNodeId,
                    label: descText,
                    shape: 'box',
                    color: {{
                        background: '#1e293b',
                        border: parentNode ? parentNode.color : '#6366f1',
                        highlight: {{ background: '#0f172a', border: parentNode ? parentNode.color : '#6366f1' }}
                    }},
                    font: {{ color: '#e2e8f0', size: 12, face: 'Helvetica' }},
                    widthConstraint: {{ maximum: 200 }},
                    shadow: true,
                    margin: 10
                }});
                
                // Add dashed connection edge
                edges.add({{
                    id: edgeId,
                    from: nodeId,
                    to: descNodeId,
                    dashes: true,
                    width: 1.5,
                    color: {{ color: '#94a3b8' }},
                    arrows: {{ to: {{ enabled: false }} }}
                }});
            }}
        }}
        
        function collapseAllDescriptions() {{
            var allNodes = nodes.get();
            var toRemove = [];
            allNodes.forEach(n => {{
                if (n.id && n.id.toString().startsWith("desc_")) {{
                    toRemove.push(n.id);
                }}
            }});
            if (toRemove.length > 0) {{
                nodes.remove(toRemove);
            }}
        }}
        
        function showNodeDetails(nodeId) {{
            const node = nodeMap[nodeId];
            if (!node) return;
            
            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="background-color: ${{node.color}}; color:#ffffff; padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold; text-transform:uppercase;">
                        ${{node.title ? node.title.replace('Type: ', '') : 'Concept'}}
                    </span>
                </div>
                <h3 style="margin-top:0.25rem; margin-bottom:0.5rem; color:#f8fafc; font-size:1.25rem; font-weight:700;">${{node.label}}</h3>
                <p style="font-size:0.9rem; color:#cbd5e1; line-height:1.4; background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:6px; border-left:3px solid ${{node.color}}; margin-top:0.5rem; margin-bottom:1rem;">
                    ${{node.description}}
                </p>
            `;
            
            // Add outgoing connections
            const outgoing = adjList[nodeId].outgoing;
            if (outgoing.length > 0) {{
                html += `
                    <div style="margin-bottom:1rem;">
                        <h4 style="margin-top:0; margin-bottom:0.5rem; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em;">Connected Concepts (Outgoing)</h4>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                `;
                outgoing.forEach(edge => {{
                    const dest = nodeMap[edge.to];
                    if (dest) {{
                        html += `
                            <div style="background-color:rgba(255,255,255,0.03); border:1px solid #334155; padding:6px 10px; border-radius:6px; font-size:0.85rem; cursor:pointer;" onclick="selectNodeById('${{edge.to}}')">
                                <span style="color:#94a3b8;">— ${{edge.rel}} →</span> <strong style="color:${{dest.color}};">${{dest.label}}</strong>
                            </div>
                        `;
                    }}
                }});
                html += `</div></div>`;
            }}
            
            // Add incoming connections
            const incoming = adjList[nodeId].incoming;
            if (incoming.length > 0) {{
                html += `
                    <div>
                        <h4 style="margin-top:0; margin-bottom:0.5rem; color:#94a3b8; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em;">Referenced By (Incoming)</h4>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                `;
                incoming.forEach(edge => {{
                    const src = nodeMap[edge.from];
                    if (src) {{
                        html += `
                            <div style="background-color:rgba(255,255,255,0.03); border:1px solid #334155; padding:6px 10px; border-radius:6px; font-size:0.85rem; cursor:pointer;" onclick="selectNodeById('${{edge.from}}')">
                                <strong style="color:${{src.color}};">${{src.label}}</strong> <span style="color:#94a3b8;">— ${{edge.rel}} →</span>
                            </div>
                        `;
                    }}
                }});
                html += `</div></div>`;
            }}
            
            if (outgoing.length === 0 && incoming.length === 0) {{
                html += `<p style="font-size:0.85rem; color:#94a3b8; font-style:italic;">No active relationships connected.</p>`;
            }}
            
            document.getElementById("detail-content").innerHTML = html;
        }}
        
        function searchNode() {{
            const query = document.getElementById("search-input").value.toLowerCase().trim();
            if (!query) return;
            
            const match = nodesArray.find(n => n.label.toLowerCase().includes(query));
            if (match) {{
                selectNodeById(match.id);
            }} else {{
                alert("Concept not found: " + query);
            }}
        }}
        
        function handleKeyPress(e) {{
            if (e.key === 'Enter') {{
                searchNode();
            }}
        }}
        
        function resetCamera() {{
            network.fit({{
                animation: {{
                    duration: 800,
                    easingFunction: "easeInOutQuad"
                }}
            }});
            collapseAllDescriptions();
            showDefaultSidebar();
            network.unselectAll();
        }}
    </script>
    </body>
    </html>
    """
    return html
