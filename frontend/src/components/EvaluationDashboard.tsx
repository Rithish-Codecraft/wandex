import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, ChevronDown, ChevronUp, AlertCircle, ShieldAlert } from 'lucide-react';

interface EvalMetrics {
  answer_accuracy: number;
  citation_accuracy: number;
  retrieval_recall: number;
  hallucination_rate: number;
  explanation: string;
}

interface EvaluationRecord {
  query: string;
  answer: string;
  latency_seconds: number;
  timestamp: string;
  metrics: EvalMetrics;
}

interface EvaluationSummary {
  total_queries: number;
  avg_accuracy: number;
  avg_citation_accuracy: number;
  avg_recall: number;
  avg_hallucination_rate: number;
  avg_latency: number;
}

const EvaluationDashboard: React.FC = () => {
  const [summary, setSummary] = useState<EvaluationSummary>({
    total_queries: 0,
    avg_accuracy: 0,
    avg_citation_accuracy: 0,
    avg_recall: 0,
    avg_hallucination_rate: 0,
    avg_latency: 0,
  });
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch summary
      const summaryRes = await fetch('/api/evaluation/summary');
      const summaryData = await summaryRes.json();
      
      // Fetch history
      const historyRes = await fetch('/api/evaluation/history');
      const historyData = await historyRes.json();
      
      if (summaryRes.ok && historyRes.ok) {
        setSummary(summaryData);
        // Reverse history to show latest first
        setHistory([...historyData].reverse());
      }
    } catch (err: any) {
      console.error("Error fetching evaluations: ", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to delete all audit logs?")) return;
    try {
      const res = await fetch('/api/evaluation/clear', { method: 'POST' });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to clear evaluation history.");
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpandLog = (idx: number) => {
    setExpandedLogIdx(prev => (prev === idx ? null : idx));
  };

  // Helper to color metrics
  const getMetricColor = (val: number, isHallucination = false) => {
    if (isHallucination) {
      return val > 0.3 ? 'var(--accent-rose)' : val > 0.1 ? 'var(--accent-amber)' : 'var(--accent-emerald)';
    }
    return val >= 0.8 ? 'var(--accent-emerald)' : val >= 0.5 ? 'var(--accent-amber)' : 'var(--accent-rose)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">📊 RAG Quality & Audit Dashboard</h1>
          <p className="page-subtitle">Inspect model-as-a-judge logs evaluating answer accuracy, retrieval recall, citations validity, and latency.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={fetchData} 
            className="btn-primary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-tertiary)' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'nav-icon' : ''} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
            Refresh
          </button>
          
          <button 
            onClick={handleClearHistory} 
            className="btn-primary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.2)' }}
            disabled={history.length === 0}
          >
            <Trash2 size={14} />
            Clear Logs
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="bento-grid">
        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Queries Evaluated</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{summary.total_queries}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total queries indexed</span>
        </div>

        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Average Latency</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {summary.avg_latency}s
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>End-to-end RAG turnaround</span>
        </div>

        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Answer Accuracy</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: getMetricColor(summary.avg_accuracy) }}>
            {Math.round(summary.avg_accuracy * 100)}%
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Factual correspondence to context</span>
        </div>

        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Citation Accuracy</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: getMetricColor(summary.avg_citation_accuracy) }}>
            {Math.round(summary.avg_citation_accuracy * 100)}%
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Validity of citation source anchors</span>
        </div>

        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Retrieval Recall</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: getMetricColor(summary.avg_recall) }}>
            {Math.round(summary.avg_recall * 100)}%
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Search chunk coverage</span>
        </div>

        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Hallucination Rate</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: getMetricColor(summary.avg_hallucination_rate, true) }}>
            {Math.round(summary.avg_hallucination_rate * 100)}%
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lower percentage is better</span>
        </div>
      </div>

      {/* Audit History Log */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
        <h3>📜 RAG Audit Logs</h3>
        
        {history.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '3rem', gap: '0.5rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            <AlertCircle size={32} style={{ color: 'var(--text-muted)' }} />
            <p>No query evaluation history recorded yet. Chat with the AI assistant to log quality audits.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Query</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Latency</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Accuracy</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Citation</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Recall</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Hallucination</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, idx) => {
                  const isExpanded = expandedLogIdx === idx;
                  return (
                    <React.Fragment key={idx}>
                      <tr 
                        onClick={() => toggleExpandLog(idx)}
                        style={{ 
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border-glass)', 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{record.timestamp}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500, maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={record.query}>
                          {record.query}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--accent-cyan)' }}>{record.latency_seconds}s</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: getMetricColor(record.metrics.answer_accuracy) }}>
                          {Math.round(record.metrics.answer_accuracy * 100)}%
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: getMetricColor(record.metrics.citation_accuracy) }}>
                          {Math.round(record.metrics.citation_accuracy * 100)}%
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: getMetricColor(record.metrics.retrieval_recall) }}>
                          {Math.round(record.metrics.retrieval_recall * 100)}%
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: getMetricColor(record.metrics.hallucination_rate, true) }}>
                          {Math.round(record.metrics.hallucination_rate * 100)}%
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)' }}>
                          <td colSpan={8} style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                              <div>
                                <strong style={{ color: 'var(--text-secondary)' }}>Full Query:</strong>
                                <p style={{ color: '#fff', marginTop: '0.25rem' }}>{record.query}</p>
                              </div>
                              <div>
                                <strong style={{ color: 'var(--text-secondary)' }}>Generated RAG Answer:</strong>
                                <p style={{ color: '#cbd5e1', marginTop: '0.25rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{record.answer}</p>
                              </div>
                              <div style={{ backgroundColor: 'rgba(11, 15, 25, 0.5)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                  <ShieldAlert size={14} />
                                  <span>Evaluator Judge Explanation</span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{record.metrics.explanation}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`
        th { font-family: var(--font-header); font-weight: 600; }
        td, th { border-bottom: 1px solid transparent; }
      `}</style>
    </div>
  );
};

export default EvaluationDashboard;
