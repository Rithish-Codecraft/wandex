import React, { useState, useEffect, useRef } from 'react';
import { Upload, Link, Search, Trash2, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface Document {
  source: string;
  title: string;
  author: string;
}

interface SourcesSectionProps {
  documents: Document[];
  onRefreshDocs: () => void;
}

const SourcesSection: React.FC<SourcesSectionProps> = ({ documents, onRefreshDocs }) => {
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; message: string }>({ type: null, message: '' });
  const [urlInput, setUrlInput] = useState('');
  const [arxivQuery, setArxivQuery] = useState('');
  const [arxivLimit, setArxivLimit] = useState(5);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll arXiv task status if active
  useEffect(() => {
    if (!activeTaskId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/search-index/status/${activeTaskId}`);
        if (res.ok) {
          const data = await res.json();
          setTaskStatus(data.status);
          if (data.status === 'completed') {
            setActiveTaskId(null);
            setUploadStatus({ type: 'success', message: 'arXiv papers imported successfully!' });
            onRefreshDocs();
          } else if (data.status === 'failed') {
            setActiveTaskId(null);
            setUploadStatus({ type: 'error', message: `arXiv import failed: ${data.message || 'Unknown error'}` });
          }
        }
      } catch (err) {
        console.error('Error polling arXiv task status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeTaskId, onRefreshDocs]);

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus({ type: 'loading', message: `Uploading ${files[0].name}...` });
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus({ type: 'success', message: data.message || 'File uploaded successfully!' });
        onRefreshDocs();
      } else {
        setUploadStatus({ type: 'error', message: data.detail || 'Upload failed.' });
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: `Connection error: ${err.message}` });
    }
  };

  // Handle URL import
  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUploadStatus({ type: 'loading', message: 'Importing web URL...' });
    try {
      const res = await fetch('/api/documents/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus({ type: 'success', message: data.message || 'URL imported successfully!' });
        setUrlInput('');
        onRefreshDocs();
      } else {
        setUploadStatus({ type: 'error', message: data.detail || 'URL import failed.' });
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: `Connection error: ${err.message}` });
    }
  };

  // Handle arXiv search
  const handleArxivSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arxivQuery.trim()) return;

    setUploadStatus({ type: 'loading', message: 'Triggering background arXiv search...' });
    try {
      const res = await fetch('/api/documents/search-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: arxivQuery, limit: arxivLimit }),
      });

      const data = await res.json();
      if (res.ok) {
        setActiveTaskId(data.task_id);
        setTaskStatus('started');
        setUploadStatus({ type: 'loading', message: 'Indexing arXiv papers in the background...' });
        setArxivQuery('');
      } else {
        setUploadStatus({ type: 'error', message: data.detail || 'arXiv search failed.' });
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: `Connection error: ${err.message}` });
    }
  };

  // Handle delete document
  const handleDeleteDoc = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      const res = await fetch(`/api/documents/${filename}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setUploadStatus({ type: 'success', message: `Successfully deleted ${filename}` });
        onRefreshDocs();
      } else {
        const data = await res.json();
        setUploadStatus({ type: 'error', message: data.detail || 'Failed to delete file.' });
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: `Connection error: ${err.message}` });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">📂 Document Ingestion Workspace</h1>
        <p className="page-subtitle">Upload research papers, scrap web articles, or pull directly from arXiv to build your knowledge base.</p>
      </div>

      {uploadStatus.type && (
        <div className={`glass-card`} style={{ 
          borderLeft: `4px solid ${
            uploadStatus.type === 'success' ? 'var(--accent-emerald)' : 
            uploadStatus.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-primary)'
          }`,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem'
        }}>
          {uploadStatus.type === 'success' && <CheckCircle style={{ color: 'var(--accent-emerald)' }} />}
          {uploadStatus.type === 'error' && <AlertCircle style={{ color: 'var(--accent-rose)' }} />}
          {uploadStatus.type === 'loading' && <Loader className="nav-icon" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--accent-primary)' }} />}
          <div>
            <p style={{ fontWeight: 600 }}>
              {uploadStatus.type === 'success' ? 'Action Completed' : 
               uploadStatus.type === 'error' ? 'Error Encountered' : 'Processing...'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {uploadStatus.message} {activeTaskId && `[Task Status: ${taskStatus}]`}
            </p>
          </div>
        </div>
      )}

      <div className="bento-grid">
        {/* Card 1: Ingestion Methods */}
        <div className="glass-card" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3>📥 Add Research Sources</h3>
          
          {/* File Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>LOCAL FILE UPLOAD</label>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              style={{ display: 'none' }}
              accept=".pdf,.docx,.csv,.txt,.mp3,.wav,.mp4,.avi,.jpg,.png" 
            />
            <button 
              className="btn-primary" 
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', height: '80px', flexDirection: 'column', border: '2px dashed var(--border-glass)', background: 'transparent' }}
            >
              <Upload size={24} />
              <span>Select PDF, Word, CSV, Audio, Video, or Image</span>
            </button>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid var(--border-glass)' }} />

          {/* Scrape URL */}
          <form onSubmit={handleUrlImport} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>IMPORT WEB ARTICLE URL</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="url" 
                className="input-field" 
                placeholder="https://example.com/article" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button className="btn-primary" type="submit">
                <Link size={16} /> Import
              </button>
            </div>
          </form>

          <hr style={{ border: '0', borderTop: '1px solid var(--border-glass)' }} />

          {/* arXiv Deep Research */}
          <form onSubmit={handleArxivSearch} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ARXIV DEEP RESEARCH</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Topic, e.g., 'Attention Is All You Need'" 
              value={arxivQuery}
              onChange={(e) => setArxivQuery(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Limit:</span>
                <input 
                  type="number" 
                  className="input-field" 
                  style={{ width: '60px', padding: '0.25rem 0.5rem' }} 
                  value={arxivLimit} 
                  min={1} 
                  max={20}
                  onChange={(e) => setArxivLimit(parseInt(e.target.value) || 5)}
                />
              </div>
              <button className="btn-primary" type="submit" disabled={!!activeTaskId}>
                <Search size={16} /> Search & Index
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Sources List */}
        <div className="glass-card" style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>📂 Indexed Documents ({documents.length})</h3>
            <button className="btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={onRefreshDocs}>Refresh</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '420px', paddingRight: '0.5rem' }}>
            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', margin: 'auto' }}>
                No documents uploaded yet. Ingest sources to start analyzing!
              </p>
            ) : (
              documents.map((doc, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <FileText size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.title}>
                        {doc.title}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        File: {doc.source} | Author: {doc.author || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-rose)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    onClick={() => handleDeleteDoc(doc.source)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Keyframes spin style inside this file */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SourcesSection;
