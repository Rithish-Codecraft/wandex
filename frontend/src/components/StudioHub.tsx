import React, { useState } from 'react';
import { Headphones, Presentation, Play, Pause, ChevronLeft, ChevronRight, Loader2, Volume2, Sparkles, CheckSquare, Square } from 'lucide-react';

interface Document {
  source: string;
  title: string;
  author: string;
}

interface DialogueTurn {
  speaker: string; // 'Host A' | 'Host B'
  text: string;
}

interface PodcastData {
  title: string;
  script: {
    title: string;
    dialogue: DialogueTurn[];
  };
  filename: string;
}

interface SlideItem {
  title: string;
  bullets: string[];
  visual_suggestion: string;
}

interface SlideshowDeck {
  presentation_title: string;
  slides: SlideItem[];
}

interface StudioHubProps {
  documents: Document[];
}

const StudioHub: React.FC<StudioHubProps> = ({ documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(documents.map(d => d.source));
  const [activeSubTab, setActiveSubTab] = useState<'podcast' | 'slides'>('podcast');
  const [audioLoading, setAudioLoading] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(false);
  
  // Podcast states
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Slides states
  const [deck, setDeck] = useState<SlideshowDeck | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Toggle document selection
  const toggleDocSelect = (source: string) => {
    setSelectedDocs(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleGeneratePodcast = async () => {
    if (selectedDocs.length === 0) return;
    setAudioLoading(true);
    try {
      const res = await fetch('/api/studio/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedDocs }),
      });
      const data = await res.json();
      if (res.ok) {
        setPodcast(data);
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = `/static/${data.filename}`;
        }
      } else {
        alert(data.detail || 'Failed to synthesize podcast overview.');
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleGenerateSlides = async () => {
    if (selectedDocs.length === 0) return;
    setSlidesLoading(true);
    try {
      const res = await fetch('/api/studio/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedDocs }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeck(data);
        setCurrentSlideIndex(0);
      } else {
        alert(data.detail || 'Failed to generate presentation deck.');
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setSlidesLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Audio play failed', err);
      });
    }
  };

  const handlePrevSlide = () => {
    if (!deck) return;
    setCurrentSlideIndex(prev => (prev > 0 ? prev - 1 : deck.slides.length - 1));
  };

  const handleNextSlide = () => {
    if (!deck) return;
    setCurrentSlideIndex(prev => (prev < deck.slides.length - 1 ? prev + 1 : 0));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">🎙️ The Studio</h1>
        <p className="page-subtitle">Turn your papers into professional podcasts, structured presentation slide decks, and visual executive overviews.</p>
      </div>

      {/* Sub-tab selection bar */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveSubTab('podcast')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: activeSubTab === 'podcast' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeSubTab === 'podcast' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Headphones size={18} />
          Audio Overviews (Podcast)
        </button>

        <button 
          onClick={() => setActiveSubTab('slides')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: activeSubTab === 'slides' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeSubTab === 'slides' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Presentation size={18} />
          Presentation Slides
        </button>
      </div>

      <div className="bento-grid">
        {/* Source Checklist Drawer */}
        <div className="glass-card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>📋 Select Studio Sources</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '250px' }}>
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

          {activeSubTab === 'podcast' ? (
            <button 
              className="btn-primary" 
              onClick={handleGeneratePodcast} 
              disabled={audioLoading || selectedDocs.length === 0}
              style={{ width: '100%', marginTop: 'auto' }}
            >
              {audioLoading ? (
                <>
                  <Loader2 className="nav-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>Synthesizing Audio (gTTS)...</span>
                </>
              ) : (
                <>
                  <Volume2 size={16} />
                  <span>Generate Audio Overview</span>
                </>
              )}
            </button>
          ) : (
            <button 
              className="btn-primary" 
              onClick={handleGenerateSlides} 
              disabled={slidesLoading || selectedDocs.length === 0}
              style={{ width: '100%', marginTop: 'auto' }}
            >
              {slidesLoading ? (
                <>
                  <Loader2 className="nav-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>Designing Slides...</span>
                </>
              ) : (
                <>
                  <Presentation size={16} />
                  <span>Generate Slides Deck</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Studio Workspace Area */}
        <div className="glass-card" style={{ gridColumn: 'span 8', minHeight: '450px', display: 'flex', flexDirection: 'column' }}>
          {activeSubTab === 'podcast' ? (
            podcast ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '1rem' }}>{podcast.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Host A & Host B Dialogue overview podcast</p>
                  </div>

                  <button 
                    onClick={togglePlayback}
                    style={{ 
                      width: '45px', 
                      height: '45px', 
                      borderRadius: '50%', 
                      border: 'none', 
                      backgroundColor: 'var(--accent-primary)', 
                      color: '#fff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer' 
                    }}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '3px' }} />}
                  </button>

                  <audio 
                    ref={audioRef} 
                    src={`/static/${podcast.filename}`}
                    onEnded={() => setIsPlaying(false)}
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Episode Transcript</h4>
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                    {podcast.script.dialogue.map((turn, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '0.25rem',
                          alignSelf: turn.speaker === 'Host A' ? 'flex-start' : 'flex-end',
                          maxWidth: '80%',
                          backgroundColor: turn.speaker === 'Host A' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(6, 182, 212, 0.08)',
                          border: turn.speaker === 'Host A' ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid rgba(6, 182, 212, 0.15)',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px'
                        }}
                      >
                        <strong style={{ fontSize: '0.75rem', color: turn.speaker === 'Host A' ? '#a5b4fc' : '#22d3ee' }}>
                          {turn.speaker}
                        </strong>
                        <p style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.4' }}>{turn.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', color: 'var(--text-secondary)' }}>
                <Headphones size={48} style={{ color: 'var(--text-muted)' }} />
                <div style={{ textAlign: 'center' }}>
                  <h3>Audio Podcasting Studio</h3>
                  <p style={{ maxWidth: '400px', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Select your document sources on the left panel, and click Generate to run the podcast script synthesis and TTS engine.
                  </p>
                </div>
              </div>
            )
          ) : (
            deck ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>🎥 {deck.presentation_title}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Slide {currentSlideIndex + 1} of {deck.slides.length}</span>
                </div>

                {/* Slides viewer card */}
                <div 
                  style={{ 
                    flex: 1, 
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '12px',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '260px',
                    position: 'relative'
                  }}
                >
                  <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '1.5rem', fontFamily: 'var(--font-header)' }}>
                    {deck.slides[currentSlideIndex].title}
                  </h2>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.25rem', color: '#cbd5e1' }}>
                    {deck.slides[currentSlideIndex].bullets.map((bullet, idx) => (
                      <li key={idx} style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{bullet}</li>
                    ))}
                  </ul>
                </div>

                {/* Visual design layout suggestion card */}
                <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.15)', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Sparkles size={18} style={{ color: '#22d3ee', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h5 style={{ color: '#22d3ee', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Visual suggestion</h5>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>{deck.slides[currentSlideIndex].visual_suggestion}</p>
                  </div>
                </div>

                {/* Slide controls footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <button onClick={handlePrevSlide} className="btn-primary" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button onClick={handleNextSlide} className="btn-primary" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', color: 'var(--text-secondary)' }}>
                <Presentation size={48} style={{ color: 'var(--text-muted)' }} />
                <div style={{ textAlign: 'center' }}>
                  <h3>Presentation Slide Deck Studio</h3>
                  <p style={{ maxWidth: '400px', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Select your document sources on the left panel, and click Generate to lay out a structured slide deck presentation summarizing the concepts.
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioHub;
