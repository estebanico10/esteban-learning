import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import { Loader2, XCircle, ChevronRight, GraduationCap, RefreshCw, AlertTriangle, FileText, Clock, WifiOff, Key } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { saveLessonLocally, getLessonLocally, getContextBlocksForAI, type Slide } from '../lib/db';
import { CheckCircle } from 'lucide-react';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const MODEL_FALLBACK = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

const MermaidDiagram = ({ chart }: { chart: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current && chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then(({ svg }) => { if (containerRef.current) containerRef.current.innerHTML = svg; })
        .catch(() => { if (containerRef.current) containerRef.current.textContent = ''; });
    }
  }, [chart]);
  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', margin: '24px 0', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }} />;
};

// ── ERROR CODE TYPES ──────────────────────────
type ErrorCode = 'NO_KEY' | 'QUOTA_EXCEEDED' | 'OVERLOADED' | 'UNKNOWN' | '';

function ErrorPanel({ code, topic, onRetry }: { code: ErrorCode; topic: string; onRetry: () => void }) {
  const navigate = useNavigate();

  const panels: Record<Exclude<ErrorCode, ''>, { icon: React.ReactNode; title: string; body: React.ReactNode; color: string }> = {
    NO_KEY: {
      icon: <Key size={48} color="#f59e0b" />,
      color: 'rgba(245,158,11,0.15)',
      title: 'API Key no configurada',
      body: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Para generar lecciones con IA necesitas una clave gratuita de Google Gemini.<br />
            Ve a <strong>ai.google.dev</strong>, crea un proyecto y copia tu API Key.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/settings')} style={btnStyle('var(--accent-gradient)')}>⚙️ Ir a Configuración</button>
            <button onClick={() => navigate('/tools/editor')} style={btnStyle('var(--bg-secondary)', true)}>
              <FileText size={16} /> Notas manuales de "{topic}"
            </button>
          </div>
        </>
      ),
    },
    QUOTA_EXCEEDED: {
      icon: <Clock size={48} color="#f59e0b" />,
      color: 'rgba(245,158,11,0.1)',
      title: 'Cuota de API agotada por hoy',
      body: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
            Tu clave de API de Google Gemini (tier gratuito) tiene un límite diario de solicitudes.
            El límite se renueva <strong>cada 24 horas</strong>.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
            💡 Para evitar esto: activa facturación en <em>Google Cloud Console</em> 
            (sigue siendo gratuito hasta cierto nivel de uso).
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/tools/editor')} style={btnStyle('var(--accent-gradient)')}>
              <FileText size={16} /> Tomar notas de "{topic}" manualmente
            </button>
            <button onClick={() => navigate('/tree')} style={btnStyle('var(--bg-secondary)', true)}>
              Volver al árbol
            </button>
          </div>
        </>
      ),
    },
    OVERLOADED: {
      icon: <WifiOff size={48} color="#8b5cf6" />,
      color: 'rgba(139,92,246,0.1)',
      title: 'Servidores de IA saturados',
      body: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Los servidores de Google Gemini están experimentando alta demanda en este momento (Error 503).
            Esto es temporal y se resuelve en segundos.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onRetry} style={btnStyle('var(--accent-gradient)')}>
              <RefreshCw size={16} /> Reintentar ahora
            </button>
            <button onClick={() => navigate('/tools/editor')} style={btnStyle('var(--bg-secondary)', true)}>
              <FileText size={16} /> Notas manuales mientras tanto
            </button>
          </div>
        </>
      ),
    },
    UNKNOWN: {
      icon: <AlertTriangle size={48} color="#ef4444" />,
      color: 'rgba(239,68,68,0.1)',
      title: 'Error de conexión',
      body: (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            No se pudo conectar con la inteligencia artificial. Puede ser un problema temporal de red.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onRetry} style={btnStyle('var(--accent-gradient)')}><RefreshCw size={16} /> Reintentar</button>
            <button onClick={() => navigate('/tools/editor')} style={btnStyle('var(--bg-secondary)', true)}>
              <FileText size={16} /> Notas manuales
            </button>
            <button onClick={() => navigate('/tree')} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', padding: '10px' }}>
              Volver al árbol
            </button>
          </div>
        </>
      ),
    },
  };

  const panel = panels[code as Exclude<ErrorCode, ''>];
  if (!panel) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: '640px', margin: '60px auto', padding: '40px', background: panel.color, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}
    >
      <div style={{ marginBottom: '20px' }}>{panel.icon}</div>
      <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>{panel.title}</h2>
      {panel.body}
    </motion.div>
  );
}

