import os
from typing import List, Dict, Any
from backend.config import settings

class Neo4jService:
    def __init__(self):
        self.uri = settings.NEO4J_URI
        self.user = settings.NEO4J_USER
        self.password = settings.NEO4J_PASSWORD
        self.driver = None
        self.is_active = False

        if not self.uri or not self.password:
            print("[Neo4j] Configuration not set (NEO4J_URI or NEO4J_PASSWORD is empty). Graph database inactive.")
            return

        try:
            from neo4j import GraphDatabase
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            # Test connection
            self.driver.verify_connectivity()
            self.is_active = True
            print("[Neo4j] Connected to database successfully.")
            # Initialize database constraints/indices
            self._init_db()
        except Exception as e:
            print(f"[Neo4j] Connection failed: {e}. Falling back to NetworkX.")
            self.is_active = False

    def close(self):
        if self.driver:
            self.driver.close()

    def _init_db(self):
        """Creates indexes for efficient merges."""
        if not self.is_active or not self.driver:
            return
        
        queries = [
            "CREATE CONSTRAINT paper_filename IF NOT EXISTS FOR (p:Paper) REQUIRE p.filename IS UNIQUE",
            "CREATE CONSTRAINT author_name IF NOT EXISTS FOR (a:Author) REQUIRE a.name IS UNIQUE",
            "CREATE CONSTRAINT concept_name IF NOT EXISTS FOR (c:Concept) REQUIRE c.name IS UNIQUE",
            "CREATE CONSTRAINT dataset_name IF NOT EXISTS FOR (d:Dataset) REQUIRE d.name IS UNIQUE"
        ]
        
        with self.driver.session() as session:
            for q in queries:
                try:
                    session.run(q)
                except Exception:
                    pass # Ignore if constraints are already created or unsupported in local version

    def clear_database(self):
        """Clears all nodes and relationships."""
        if not self.is_active or not self.driver:
            return
        
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
            print("[Neo4j] Database cleared.")

    def add_paper_nodes(self, title: str, filename: str, authors: List[str], concepts: List[str], datasets: List[str]):
        """Creates a Paper node and connects it to Authors, Concepts, and Datasets."""
        if not self.is_active or not self.driver:
            return

        cypher = """
        MERGE (p:Paper {filename: $filename})
        SET p.title = $title
        
        WITH p
        UNWIND $authors AS authorName
        MERGE (a:Author {name: authorName})
        MERGE (p)-[:AUTHORED_BY]->(a)
        
        WITH p
        UNWIND $concepts AS conceptName
        MERGE (c:Concept {name: conceptName})
        MERGE (p)-[:MENTIONS_CONCEPT]->(c)
        
        WITH p
        UNWIND $datasets AS datasetName
        MERGE (d:Dataset {name: datasetName})
        MERGE (p)-[:EVALUATED_ON]->(d)
        """

        # Filter out empty entries
        authors = [a.strip() for a in authors if a.strip()]
        concepts = [c.strip() for c in concepts if c.strip()]
        datasets = [d.strip() for d in datasets if d.strip()]

        with self.driver.session() as session:
            try:
                session.run(
                    cypher,
                    title=title,
                    filename=filename,
                    authors=authors if authors else ["Unknown"],
                    concepts=concepts if concepts else ["Research"],
                    datasets=datasets if datasets else ["N/A"]
                )
                print(f"[Neo4j] Successfully indexed paper: {filename}")
            except Exception as e:
                print(f"[Neo4j] Failed to write paper node: {e}")

    def query_concept_network(self) -> Dict[str, Any]:
        """Retrieves nodes and edges for visualization matching Vis.js format."""
        if not self.is_active or not self.driver:
            return {"nodes": [], "edges": []}

        nodes_query = "MATCH (n) RETURN id(n) as id, labels(n)[0] as label, coalesce(n.title, n.name) as name"
        edges_query = "MATCH (n)-[r]->(m) RETURN id(n) as source, id(m) as target, type(r) as relationship"

        nodes = []
        edges = []

        with self.driver.session() as session:
            try:
                # Retrieve nodes
                nodes_res = session.run(nodes_query)
                for record in nodes_res:
                    node_type = record["label"]
                    # Color coding based on type
                    color = "#3b82f6" # default blue
                    if node_type == "Paper":
                        color = "#38bdf8" # Light blue
                    elif node_type == "Author":
                        color = "#a78bfa" # Violet
                    elif node_type == "Concept":
                        color = "#f472b6" # Pink
                    elif node_type == "Dataset":
                        color = "#34d399" # Green

                    nodes.append({
                        "id": record["id"],
                        "label": record["name"],
                        "title": f"Type: {node_type}",
                        "color": color
                    })

                # Retrieve edges
                edges_res = session.run(edges_query)
                for record in edges_res:
                    edges.append({
                        "from": record["source"],
                        "to": record["target"],
                        "label": record["relationship"]
                    })
            except Exception as e:
                print(f"[Neo4j] Query network failed: {e}")

        return {"nodes": nodes, "edges": edges}

    def run_graph_reasoning(self, filename: str) -> Dict[str, Any]:
        """
        Executes graph queries to discover:
        1. Co-cited or co-dataset papers.
        2. Concepts related through a secondary paper.
        """
        if not self.is_active or not self.driver:
            return {}

        # Query to find papers that share same dataset or concepts
        query = """
        MATCH (p:Paper {filename: $filename})
        MATCH (p)-[:EVALUATED_ON|MENTIONS_CONCEPT]->(common)<-[:EVALUATED_ON|MENTIONS_CONCEPT]-(other:Paper)
        WHERE p <> other
        RETURN other.title as title, labels(common)[0] as type, common.name as shared_node
        LIMIT 5
        """
        
        relationships = []
        with self.driver.session() as session:
            try:
                res = session.run(query, filename=filename)
                for r in res:
                    relationships.append({
                        "paper": r["title"],
                        "type": r["type"],
                        "shared": r["shared_node"]
                    })
            except Exception as e:
                print(f"[Neo4j] Graph reasoning query failed: {e}")
                
        return {
            "target_paper": filename,
            "shared_connections": relationships
        }

    def extract_and_index_paper(self, filename: str, full_text: str):
        """Asks Gemini to extract title, authors, concepts, and datasets from paper text and logs them into Neo4j."""
        if not self.is_active:
            return
        
        from pydantic import BaseModel, Field
        from llm.gemini import generate_json
        
        class ExtractedGraphMetadata(BaseModel):
            title: str = Field(description="The formal title of the paper")
            authors: List[str] = Field(description="List of author names (full names, e.g. 'Ashish Vaswani')")
            concepts: List[str] = Field(description="List of key techniques, architectures, models, or algorithms discussed (e.g. 'Transformer', 'Self-Attention')")
            datasets: List[str] = Field(description="List of datasets used for training or evaluation (e.g. 'WMT 2014', 'GLUE')")

        prompt = (
            "You are a scientific metadata extraction bot. Extract the formal title, author list, key concepts/models, "
            "and datasets from the following research paper text. Return the output in the requested JSON structure.\n\n"
            f"--- START OF PAPER TEXT ---\n{full_text[:8000]}\n--- END OF PAPER TEXT ---"
        )
        
        try:
            json_response = generate_json(prompt, ExtractedGraphMetadata)
            metadata = ExtractedGraphMetadata.model_validate_json(json_response)
            self.add_paper_nodes(
                title=metadata.title,
                filename=filename,
                authors=metadata.authors,
                concepts=metadata.concepts,
                datasets=metadata.datasets
            )
        except Exception as e:
            print(f"[Neo4j] LLM extraction and indexing failed: {e}")

