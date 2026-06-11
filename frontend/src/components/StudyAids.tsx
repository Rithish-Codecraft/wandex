import React, { useState } from 'react';
import { BookOpen, HelpCircle, Award, CheckCircle, XCircle, ChevronLeft, ChevronRight, RotateCcw, CheckSquare, Square, Loader2, Sparkles } from 'lucide-react';

interface Document {
  source: string;
  title: string;
  author: string;
}

interface FlashcardItem {
  front: string;
  back: string;
}

interface FlashcardDeck {
  deck_title: string;
  cards: FlashcardItem[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface Quiz {
  quiz_title: string;
  questions: QuizQuestion[];
}

interface StudyAidsProps {
  documents: Document[];
}

const StudyAids: React.FC<StudyAidsProps> = ({ documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(documents.map(d => d.source));
  const [activeMode, setActiveMode] = useState<'flashcards' | 'quiz'>('flashcards');
  const [cardCount, setCardCount] = useState(5);
  const [quizCount, setQuizCount] = useState(5);

  const [loading, setLoading] = useState(false);

  // Flashcards state
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({}); // question index -> selected option index
  const [showResults, setShowResults] = useState(false);

  // Toggle document selection
  const toggleDocSelect = (source: string) => {
    setSelectedDocs(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleGenerateFlashcards = async () => {
    if (selectedDocs.length === 0) return;
    setLoading(true);
    setIsFlipped(false);
    try {
      const res = await fetch('/api/study/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedDocs, count: cardCount }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeck(data);
        setCurrentCardIdx(0);
      } else {
        alert(data.detail || 'Failed to generate flashcards.');
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (selectedDocs.length === 0) return;
    setLoading(true);
    setQuizAnswers({});
    setShowResults(false);
    try {
      const res = await fetch('/api/study/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selectedDocs, count: quizCount }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuiz(data);
      } else {
        alert(data.detail || 'Failed to generate quiz.');
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Flashcard controls
  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIdx(prev => (prev > 0 ? prev - 1 : deck!.cards.length - 1));
    }, 150);
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIdx(prev => (prev < deck!.cards.length - 1 ? prev + 1 : 0));
    }, 150);
  };

  // Quiz controls
  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (showResults) return; // quiz locked
    setQuizAnswers(prev => ({
      ...prev,
      [questionIdx]: optionIdx
    }));
  };

  const handleCalculateScore = () => {
    if (!quiz) return 0;
    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_index) {
        score++;
      }
    });
    return score;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <h1 className="page-title">🧠 Interactive Study Aids</h1>
        <p className="page-subtitle">Transform research papers into dynamic learning flashcards and multiple-choice quizzes to master the subject.</p>
      </div>

      {/* Tabs bar */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveMode('flashcards')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: activeMode === 'flashcards' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeMode === 'flashcards' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <BookOpen size={18} />
          Flashcards
        </button>

        <button 
          onClick={() => setActiveMode('quiz')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: activeMode === 'quiz' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeMode === 'quiz' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <HelpCircle size={18} />
          Comprehension Quiz
        </button>
      </div>

      <div className="bento-grid">
        {/* Left pane: Options & Source Selector */}
        <div className="glass-card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>📋 Study Settings</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Number of {activeMode === 'flashcards' ? 'Cards' : 'Questions'}:
            </label>
            <input 
              type="range" 
              min={3} 
              max={15} 
              value={activeMode === 'flashcards' ? cardCount : quizCount}
              onChange={e => {
                const val = parseInt(e.target.value);
                if (activeMode === 'flashcards') setCardCount(val);
                else setQuizCount(val);
              }}
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
              {activeMode === 'flashcards' ? cardCount : quizCount} items
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Target Sources:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '200px' }}>
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
          </div>

          <button 
            className="btn-primary" 
            onClick={activeMode === 'flashcards' ? handleGenerateFlashcards : handleGenerateQuiz} 
            disabled={loading || selectedDocs.length === 0}
            style={{ width: '100%', marginTop: 'auto' }}
          >
            {loading ? (
              <>
                <Loader2 className="nav-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
                <span>Generating Materials...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate {activeMode === 'flashcards' ? 'Flashcard Deck' : 'Comprehension Quiz'}</span>
              </>
            )}
          </button>
        </div>

        {/* Right pane: Interactive View Area */}
        <div className="glass-card" style={{ gridColumn: 'span 8', minHeight: '450px', display: 'flex', flexDirection: 'column' }}>
          {activeMode === 'flashcards' ? (
            deck ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>🗂️ {deck.deck_title}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Card {currentCardIdx + 1} of {deck.cards.length}
                  </span>
                </div>

                {/* 3D Flippable Flashcard */}
                <div 
                  className={`flashcard-wrapper ${isFlipped ? 'flipped' : ''}`} 
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className="flashcard-inner">
                    <div className="flashcard-front">
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '1rem', fontWeight: 'bold' }}>Concept Question</span>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', lineHeight: '1.5' }}>
                        {deck.cards[currentCardIdx].front}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem' }}>Click to flip and reveal answer</span>
                    </div>

                    <div className="flashcard-back">
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#10b981', marginBottom: '1rem', fontWeight: 'bold' }}>Answer Key / Explanation</span>
                      <p style={{ fontSize: '1rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                        {deck.cards[currentCardIdx].back}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem' }}>Click to flip back</span>
                    </div>
                  </div>
                </div>

                {/* Navigation Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={handlePrevCard} className="btn-primary" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <ChevronLeft size={16} /> Previous
                  </button>
                  
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tip: Try to recall before flipping!</span>

                  <button onClick={handleNextCard} className="btn-primary" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', color: 'var(--text-secondary)' }}>
                <BookOpen size={48} style={{ color: 'var(--text-muted)' }} />
                <div style={{ textAlign: 'center' }}>
                  <h3>Study Flashcard Generator</h3>
                  <p style={{ maxWidth: '400px', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Select your document sources, choose slide size count, and click Generate to build interactive 3D study cards.
                  </p>
                </div>
              </div>
            )
          ) : (
            quiz ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>📝 {quiz.quiz_title}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {quiz.questions.length} questions
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '0.5rem' }}>
                  {quiz.questions.map((question, qIdx) => {
                    const selectedIdx = quizAnswers[qIdx];
                    const isCorrect = selectedIdx === question.correct_index;

                    return (
                      <div key={qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1.5rem', borderBottom: qIdx === quiz.questions.length - 1 ? 'none' : '1px solid var(--border-glass)' }}>
                        <h4 style={{ color: '#fff', fontSize: '0.95rem', lineHeight: '1.4' }}>
                          {qIdx + 1}. {question.question}
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                          {question.options.map((option, oIdx) => {
                            let optionBg = 'rgba(255,255,255,0.02)';
                            let optionBorder = '1px solid var(--border-glass)';
                            let optionColor = '#cbd5e1';

                            if (selectedIdx === oIdx) {
                              if (showResults) {
                                optionBg = isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
                                optionBorder = isCorrect ? '1px solid #10b981' : '1px solid #f43f5e';
                                optionColor = isCorrect ? '#34d399' : '#f87171';
                              } else {
                                optionBg = 'rgba(99, 102, 241, 0.15)';
                                optionBorder = '1px solid var(--accent-primary)';
                                optionColor = '#a5b4fc';
                              }
                            } else if (showResults && oIdx === question.correct_index) {
                              // Highlight correct option if user got it wrong
                              optionBg = 'rgba(16, 185, 129, 0.1)';
                              optionBorder = '1px solid rgba(16, 185, 129, 0.4)';
                              optionColor = '#34d399';
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleSelectOption(qIdx, oIdx)}
                                disabled={showResults}
                                style={{
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  backgroundColor: optionBg,
                                  border: optionBorder,
                                  color: optionColor,
                                  textAlign: 'left',
                                  fontSize: '0.85rem',
                                  cursor: showResults ? 'default' : 'pointer',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}
                              >
                                <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{String.fromCharCode(65 + oIdx)}.</span>
                                {option}
                              </button>
                            );
                          })}
                        </div>

                        {showResults && (
                          <div style={{ marginTop: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', fontWeight: 600, color: isCorrect ? '#34d399' : '#f87171' }}>
                              {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                              <span>{isCorrect ? 'Correct!' : 'Incorrect'}</span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)' }}>{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Score results card overlay */}
                {showResults ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Award size={20} style={{ color: 'var(--accent-primary)' }} />
                      <div>
                        <strong>Quiz Results</strong>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          You scored {handleCalculateScore()} out of {quiz.questions.length} correct.
                        </p>
                      </div>
                    </div>
                    <button 
                      className="btn-primary" 
                      onClick={() => {
                        setShowResults(false);
                        setQuizAnswers({});
                      }}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <RotateCcw size={14} /> Retake Quiz
                    </button>
                  </div>
                ) : (
                  <button 
                    className="btn-primary" 
                    onClick={() => setShowResults(true)} 
                    disabled={Object.keys(quizAnswers).length < quiz.questions.length}
                    style={{ width: '100%' }}
                  >
                    Submit Quiz Answers & Grade
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', color: 'var(--text-secondary)' }}>
                <HelpCircle size={48} style={{ color: 'var(--text-muted)' }} />
                <div style={{ textAlign: 'center' }}>
                  <h3>Comprehension Quiz Prep</h3>
                  <p style={{ maxWidth: '400px', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Select your document sources, choose the number of quiz questions, and click Generate to test your understanding.
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

export default StudyAids;
