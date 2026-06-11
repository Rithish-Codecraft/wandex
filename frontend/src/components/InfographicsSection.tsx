import React, { useState } from 'react';
import { Download, Sparkles, CheckSquare, Square, Loader2 } from 'lucide-react';

interface Document {
  source: string;
  title: string;
  author: string;
}

interface StatItem {
  value: string;
  label: string;
  emoji?: string;
}

interface TakeawayItem {
  title: string;
  detail: string;
  emoji?: string;
}

interface TimelineMilestone {
  milestone: string;
  description: string;
  emoji?: string;
}

interface BentoTile {
  title: string;
  content: string;
  importance: string;
  emoji?: string;
}

interface MindMapNode {
  concept: string;
  relations: string[];
}

interface InfographicReport {
  title: string;
  subtitle: string;
  topic_domain?: string;
  topic_emoji?: string;
  key_stats: StatItem[];
  takeaways: TakeawayItem[];
  timeline: TimelineMilestone[];
  bento_tiles: BentoTile[];
  mind_map_nodes: MindMapNode[];
}

interface InfographicsSectionProps {
  documents: Document[];
}

const INFOGRAPHIC_STYLES = [
  "Clean Corporate",
  "Cyberpunk",
  "Bento Grid View",
  "Anime Dream",
  "Sketch Board",
  "Minimalist Red",
  "Retro Terminal"
];