const btnStyle = (bg: string, bordered = false): React.CSSProperties => ({
  background: bg,
  color: bordered ? 'var(--text-primary)' : 'white',
  padding: '12px 24px',
  borderRadius: 'var(--radius-full)',
  fontWeight: 600,
  border: bordered ? '1px solid var(--border-color)' : 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
});

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function LessonView() {
  const { topic } = useParams<{ topic: string }>();
  const navigate = useNavigate();
  const { apiKey, updateNodeProgress, learnedNodes } = useStore();

  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [errorCode, setErrorCode] = useState<ErrorCode>('');
  const [retryKey, setRetryKey] = useState(0);

  // Quiz state
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [remedialLoading, setRemedialLoading] = useState(false);

  const masteryLevel = learnedNodes.find(n => n.topic.toLowerCase() === topic?.toLowerCase())?.masteryLevel || 0;

  useEffect(() => {
    if (!topic) return;

    async function generateLesson() {
      setLoading(true);
      setErrorCode('');

      if (!apiKey) { setErrorCode('NO_KEY'); setLoading(false); return; }

      // Check cache first
      try {
        const cached = await getLessonLocally(topic!);
        if (cached && cached.length > 0) { setSlides(cached); setLoading(false); return; }
      } catch { /* ignore db errors */ }

      const previousBlocks = await getContextBlocksForAI(3);
      const contextInjection = previousBlocks.length > 0
        ? `\nContexto: El usuario ya aprendió: ${previousBlocks.map(b => b.topic).join(', ')}. Referencialos si ayuda.\n`
        : '';

      const prompt = `
        Escribe una lección interactiva y didáctica sobre: "${topic}".
        El estudiante tiene un nivel de dominio de ${masteryLevel}% (0=novato, 100=experto). Adapta el lenguaje.
        ${contextInjection}
        Crea un array JSON de slides (micro-aprendizaje estilo Brilliant.org). Mínimo 4 slides alternando teoría y quiz.
        Puedes usar ecuaciones LaTeX envueltas en $ y diagramas mermaid en bloques \`\`\`mermaid.

        Formato ESTRICTO - devuelve SOLO este JSON válido sin ninguna explicación adicional:
        [
          { "type": "theory", "content": "Párrafo explicativo con Markdown/LaTeX/Mermaid." },
          { "type": "quiz", "question": "¿Pregunta?", "options": ["A", "B", "C"], "correct": "B", "explanation": "Porque..." }
        ]
      `;

      // Try each model in fallback chain
      let succeeded = false;
      for (const modelName of MODEL_FALLBACK) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const text = result.response.text().trim();
          const match = text.match(/\[[\s\S]*\]/);
          const parsed: Slide[] = JSON.parse(match ? match[0] : text);
          setSlides(parsed);
          await saveLessonLocally(topic!, parsed);
          succeeded = true;
          break;
        } catch (e) {
          const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
          if (msg.includes('429') || msg.includes('quota')) {
            setErrorCode('QUOTA_EXCEEDED'); break;
          }
          if (msg.includes('503') || msg.includes('overloaded') || msg.includes('high demand')) {
            // try next model
            continue;
          }
          if (msg.includes('404') || msg.includes('not found')) {
            continue; // try next model
          }
          // Generic error — try next model
          if (MODEL_FALLBACK.indexOf(modelName) === MODEL_FALLBACK.length - 1) {
            setErrorCode('UNKNOWN');
          }
        }
      }

      if (!succeeded && !errorCode) setErrorCode('UNKNOWN');
      setLoading(false);
    }

    generateLesson();
  }, [topic, apiKey, retryKey]);

  const handleRetry = () => { setRetryKey(k => k + 1); };

  const handleSelectOpt = (op: string) => {
    if (quizFinished || selectedOpt || remedialLoading) return;
    setSelectedOpt(op);
    const slide = slides[currentSlideIndex];
    if (slide.type !== 'quiz') return;
    const correct = op === slide.correct;
    setIsCorrect(correct);
    setQuizFinished(true);
    if (correct) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#10b981', '#3b82f6', '#8b5cf6'] });
      updateNodeProgress(topic || '', 20, 5);
    } else {
      updateNodeProgress(topic || '', 5, 0);
      generateRemedial(op, slide);
    }
  };

  const generateRemedial = async (wrongAns: string, slide: Slide) => {
    if (!apiKey) return;
    setRemedialLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_FALLBACK[0] });
      const prompt = `
        El estudiante respondió incorrectamente.
        Pregunta: "${slide.question}". Correcta: "${slide.correct}". Él eligió: "${wrongAns}".
        Genera UN slide JSON de teoría "Módulo de Refuerzo" explicando pacientemente por qué se equivocó.
        Formato JSON: { "type": "theory", "content": "Explicación..." }
      `;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const match = text.match(/\{[\s\S]*\}/);
      const newSlide: Slide = JSON.parse(match ? match[0] : text);
      if (newSlide.type === 'theory') {
        const copy = [...slides];
        copy.splice(currentSlideIndex + 1, 0, newSlide);
        setSlides(copy);
      }
    } catch { /* no remedial on error */ }
    setRemedialLoading(false);
  };

  const nextSlide = () => {
    if (currentSlideIndex === slides.length - 1) {
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } });
      updateNodeProgress(topic || '', 50, 10);
      setTimeout(() => navigate('/tree'), 2500);
      return;
    }
    setSelectedOpt(null); setIsCorrect(null); setQuizFinished(false);
    setCurrentSlideIndex(i => i + 1);
  };

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '24px', color: 'var(--accent-blue)' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}><Loader2 size={64} /></motion.div>
      <h2 style={{ fontSize: '24px', fontWeight: 300 }}>Generando módulo adaptativo...</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Tema: <strong>{topic}</strong> · Nivel base: {masteryLevel}%</p>
    </div>
  );

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (errorCode) return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate('/tree')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
        ← Volver al Árbol
      </button>
      <ErrorPanel code={errorCode} topic={topic || ''} onRetry={handleRetry} />
    </div>
  );

  // ── SLIDES ────────────────────────────────────────────────────────────────
  const slide = slides[currentSlideIndex];
  const isLast = currentSlideIndex === slides.length - 1;
  const progressPct = slides.length > 0 ? (currentSlideIndex / slides.length) * 100 : 0;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '80vh', paddingBottom: '60px' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
        <button onClick={() => navigate('/tree')} style={{ color: 'var(--text-secondary)', padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <XCircle size={24} />
        </button>
        <div style={{ flex: 1, background: 'var(--bg-panel)', height: '12px', borderRadius: '9999px', overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }}
            style={{ background: 'var(--accent-gradient)', height: '100%', borderRadius: '9999px' }} />
        </div>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{currentSlideIndex + 1} / {slides.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentSlideIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} style={{ flex: 1 }}>

          {/* THEORY SLIDE */}
          {slide.type === 'theory' && (
            <div className="glass" style={{ padding: '40px', lineHeight: 1.8, fontSize: '18px', borderRadius: 'var(--radius-lg)' }}>
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}
                components={{
                  code({ inline, className, children, ...props }: any) {
                    const lang = /language-(\w+)/.exec(className || '')?.[1];
                    if (!inline && lang === 'mermaid') return <MermaidDiagram chart={String(children)} />;
                    return <code className={className} {...props}>{children}</code>;
                  }
                }}
              >{slide.content || ''}</ReactMarkdown>
            </div>
          )}

          {/* QUIZ SLIDE */}
          {slide.type === 'quiz' && (
            <div style={{ background: 'var(--bg-panel)', padding: '40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '28px' }}>{slide.question}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {slide.options?.map((op, i) => {
                  const chosen = selectedOpt === op;
                  const isRight = quizFinished && op === slide.correct;
                  const isWrong = quizFinished && chosen && !isCorrect;
                  return (
                    <motion.button key={i}
                      whileHover={!quizFinished ? { scale: 1.01 } : {}}
                      animate={isWrong ? { x: [-8, 8, -8, 8, 0] } : {}}
                      transition={{ duration: 0.35 }}
                      onClick={() => handleSelectOpt(op)}
                      style={{
                        background: isRight ? 'rgba(16,185,129,0.2)' : isWrong ? 'rgba(239,68,68,0.2)' : 'var(--bg-secondary)',
                        border: `2px solid ${isRight ? 'var(--accent-green)' : isWrong ? '#ef4444' : 'transparent'}`,
                        padding: '20px 24px', borderRadius: 'var(--radius-md)',
                        textAlign: 'left', fontSize: '17px',
                        cursor: quizFinished ? 'default' : 'pointer',
                        color: 'var(--text-primary)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      {op}
                      {isRight && <CheckCircle size={24} color="var(--accent-green)" />}
                      {isWrong && <XCircle size={24} color="#ef4444" />}
                    </motion.button>
                  );
                })}
              </div>

              {quizFinished && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: '28px', padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontWeight: 700, color: isCorrect ? 'var(--accent-green)' : '#ef4444', marginBottom: '10px' }}>
                    {isCorrect ? '¡Magistral! ✓' : 'Incorrecto ✗'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{slide.explanation}</p>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer CTA */}
      <div style={{ marginTop: 'auto', paddingTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
        {(slide.type === 'theory' || quizFinished) && (
          <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={nextSlide} disabled={remedialLoading}
            style={{ background: isLast ? '#10b981' : 'var(--accent-gradient)', color: 'white', padding: '16px 32px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', border: 'none', cursor: remedialLoading ? 'not-allowed' : 'pointer', opacity: remedialLoading ? 0.5 : 1, boxShadow: 'var(--shadow-lg)' }}>
            {remedialLoading ? <><Loader2 size={22} className="animate-spin" /> Analizando...</> : isLast ? <><GraduationCap size={22} /> Completar Módulo</> : <>Continuar <ChevronRight size={22} /></>}
          </motion.button>
        )}
      </div>
    </div>
  );
}
