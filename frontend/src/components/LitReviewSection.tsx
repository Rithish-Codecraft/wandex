import React, { useState } from 'react';
import { BookOpen, Download, CheckSquare, Square, Loader } from 'lucide-react';

interface Document {
  source: string;
  title: string;
  author: string;
}

interface LitReviewSectionProps {
  documents: Document[];
}

// Simple custom Markdown to HTML parser
const parseMarkdown = (md: string): string => {
  if (!md) return '';
  let html = md;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Unordered list items
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  // Wrap li tags in ul tags (rough, but enough for basic Markdown)
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  // Clean up adjacent ul tags
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  // Line breaks
  html = html.replace(/\n/g, '<br />');
  
  return html;
};

const LitReviewSection: React.FC<LitReviewSectionProps> = ({ documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(documents.map(d => d.source));
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [reviewContent, setReviewContent] = useState<string | null>(null);
  const [reviewFilename, setReviewFilename] = useState('');

  // Toggle document selection
  const toggleDocSelect = (source: string) => {
    setSelectedDocs(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  // Run sequential agent literature review
  const handleGenerateReview = async () => {
    if (selectedDocs.length === 0) return;

    setLoading(true);
    setProgressMsg('Research Agent searching literature database...');
    
    // Simulate multi-agent steps sequence for user visual feedback
    const timers = [
      setTimeout(() => setProgressMsg('Reading Agent analyzing and chunking papers...'), 2500),
      setTimeout(() => setProgressMsg('Critique Agent detecting contradictions and checking consistency...'), 5000),
      setTimeout(() => setProgressMsg('Writing Agent compiling literature review chapters...'), 7500)
    ];

    try {
      const res = await fetch('/api/research/lit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedDocs }),
      });

      timers.forEach(clearTimeout);
      const data = await res.json();
      if (res.ok) {
        setReviewContent(data.content);
        setReviewFilename(data.filepath.split(/[\\/]/).pop() || 'literature_review.md');
      } else {
        alert(data.detail || 'Failed to generate literature review.');
      }
    } catch (err: any) {
      timers.forEach(clearTimeout);
      alert(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  // Trigger file download locally
  const handleDownloadReview = () => {
    if (!reviewContent) return;
    const blob = new Blob([reviewContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = reviewFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">📝 Auto-Discover Literature Review</h1>
        <p className="page-subtitle">Coordinate Research, Reading, Critique, and Writing Agents to compile a deep, structured literature review.</p>
      </div>

      <div className="bento-grid">
        {/* Left: Document Selector */}
        <div className="glass-card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>📋 Select Review Sources</h3>
          
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
            onClick={handleGenerateReview} 
            disabled={loading || selectedDocs.length === 0}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <Loader className="nav-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
                <span>Generating Review...</span>
              </>
            ) : (
              <>
                <BookOpen size={16} />
                <span>Compile Literature Review</span>
              </>
            )}
          </button>
          
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              <div style={{ width: '100%', height: '4px', background: 'var(--border-glass)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', height: '100%', width: '40%', background: 'var(--accent-primary)', borderRadius: '2px', animation: 'progress-shimmer 2s infinite ease-in-out' }}></div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontStyle: 'italic', textAlign: 'center' }}>
                {progressMsg}
              </p>
            </div>
          )}
        </div>

        {/* Right: Compiled Review View */}
        <div className="glass-card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>📖 Literature Review Document</h3>
            {reviewContent && (
              <button className="btn-primary" onClick={handleDownloadReview} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                <Download size={14} /> Download Review (.md)
              </button>
            )}
          </div>

          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '1.5rem', overflowY: 'auto', maxHeight: '500px' }}>
            {reviewContent ? (
              <div className="prose" dangerouslySetInnerHTML={{ __html: parseMarkdown(reviewContent) }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                <BookOpen size={32} style={{ color: 'var(--text-muted)' }} />
                <p>No literature review has been generated yet. Select files and click Generate.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress-shimmer {
          0% { left: -40%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LitReviewSection;