// Topic-domain → decorative SVG illustration mapping
const TOPIC_ILLUSTRATIONS: Record<string, React.ReactNode> = {
  'Machine Learning': (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', opacity: 0.18 }}>
      <circle cx="100" cy="60" r="22" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="40" cy="30" r="12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="160" cy="30" r="12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="40" cy="90" r="12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="160" cy="90" r="12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="52" y1="35" x2="78" y2="50" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="148" y1="35" x2="122" y2="50" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="52" y1="85" x2="78" y2="70" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="148" y1="85" x2="122" y2="70" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="100" cy="60" r="6" fill="currentColor"/>
      <circle cx="40" cy="30" r="4" fill="currentColor" opacity="0.7"/>
      <circle cx="160" cy="30" r="4" fill="currentColor" opacity="0.7"/>
      <circle cx="40" cy="90" r="4" fill="currentColor" opacity="0.7"/>
      <circle cx="160" cy="90" r="4" fill="currentColor" opacity="0.7"/>
    </svg>
  ),
  'Astrophysics': (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', opacity: 0.18 }}>
      <circle cx="100" cy="60" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
      <circle cx="100" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4"/>
      <circle cx="100" cy="60" r="12" fill="currentColor" opacity="0.5"/>
      <circle cx="150" cy="60" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="150" cy="60" r="2.5" fill="currentColor"/>
      <circle cx="60" cy="25" r="3" fill="currentColor" opacity="0.6"/>
      <circle cx="175" cy="20" r="2" fill="currentColor" opacity="0.5"/>
      <circle cx="20" cy="80" r="2" fill="currentColor" opacity="0.5"/>
      <circle cx="185" cy="95" r="1.5" fill="currentColor" opacity="0.4"/>
      <line x1="100" y1="30" x2="100" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    </svg>
  ),
  'Quantum Physics': (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', opacity: 0.18 }}>
      <ellipse cx="100" cy="60" rx="70" ry="25" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <ellipse cx="100" cy="60" rx="70" ry="25" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(60 100 60)"/>
      <ellipse cx="100" cy="60" rx="70" ry="25" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(120 100 60)"/>
      <circle cx="100" cy="60" r="9" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  'Cybersecurity': (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', opacity: 0.18 }}>
      <path d="M100 10 L160 35 L160 70 Q160 100 100 115 Q40 100 40 70 L40 35 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M100 30 L140 47 L140 70 Q140 90 100 102 Q60 90 60 70 L60 47 Z" fill="currentColor" opacity="0.15"/>
      <line x1="80" y1="62" x2="95" y2="77" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="95" y1="77" x2="120" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  'Additive Manufacturing': (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', opacity: 0.18 }}>
      <rect x="60" y="80" width="80" height="8" fill="currentColor" opacity="0.5"/>
      <rect x="65" y="70" width="70" height="8" fill="currentColor" opacity="0.45"/>
      <rect x="70" y="60" width="60" height="8" fill="currentColor" opacity="0.4"/>
      <rect x="75" y="50" width="50" height="8" fill="currentColor" opacity="0.35"/>
      <rect x="80" y="40" width="40" height="8" fill="currentColor" opacity="0.3"/>
      <rect x="85" y="30" width="30" height="8" fill="currentColor" opacity="0.25"/>
      <line x1="100" y1="15" x2="100" y2="28" stroke="currentColor" strokeWidth="2"/>
      <polygon points="92,20 108,20 100,10" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  'Cosmology': (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', opacity: 0.18 }}>
      <path d="M10 60 Q55 20 100 60 Q145 100 190 60" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 60 Q55 100 100 60 Q145 20 190 60" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="100" cy="60" r="18" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="20" cy="15" r="3" fill="currentColor" opacity="0.5"/>
      <circle cx="180" cy="15" r="2" fill="currentColor" opacity="0.4"/>
      <circle cx="30" cy="100" r="2.5" fill="currentColor" opacity="0.45"/>
      <circle cx="170" cy="105" r="2" fill="currentColor" opacity="0.4"/>
    </svg>
  ),
  'Time Series': (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', opacity: 0.18 }}>
      <polyline points="10,90 35,70 60,80 85,45 110,55 135,25 160,40 190,20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="10" y1="10" x2="10" y2="100" stroke="currentColor" strokeWidth="1.5"/>
      {[35,60,85,110,135,160].map((x,i) => <line key={i} x1={x} y1="98" x2={x} y2="102" stroke="currentColor" strokeWidth="1.5"/>)}
    </svg>
  ),
  default: (
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', opacity: 0.18 }}>
      <circle cx="100" cy="60" r="40" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="100" cy="60" r="25" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
      <circle cx="100" cy="60" r="8" fill="currentColor" opacity="0.5"/>
      <line x1="100" y1="20" x2="100" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <line x1="60" y1="60" x2="140" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <circle cx="100" cy="20" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="100" cy="100" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="60" cy="60" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="140" cy="60" r="4" fill="currentColor" opacity="0.5"/>
    </svg>
  )
};

function getTopicIllustration(domain: string | undefined): React.ReactNode {
  if (!domain) return TOPIC_ILLUSTRATIONS['default'];
  const key = Object.keys(TOPIC_ILLUSTRATIONS).find(k =>
    k !== 'default' && domain.toLowerCase().includes(k.toLowerCase())
  );
  return TOPIC_ILLUSTRATIONS[key ?? 'default'];
}

const getThemeStyles = (theme: string) => {
  switch (theme) {
    case "Cyberpunk":
      return { bg: '#03001e', text: '#ffffff', accent: '#ec008c', cardBg: '#140a28', borderColor: '#ec008c', fontFamily: 'monospace' };
    case "Bento Grid View":
      return { bg: '#0f172a', text: '#cbd5e1', accent: '#38bdf8', cardBg: '#1e293b', borderColor: 'rgba(255,255,255,0.08)', fontFamily: 'sans-serif' };
    case "Anime Dream":
      return { bg: '#fdf2f8', text: '#1e293b', accent: '#ec4899', cardBg: '#ffffff', borderColor: '#f472b6', fontFamily: 'sans-serif' };
    case "Sketch Board":
      return { bg: '#fffbeb', text: '#451a03', accent: '#d97706', cardBg: '#fffdf5', borderColor: '#f59e0b', fontFamily: 'serif' };
    case "Minimalist Red":
      return { bg: '#000000', text: '#ffffff', accent: '#ef4444', cardBg: '#141414', borderColor: '#3f3f46', fontFamily: 'sans-serif' };
    case "Retro Terminal":
      return { bg: '#050505', text: '#22c55e', accent: '#4ade80', cardBg: '#0a0a0a', borderColor: '#22c55e', fontFamily: 'monospace' };
    default:
      return { bg: '#f8fafc', text: '#1e293b', accent: '#0d9488', cardBg: '#ffffff', borderColor: '#cbd5e1', fontFamily: 'sans-serif' };
  }
};

// Fallback emojis by category index
const STAT_EMOJIS = ['📊', '⚡', '🎯'];
const TAKEAWAY_EMOJIS = ['💡', '🔬', '📈', '🧠'];
const TIMELINE_EMOJIS = ['🚀', '🔭', '⚙️', '🏆'];
const TILE_EMOJIS = ['🧩', '📐', '🔋', '🌐', '🎛️'];

const InfographicsSection: React.FC<InfographicsSectionProps> = ({ documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(documents.map(d => d.source));
  const [selectedStyle, setSelectedStyle] = useState("Clean Corporate");
  const [loading, setLoading] = useState(false);
  const [infographicData, setInfographicData] = useState<InfographicReport | null>(null);
  const [pngFilename, setPngFilename] = useState("");
  const [previewMode, setPreviewMode] = useState<'png' | 'html'>('html');

  const toggleDocSelect = (source: string) => {
    setSelectedDocs(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleGenerateInfographic = async () => {
    if (selectedDocs.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/studio/infographic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedDocs, style: selectedStyle }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfographicData(data.data);
        setPngFilename(data.filename);
      } else {
        alert(data.detail || 'Failed to generate infographic.');
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPNG = () => {
    if (!pngFilename) return;
    const a = document.createElement('a');
    a.href = `/static/${pngFilename}`;
    a.download = pngFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const t = getThemeStyles(selectedStyle);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">🎨 Visual Infographics</h1>
        <p className="page-subtitle">Translate dense research data into beautiful posters, bento layout grids, and chronological milestones.</p>
      </div>

      <div className="bento-grid">
        {/* Left Column: Controls */}
        <div className="glass-card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3>📋 Infographic Architect</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Visual Theme:</label>
            <select
              value={selectedStyle}
              onChange={e => setSelectedStyle(e.target.value)}
              className="input-field"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              {INFOGRAPHIC_STYLES.map(style => (
                <option key={style} value={style} style={{ backgroundColor: 'var(--bg-secondary)' }}>{style}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Sources:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '200px' }}>
              {documents.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Please ingest files first.</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.source}
                    onClick={() => toggleDocSelect(doc.source)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      cursor: 'pointer', padding: '0.5rem', borderRadius: '6px',
                      backgroundColor: selectedDocs.includes(doc.source) ? 'rgba(99,102,241,0.08)' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {selectedDocs.includes(doc.source) ? (
                      <CheckSquare size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    ) : (
                      <Square size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.title}>
                      {doc.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleGenerateInfographic}
            disabled={loading || selectedDocs.length === 0}
            style={{ width: '100%', marginTop: 'auto' }}
          >
            {loading ? (
              <>
                <Loader2 className="nav-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
                <span>Designing Canvas...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Compile Visual Infographic</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Display */}
        <div className="glass-card" style={{ gridColumn: 'span 8', minHeight: '500px', display: 'flex', flexDirection: 'column', padding: infographicData ? '1rem' : '1.5rem' }}>
          {infographicData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

              {/* Mode Tabs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setPreviewMode('html')}
                    className="btn-primary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: previewMode === 'html' ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }}
                  >
                    🖥️ Live HTML View
                  </button>
                  <button
                    onClick={() => setPreviewMode('png')}
                    className="btn-primary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: previewMode === 'png' ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }}
                  >
                    🖼️ Image Poster (PNG)
                  </button>
                </div>
                {previewMode === 'png' && (
                  <button onClick={handleDownloadPNG} className="btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                    <Download size={14} /> Download
                  </button>
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', maxHeight: '600px' }}>
                {previewMode === 'png' ? (
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <img
                      src={`/static/${pngFilename}`}
                      alt="Generated Infographic"
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                    />
                  </div>
                ) : (
                  /* ── LIVE HTML PREVIEW ─────────────────────────── */
                  <div style={{
                    width: '100%', maxWidth: '680px',
                    backgroundColor: t.bg, color: t.text,
                    fontFamily: t.fontFamily, borderRadius: '16px',
                    border: `1px solid ${t.borderColor}`,
                    overflow: 'hidden',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                    transition: 'all 0.3s'
                  }}>

                    {/* ── HERO BANNER with topic illustration ── */}
                    <div style={{
                      position: 'relative', padding: '2rem 2rem 1.5rem',
                      background: `linear-gradient(135deg, ${t.accent}22 0%, ${t.bg} 100%)`,
                      borderBottom: `2px solid ${t.accent}`,
                      overflow: 'hidden'
                    }}>
                      {/* Decorative SVG illustration behind the text */}
                      <div style={{
                        position: 'absolute', right: '-10px', top: '-10px',
                        width: '220px', height: '130px', color: t.accent, pointerEvents: 'none'
                      }}>
                        {getTopicIllustration(infographicData.topic_domain)}
                      </div>

                      {/* Topic emoji badge */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        backgroundColor: `${t.accent}22`, border: `1px solid ${t.accent}44`,
                        borderRadius: '20px', padding: '0.2rem 0.6rem',
                        fontSize: '0.7rem', color: t.accent, marginBottom: '0.75rem',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        <span style={{ fontSize: '1rem' }}>{infographicData.topic_emoji ?? '🔬'}</span>
                        {infographicData.topic_domain ?? 'Research'}
                      </div>

                      <h1 style={{ color: t.accent, fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '0.35rem', position: 'relative' }}>
                        {infographicData.title}
                      </h1>
                      <p style={{ opacity: 0.75, fontSize: '0.875rem', position: 'relative' }}>
                        {infographicData.subtitle}
                      </p>
                    </div>

                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                      {/* ── KEY METRICS ── */}
                      <section>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: t.accent, letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
                          📐 Key Metrics
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
                          {infographicData.key_stats.slice(0, 3).map((stat, idx) => (
                            <div key={idx} style={{
                              backgroundColor: t.cardBg,
                              border: `1px solid ${t.borderColor}`,
                              borderRadius: '10px', padding: '1rem',
                              textAlign: 'center',
                              boxShadow: `0 0 0 1px ${t.accent}11`
                            }}>
                              <div style={{ fontSize: '1.75rem', marginBottom: '0.2rem' }}>
                                {stat.emoji ?? STAT_EMOJIS[idx]}
                              </div>
                              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: t.accent }}>
                                {stat.value}
                              </div>
                              <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '0.2rem' }}>
                                {stat.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* ── CORE TAKEAWAYS ── */}
                      <section>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: t.accent, letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
                          💡 Core Takeaways
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {infographicData.takeaways.slice(0, 4).map((item, idx) => (
                            <div key={idx} style={{
                              backgroundColor: t.cardBg,
                              border: `1px solid ${t.borderColor}`,
                              borderLeft: `3px solid ${t.accent}`,
                              borderRadius: '8px', padding: '0.75rem 1rem',
                              display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                            }}>
                              <span style={{ fontSize: '1.3rem', flexShrink: 0, lineHeight: 1 }}>
                                {item.emoji ?? TAKEAWAY_EMOJIS[idx]}
                              </span>
                              <div>
                                <strong style={{ fontSize: '0.85rem', color: t.accent, display: 'block' }}>
                                  {item.title}
                                </strong>
                                <p style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '0.15rem', lineHeight: 1.5 }}>
                                  {item.detail}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* ── TIMELINE ── */}
                      <section>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: t.accent, letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
                          🗓️ Milestone Chronology
                        </div>
                        <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                          {/* vertical spine */}
                          <div style={{ position: 'absolute', left: '9px', top: '8px', bottom: '8px', width: '2px', backgroundColor: `${t.accent}55`, borderRadius: '2px' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {infographicData.timeline.slice(0, 4).map((m, idx) => (
                              <div key={idx} style={{ position: 'relative' }}>
                                {/* dot */}
                                <div style={{
                                  position: 'absolute', left: '-26px', top: '2px',
                                  width: '20px', height: '20px', borderRadius: '50%',
                                  backgroundColor: t.cardBg,
                                  border: `2px solid ${t.accent}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.7rem'
                                }}>
                                  {m.emoji ?? TIMELINE_EMOJIS[idx]}
                                </div>
                                <strong style={{ fontSize: '0.85rem', color: t.accent }}>
                                  {m.milestone}
                                </strong>
                                <p style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '0.15rem', lineHeight: 1.5 }}>
                                  {m.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      {/* ── BENTO TILES ── */}
                      {infographicData.bento_tiles?.length > 0 && (
                        <section>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: t.accent, letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
                            🧩 Concept Matrix
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.65rem' }}>
                            {infographicData.bento_tiles.slice(0, 5).map((tile, idx) => {
                              const isLarge = tile.importance === 'large';
                              return (
                                <div key={idx} style={{
                                  gridColumn: isLarge ? 'span 2' : 'span 1',
                                  backgroundColor: t.cardBg,
                                  border: `1px solid ${t.borderColor}`,
                                  borderRadius: '10px', padding: '1rem',
                                  position: 'relative', overflow: 'hidden'
                                }}>
                                  {/* watermark emoji behind tile content */}
                                  <div style={{
                                    position: 'absolute', right: '8px', bottom: '4px',
                                    fontSize: '2.5rem', opacity: 0.06, userSelect: 'none', lineHeight: 1
                                  }}>
                                    {tile.emoji ?? TILE_EMOJIS[idx % TILE_EMOJIS.length]}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>
                                      {tile.emoji ?? TILE_EMOJIS[idx % TILE_EMOJIS.length]}
                                    </span>
                                    <h4 style={{ fontSize: '0.85rem', color: t.accent, fontWeight: 700, margin: 0 }}>
                                      {tile.title}
                                    </h4>
                                  </div>
                                  <p style={{ fontSize: '0.75rem', opacity: 0.85, lineHeight: 1.5, margin: 0 }}>
                                    {tile.content}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      )}

                      {/* ── MIND MAP (tag cloud style) ── */}
                      {infographicData.mind_map_nodes?.length > 0 && (
                        <section>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: t.accent, letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
                            🕸️ Concept Connections
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {infographicData.mind_map_nodes.flatMap((node, ni) => [
                              <span key={`core-${ni}`} style={{
                                backgroundColor: t.accent, color: t.bg,
                                borderRadius: '20px', padding: '0.25rem 0.65rem',
                                fontSize: '0.78rem', fontWeight: 700
                              }}>
                                {node.concept}
                              </span>,
                              ...node.relations.slice(0, 3).map((rel, ri) => (
                                <span key={`rel-${ni}-${ri}`} style={{
                                  backgroundColor: t.cardBg,
                                  border: `1px solid ${t.accent}55`,
                                  color: t.text, borderRadius: '20px',
                                  padding: '0.25rem 0.6rem', fontSize: '0.73rem', opacity: 0.9
                                }}>
                                  {rel}
                                </span>
                              ))
                            ])}
                          </div>
                        </section>
                      )}

                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '3.5rem', opacity: 0.4 }}>🎨</div>
              <div style={{ textAlign: 'center' }}>
                <h3>Visual Infographics Studio</h3>
                <p style={{ maxWidth: '400px', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Choose a style theme, select your source papers, and click <strong>Compile</strong> to generate a rich emoji-decorated infographic with topic illustrations.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfographicsSection;
