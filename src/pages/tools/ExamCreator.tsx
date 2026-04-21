import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { generateExam } from '../../lib/gemini';
import { ClipboardList, Loader2, CheckCircle, XCircle, ChevronRight, RefreshCw, AlertTriangle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface ExamQuestion {
  question: string;
  type: 'multiple' | 'open';
  options?: string[];
  correct?: string;
  explanation?: string;
}

export default function ExamCreator() {
  const { apiKey, learnedNodes } = useStore();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'fácil' | 'medio' | 'difícil'>('medio');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [examStarted, setExamStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [openAnswer, setOpenAnswer] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const topicSuggestions = learnedNodes.map(n => n.topic).slice(0, 8);

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Escribe un tema para el examen.'); return; }
    setError(''); setGenerating(true); setQuestions([]); setExamStarted(false); setShowResults(false);
    try {
      setQuestions(await generateExam(topic, difficulty, count));
    } catch (e: any) {
      setError(e.message || 'Error generando el examen. Verifica tu API Key.');
    } finally {
      setGenerating(false);
    }
  };

  const startExam = () => { setCurrentQ(0); setAnswers({}); setOpenAnswer(''); setShowResults(false); setExamStarted(true); };

  const nextQuestion = () => {
    const q = questions[currentQ];
    const savedAnswers = { ...answers };
    if (q.type === 'open' && openAnswer.trim()) savedAnswers[currentQ] = openAnswer.trim();
    setAnswers(savedAnswers);
    if (currentQ < questions.length - 1) { setCurrentQ(i => i + 1); setOpenAnswer(''); }
    else {
      let correct = 0;
      questions.forEach((qu, i) => { if (qu.type === 'multiple' && savedAnswers[i] === qu.correct) correct++; });
      const mc = questions.filter(q => q.type === 'multiple').length;
      const pct = mc > 0 ? Math.round((correct / mc) * 100) : 0;
      setScore(pct); setShowResults(true); setExamStarted(false);
      if (pct >= 70) confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }
  };

  const exportTxt = () => {
    const lines = questions.map((q, i) => [
      `${i + 1}. ${q.question}`,
      q.type === 'multiple' ? q.options?.map((o, j) => `   ${String.fromCharCode(65+j)}) ${o}`).join('\n') : '   Respuesta abierta',
      q.correct ? `   ✓ Respuesta: ${q.correct}` : '',
      q.explanation ? `   Explicación: ${q.explanation}` : ''
    ].filter(Boolean).join('\n')).join('\n\n');
    const blob = new Blob([`EXAMEN: ${topic}\nDificultad: ${difficulty}\n\n${lines}`], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `examen-${topic.replace(/\s/g, '-')}.txt`; a.click();
  };

  const q = questions[currentQ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ClipboardList size={28} color="var(--accent-blue)" />
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Creador de Exámenes con IA</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Genera exámenes adaptativos sobre cualquier tema</p>
        </div>
      </div>

      {!examStarted && !showResults && (
        <div className="glass" style={{ padding: '28px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>TEMA DEL EXAMEN</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="ej. Leyes de Newton, Suma de fracciones, Fotosíntesis..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
            />
            {topicSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {topicSuggestions.map(t => (
                  <button key={t} onClick={() => setTopic(t)}
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--accent-blue)', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>DIFICULTAD</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['fácil', 'medio', 'difícil'] as const).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${difficulty === d ? 'var(--accent-blue)' : 'var(--border-color)'}`, background: difficulty === d ? 'rgba(99,102,241,0.15)' : 'transparent', color: difficulty === d ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                    {d === 'fácil' ? '😊' : d === 'medio' ? '🎯' : '🔥'} {d}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Nº PREGUNTAS</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setCount(c => Math.max(3, c - 1))} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px' }}>−</button>
                <span style={{ fontSize: '20px', fontWeight: 700, minWidth: '30px', textAlign: 'center' }}>{count}</span>
                <button onClick={() => setCount(c => Math.min(20, c + 1))} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px' }}>+</button>
              </div>
            </div>
          </div>

          {error && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '13px' }}><AlertTriangle size={16} /> {error}</div>}
          {!apiKey && <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#f59e0b', fontSize: '13px' }}>⚠️ Necesitas configurar tu API Key en Configuración para generar exámenes.</div>}

          <button onClick={handleGenerate} disabled={generating || !apiKey}
            style={{ background: apiKey ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', cursor: generating || !apiKey ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: !apiKey ? 0.5 : 1 }}>
            {generating ? <><Loader2 size={20} className="animate-spin" /> Generando...</> : <><ClipboardList size={20} /> Generar Examen con IA</>}
          </button>
        </div>
      )}

      {questions.length > 0 && !examStarted && !showResults && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px' }}>✅ {questions.length} preguntas sobre "{topic}"</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={exportTxt} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <Download size={14} /> Exportar .txt
              </button>
              <button onClick={startExam} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-gradient)', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                Hacer el examen <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {questions.map((qi, i) => (
              <div key={i} style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '3px solid var(--accent-purple)' }}>
                <p style={{ fontWeight: 600, marginBottom: '6px' }}>{i + 1}. {qi.question}</p>
                {qi.type === 'multiple' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {qi.options?.map((o, j) => (
                      <span key={j} style={{ fontSize: '13px', color: o === qi.correct ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                        {String.fromCharCode(65 + j)}) {o} {o === qi.correct ? '✓' : ''}
                      </span>
                    ))}
                  </div>
                )}
                {qi.type === 'open' && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Respuesta abierta</span>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {examStarted && q && (
          <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div style={{ height: '6px', background: 'var(--bg-panel)', borderRadius: '9999px', marginBottom: '24px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((currentQ + 1) / questions.length) * 100}%`, background: 'var(--accent-gradient)', borderRadius: '9999px', transition: 'width 0.4s' }} />
            </div>
            <div className="glass" style={{ padding: '32px', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Pregunta {currentQ + 1} de {questions.length}</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', lineHeight: 1.4 }}>{q.question}</h3>
              {q.type === 'multiple' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {q.options?.map((opt, j) => (
                    <button key={j} onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: opt }))}
                      style={{ padding: '14px 20px', borderRadius: '10px', textAlign: 'left', border: `2px solid ${answers[currentQ] === opt ? 'var(--accent-blue)' : 'var(--border-color)'}`, background: answers[currentQ] === opt ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: answers[currentQ] === opt ? 600 : 400, fontSize: '15px' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: '10px' }}>{String.fromCharCode(65 + j)})</span> {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'open' && (
                <textarea value={openAnswer} onChange={e => setOpenAnswer(e.target.value)} placeholder="Escribe tu respuesta..."
                  style={{ width: '100%', minHeight: '120px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '14px', borderRadius: '10px', fontSize: '15px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              )}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={nextQuestion}
                  disabled={q.type === 'multiple' ? !answers[currentQ] : !openAnswer.trim()}
                  style={{ background: 'var(--accent-gradient)', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: (q.type === 'multiple' ? !answers[currentQ] : !openAnswer.trim()) ? 0.5 : 1 }}>
                  {currentQ === questions.length - 1 ? 'Finalizar' : 'Siguiente'} <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showResults && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass" style={{ padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score >= 90 ? '🏆' : score >= 70 ? '🎉' : score >= 50 ? '📚' : '💪'}</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
            {score >= 90 ? '¡Excelente dominio!' : score >= 70 ? '¡Muy bien!' : score >= 50 ? 'Sigue practicando' : 'Hay que repasar'}
          </h2>
          <div style={{ fontSize: '56px', fontWeight: 900, marginBottom: '8px' }} className={score >= 70 ? 'text-gradient' : ''}>{score}%</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Opción múltiple correctas · {questions.filter(q => q.type === 'open').length} respuestas abiertas guardadas
          </p>
          <div style={{ textAlign: 'left', marginBottom: '28px' }}>
            {questions.map((qi, i) => {
              if (qi.type !== 'multiple') return null;
              const isCorrect = answers[i] === qi.correct;
              return (
                <div key={i} style={{ marginBottom: '12px', padding: '14px', background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '8px', borderLeft: `3px solid ${isCorrect ? 'var(--accent-green)' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {isCorrect ? <CheckCircle size={16} color="var(--accent-green)" /> : <XCircle size={16} color="#ef4444" />}
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{qi.question}</span>
                  </div>
                  {!isCorrect && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tu: <span style={{ color: '#ef4444' }}>{answers[i] || '—'}</span> · Correcta: <span style={{ color: 'var(--accent-green)' }}>{qi.correct}</span></div>}
                  {qi.explanation && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>💡 {qi.explanation}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => { setQuestions([]); setShowResults(false); setTopic(''); }}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
              Nuevo Examen
            </button>
            <button onClick={startExam}
              style={{ background: 'var(--accent-gradient)', border: 'none', color: 'white', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={16} /> Repetir
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
