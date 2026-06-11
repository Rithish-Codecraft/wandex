import React, { useState } from 'react';
import { Search, CheckSquare, Square, Loader, HelpCircle, Lightbulb, Compass, Award } from 'lucide-react';

interface Document {
  source: string;
  title: string;
  author: string;
}

interface ResearchGapItem {
  unexplored_area: string;
  hypothesis: string;
  experiment_suggestions: string[];
  sources: string[];
}

interface ResearchGapReport {
  gaps: ResearchGapItem[];
  summary: string;
}

interface GapDiscoveryProps {
  documents: Document[];
}

const GapDiscovery: React.FC<GapDiscoveryProps> = ({ documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(documents.map(d => d.source));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ResearchGapReport | null>(null);

  // Toggle selection
  const toggleDocSelect = (source: string) => {
    setSelectedDocs(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  // Run analysis
  const handleAnalyze = async () => {
    if (selectedDocs.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/research/gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedDocs }),
      });

      const data = await res.json();
      if (res.ok) {
        setReport(data);
      } else {
        alert(data.detail || 'Failed to analyze research gaps.');
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">🔍 Research Gap Discovery Engine</h1>
        <p className="page-subtitle">Analyze papers to identify unexplored theoretical/empirical gaps, auto-generate scientific hypotheses, and suggest experiments.</p>
      </div>

      <div className="bento-grid">
        {/* Left Selector Panel */}
        <div className="glass-card" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>📋 Choose Sources</h3>
          
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
            onClick={handleAnalyze} 
            disabled={loading || selectedDocs.length === 0}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <Loader className="nav-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Discover Gaps</span>
              </>
            )}
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="glass-card" style={{ gridColumn: 'span 9', display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '400px' }}>
          <h3>🔍 Discovery Dashboard</h3>

          {report ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Summary Statement Card */}
              <div style={{ 
                backgroundColor: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--border-glass)', 
                borderLeft: '4px solid var(--accent-cyan)',
                borderRadius: '8px', 
                padding: '1.25rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Award size={18} style={{ color: 'var(--accent-cyan)' }} />
                  <strong style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-cyan)' }}>Literature Landscape Summary</strong>
                </div>
                <p style={{ fontSize: '0.92rem', lineHeight: '1.5', color: '#cbd5e1' }}>{report.summary}</p>
              </div>

              {/* Identified Gaps Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {report.gaps.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="glass-card" 
                    style={{ 
                      padding: '1.5rem', 
                      backgroundColor: 'rgba(255,255,255,0.01)', 
                      borderColor: 'var(--border-glass)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                  >
                    {/* Unexplored Area */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Compass size={18} style={{ color: 'var(--accent-rose)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-rose)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unexplored Area</span>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {item.unexplored_area}
                      </p>
                    </div>

                    {/* Hypothesis Box */}
                    <div style={{ 
                      backgroundColor: 'rgba(99, 102, 241, 0.04)', 
                      border: '1px solid rgba(99, 102, 241, 0.2)', 
                      borderRadius: '8px', 
                      padding: '1rem' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Lightbulb size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposed Hypothesis</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#cbd5e1', fontStyle: 'italic' }}>
                        "{item.hypothesis}"
                      </p>
                    </div>

                    {/* Experiment Outline */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <HelpCircle size={16} style={{ color: 'var(--accent-emerald)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experiment Suggestions</span>
                      </div>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.25rem' }}>
                        {item.experiment_suggestions.map((exp, expIdx) => (
                          <li key={expIdx} style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                            {exp}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Paper Sources Tag Grid */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>Derived from:</span>
                      {item.sources.map((src, srcIdx) => (
                        <span key={srcIdx} style={{ 
                          fontSize: '0.72rem', 
                          backgroundColor: 'rgba(255,255,255,0.03)', 
                          border: '1px solid var(--border-glass)', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          color: 'var(--text-secondary)'
                        }}>
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
              <Lightbulb size={32} style={{ color: 'var(--text-muted)' }} />
              <p>No gap analysis generated. Select papers and click Discover Gaps.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GapDiscovery;
