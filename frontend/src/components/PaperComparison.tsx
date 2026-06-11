import React, { useState } from 'react';
import { Columns, CheckSquare, Square, Loader, ArrowRightLeft } from 'lucide-react';

interface Document {
  source: string;
  title: string;
  author: string;
}

interface PaperComparisonRow {
  paper_name: string;
  model_architecture: string;
  methodology: string;
  datasets: string;
  metrics: string;
  limitations: string;
}

interface ComparisonMatrix {
  comparison_rows: PaperComparisonRow[];
  overall_synthesis: string;
}

interface PaperComparisonProps {
  documents: Document[];
}

const PaperComparison: React.FC<PaperComparisonProps> = ({ documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(documents.map(d => d.source));
  const [loading, setLoading] = useState(false);
  const [matrix, setMatrix] = useState<ComparisonMatrix | null>(null);

  // Toggle selection
  const toggleDocSelect = (source: string) => {
    setSelectedDocs(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  // Run comparison
  const handleCompare = async () => {
    if (selectedDocs.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/research/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedDocs }),
      });

      const data = await res.json();
      if (res.ok) {
        setMatrix(data);
      } else {
        alert(data.detail || 'Failed to compare papers.');
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
        <h1 className="page-title">📊 Side-by-Side Paper Comparison</h1>
        <p className="page-subtitle">Select multiple documents to generate a structured comparison matrix across architecture, datasets, and performance.</p>
      </div>

      <div className="bento-grid">
        {/* Left selector card */}
        <div className="glass-card" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>📋 Choose Papers</h3>
          
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
            onClick={handleCompare} 
            disabled={loading || selectedDocs.length === 0}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <Loader className="nav-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
                <span>Comparing...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft size={16} />
                <span>Compare Selected</span>
              </>
            )}
          </button>
        </div>

        {/* Right matrix table card */}
        <div className="glass-card" style={{ gridColumn: 'span 9', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflow: 'hidden' }}>
          <h3>📊 Comparison Matrix</h3>
          
          <div style={{ flex: 1, overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
            {matrix && matrix.comparison_rows && matrix.comparison_rows.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--accent-primary)', width: '20%' }}>FEATURE</th>
                    {matrix.comparison_rows.map((row, idx) => (
                      <th key={idx} style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-primary)', width: `${80 / matrix.comparison_rows.length}%` }}>
                        {row.paper_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>CORE MODEL</td>
                    {matrix.comparison_rows.map((row, idx) => (
                      <td key={idx} style={{ padding: '1rem', fontSize: '0.9rem', lineHeight: '1.4' }}>{row.model_architecture}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>METHODOLOGY</td>
                    {matrix.comparison_rows.map((row, idx) => (
                      <td key={idx} style={{ padding: '1rem', fontSize: '0.9rem', lineHeight: '1.4' }}>{row.methodology}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>DATASETS</td>
                    {matrix.comparison_rows.map((row, idx) => (
                      <td key={idx} style={{ padding: '1rem', fontSize: '0.9rem', lineHeight: '1.4' }}>{row.datasets}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>METRICS</td>
                    {matrix.comparison_rows.map((row, idx) => (
                      <td key={idx} style={{ padding: '1rem', fontSize: '0.9rem', lineHeight: '1.4', color: 'var(--accent-cyan)', fontWeight: 600 }}>{row.metrics}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: 'none' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>LIMITATIONS</td>
                    {matrix.comparison_rows.map((row, idx) => (
                      <td key={idx} style={{ padding: '1rem', fontSize: '0.9rem', lineHeight: '1.4', color: 'var(--accent-rose)' }}>{row.limitations}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', gap: '0.5rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                <Columns size={32} style={{ color: 'var(--text-muted)' }} />
                <p>No comparison generated. Select papers and click Compare.</p>
              </div>
            )}
          </div>

          {matrix && matrix.overall_synthesis && (
            <div style={{ 
              marginTop: '1rem', 
              backgroundColor: 'rgba(99, 102, 241, 0.03)', 
              border: '1px dashed var(--accent-primary)', 
              borderRadius: '8px', 
              padding: '1.25rem' 
            }}>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Synthesis</h4>
              <p style={{ fontSize: '0.92rem', lineHeight: '1.5', color: '#cbd5e1' }}>{matrix.overall_synthesis}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperComparison;
