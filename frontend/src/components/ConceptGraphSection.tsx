import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { Network } from 'vis-network';
import { Search, RotateCcw, HelpCircle, X, ChevronRight, ChevronDown, CheckSquare, Square, Loader2 } from 'lucide-react';

interface Document {
  source: string;
  title: string;
  author: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: string; // 'Paper' | 'Model' | 'Method' | 'Dataset' | 'Concept' | 'Author'
  description: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

interface ConceptGraphSectionProps {
  documents: Document[];
}

const TYPE_COLORS: Record<string, string> = {
  Paper: '#6366f1',    // Indigo
  Model: '#06b6d4',    // Cyan
  Method: '#10b981',   // Emerald
  Dataset: '#f59e0b',  // Amber
  Concept: '#f43f5e',  // Rose
  Author: '#a855f7',   // Purple
};

const ConceptGraphSection: React.FC<ConceptGraphSectionProps> = ({ documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(documents.map(d => d.source));
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  // Toggle document selection
  const toggleDocSelect = (source: string) => {
    setSelectedDocs(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleGenerateGraph = async () => {
    if (selectedDocs.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/research/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedDocs }),
      });
      const data = await res.json();
      if (res.ok) {
        setGraphData(data.graph);
        setSelectedNode(null);
        setIsSidebarOpen(false);
      } else {
        alert(data.detail || 'Failed to generate concept graph.');
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Build the network graph once data is loaded
  useEffect(() => {
    if (!graphData || !containerRef.current) return;

    // Map the backend nodes to vis.js structure
    const visNodes = graphData.nodes.map(node => ({
      id: node.id,
      label: node.label,
      title: node.description,
      color: {
        background: TYPE_COLORS[node.type] || '#64748b',
        border: 'rgba(255, 255, 255, 0.2)',
        highlight: {
          background: '#ffffff',
          border: TYPE_COLORS[node.type] || '#64748b'
        }
      },
      font: {
        color: '#f8fafc',
        size: 14,
        face: 'var(--font-sans)'
      },
      shape: 'dot',
      size: node.type === 'Paper' ? 24 : 16,
      borderWidth: 2,
    }));

    // Map edges to vis.js structure
    const visEdges = graphData.edges.map(edge => ({
      from: edge.source,
      to: edge.target,
      label: edge.relationship,
      arrows: {
        to: { enabled: true, scaleFactor: 0.5 }
      },
      font: {
        color: '#94a3b8',
        size: 10,
        face: 'var(--font-sans)',
        strokeWidth: 0,
        align: 'middle'
      },
      color: {
        color: 'rgba(148, 163, 184, 0.3)',
        highlight: 'rgba(99, 102, 241, 0.8)',
        hover: 'rgba(99, 102, 241, 0.8)'
      },
      width: 1.5,
      smooth: {
        enabled: true,
        type: 'dynamic',
        roundness: 0.5
      }
    }));

    const options = {
      nodes: {
        scaling: {
          min: 10,
          max: 30
        }
      },
      edges: {
        smooth: true
      },
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08,
          avoidOverlap: 0.8
        },
        stabilization: {
          iterations: 150
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        navigationButtons: false,
        zoomView: true
      }
    };

    // Instantiate vis-network
    const network = new Network(containerRef.current, { nodes: visNodes, edges: visEdges }, options);
    networkRef.current = network;

    // Network Event Handlers
    network.on('selectNode', (params: any) => {
      if (params.nodes && params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const matched = graphData.nodes.find(n => n.id === nodeId);
        if (matched) {
          setSelectedNode(matched);
          setIsSidebarOpen(true);
        }
      }
    });

    network.on('deselectNode', () => {
      setSelectedNode(null);
      setIsSidebarOpen(false);
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [graphData]);

  // Handle Search Zoom/Snap
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!networkRef.current || !graphData || !searchQuery) return;

    const query = searchQuery.toLowerCase();
    const matchedNode = graphData.nodes.find(
      n => n.label.toLowerCase().includes(query) || n.description.toLowerCase().includes(query)
    );

    if (matchedNode) {
      networkRef.current.focus(matchedNode.id, {
        scale: 1.4,
        animation: {
          duration: 800,
          easingFunction: 'easeInOutQuad'
        }
      });
      networkRef.current.selectNodes([matchedNode.id]);
      setSelectedNode(matchedNode);
      setIsSidebarOpen(true);
    } else {
      alert('No matching node found.');
    }
  };

  const handleResetCamera = () => {
    if (networkRef.current) {
      networkRef.current.fit({
        animation: {
          duration: 800,
          easingFunction: 'easeInOutQuad'
        }
      });
    }
  };

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className="page-header">
        <h1 className="page-title">🕸️ Concept Graph Explorer</h1>
        <p className="page-subtitle">Extract key methodologies, concepts, datasets, and systems from papers and interact with them in a live network visualization.</p>
      </div>

      <div className="bento-grid" style={{ flex: 1, minHeight: '550px' }}>
        {/* Document selector column */}
        {!graphData && (
          <div className="glass-card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3>📋 Select Graph Sources</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Identify papers to feed into the graph relationships algorithm.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '300px', margin: '0.5rem 0' }}>
              {documents.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Please ingest files first.</p>
              ) : (
                documents.map((doc) => (
                  <div 
                    key={doc.source}
                    onClick={() => toggleDocSelect(doc.source)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      backgroundColor: selectedDocs.includes(doc.source) ? 'rgba(99,102,241,0.08)' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {selectedDocs.includes(doc.source) ? (
                      <CheckSquare size={16} style={{ color: 'var(--accent-primary)' }} />
                    ) : (
                      <Square size={16} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.title}>
                      {doc.title}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button 
              className="btn-primary" 
              onClick={handleGenerateGraph} 
              disabled={loading || selectedDocs.length === 0}
              style={{ width: '100%', marginTop: 'auto' }}
            >
              {loading ? (
                <>
                  <Loader2 className="nav-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>Analyzing Graph Nodes...</span>
                </>
              ) : (
                <span>Generate Concept Graph</span>
              )}
            </button>
          </div>
        )}

        {/* Graph display canvas panel */}
        <div 
          className="glass-card" 
          style={{ 
            gridColumn: graphData ? 'span 12' : 'span 8', 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            padding: 0,
            overflow: 'hidden',
            minHeight: '500px'
          }}
        >
          {graphData ? (
            <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
              {/* Vis.js Canvas Element */}
              <div 
                ref={containerRef} 
                style={{ flex: 1, height: '100%', background: '#090d16' }}
              />

              {/* Float Controls Overlay */}
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.25rem' }}>
                  <input 
                    type="text" 
                    placeholder="Search node..." 
                    className="input-field" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '0.4rem 0.75rem', width: '180px', fontSize: '0.8rem' }}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '0.4rem' }}>
                    <Search size={14} />
                  </button>
                </form>

                <button onClick={handleResetCamera} className="btn-primary" style={{ padding: '0.4rem', backgroundColor: 'var(--bg-tertiary)' }} title="Reset Camera">
                  <RotateCcw size={14} />
                </button>

                <button onClick={() => setShowLegend(!showLegend)} className="btn-primary" style={{ padding: '0.4rem', backgroundColor: 'var(--bg-tertiary)' }} title="Toggle Legend">
                  <HelpCircle size={14} />
                </button>
              </div>

              {/* Legends overlay */}
              {showLegend && (
                <div 
                  className="glass-card" 
                  style={{ 
                    position: 'absolute', 
                    bottom: '1rem', 
                    left: '1rem', 
                    zIndex: 10, 
                    padding: '0.75rem 1rem', 
                    backgroundColor: 'rgba(11,15,25,0.85)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.4rem' 
                  }}
                >
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Node Types</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    {Object.entries(TYPE_COLORS).map(([type, color]) => (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }}></span>
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Right collapsible details panel / drawer */}
              {isSidebarOpen && selectedNode && (
                <div 
                  className="glass-card" 
                  style={{ 
                    position: 'absolute', 
                    right: 0, 
                    top: 0, 
                    bottom: 0, 
                    width: '320px', 
                    zIndex: 20, 
                    borderRadius: 0, 
                    borderLeft: '1px solid var(--border-glass)', 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '1.5rem',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span 
                      style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold', 
                        textTransform: 'uppercase', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        backgroundColor: TYPE_COLORS[selectedNode.type], 
                        color: '#fff' 
                      }}
                    >
                      {selectedNode.type}
                    </span>
                    <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#fff' }}>{selectedNode.label}</h3>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Description</h4>
                      <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.4' }}>{selectedNode.description || 'No description available for this node.'}</p>
                    </div>

                    {/* Collapsible nodes drawer content list */}
                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Workspace Context</h4>
                      
                      {graphData.nodes.slice(0, 5).map(node => (
                        <div key={node.id} style={{ border: '1px solid var(--border-glass)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div 
                            onClick={() => toggleNodeExpand(node.id)}
                            style={{ 
                              padding: '0.5rem 0.75rem', 
                              backgroundColor: 'rgba(255,255,255,0.02)', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: TYPE_COLORS[node.type] }}></span>
                              <strong>{node.label}</strong>
                            </div>
                            {expandedNodes[node.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                          
                          {expandedNodes[node.id] && (
                            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderTop: '1px solid var(--border-glass)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }}>
                              {node.description || 'No detail metadata parsed.'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', marginTop: 'auto', backgroundColor: 'var(--bg-tertiary)' }}
                    onClick={() => {
                      setGraphData(null);
                      setSelectedNode(null);
                      setIsSidebarOpen(false);
                    }}
                  >
                    Close Graph
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2rem', gap: '1rem', color: 'var(--text-secondary)' }}>
              <HelpCircle size={48} style={{ color: 'var(--text-muted)' }} />
              <div style={{ textAlign: 'center' }}>
                <h3>Concept Graph Visualizer</h3>
                <p style={{ maxWidth: '400px', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Please select your source documents on the left panel and click <strong>Generate Concept Graph</strong> to build the node network.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConceptGraphSection;
