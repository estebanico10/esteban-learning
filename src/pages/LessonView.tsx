import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import { Loader2, ArrowLeft, CheckCircle, XCircle, ChevronRight, GraduationCap, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

import { saveLessonLocally, getLessonLocally, getContextBlocksForAI, type Slide } from '../lib/db';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const MermaidDiagram = ({ chart }: { chart: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (containerRef.current && chart) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart).then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg;
      }).catch(() => {
        // silently handle mermaid rendering errors
        if (containerRef.current) containerRef.current.innerHTML = '<p style="color: var(--text-muted)">Diagrama no disponible</p>';
      });
    }
  }, [chart]);
  
  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', margin: '24px 0', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }} />;
};

export default function LessonView() {
  const { topic } = useParams<{topic: string}>();
  const navigate = useNavigate();
  const { apiKey, updateNodeProgress, learnedNodes } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  
  // Quiz state for the current slide
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  
  // Extra loading for real-time remedial generation
  const [remedialLoading, setRemedialLoading] = useState(false);

  // current topic mastery
  const masteryLevel = learnedNodes.find(n => n.topic.toLowerCase() === topic?.toLowerCase())?.masteryLevel || 0;

  useEffect(() => {
    async function generateLesson() {
      if (!apiKey) {
        setErrorMsg("NO_API_KEY");
        setLoading(false);
        return;
      }
      try {
        const localSlides = await getLessonLocally(topic || '');
        if (localSlides && localSlides.length > 0) {
          setSlides(localSlides);
          setLoading(false);
          return;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const previousBlocks = await getContextBlocksForAI(3);
        let contextInjection = "";
        if (previousBlocks.length > 0) {
           const blocksText = previousBlocks.map(b => `- Tema: ${b.topic} -> Concepto: ${b.contentSnippet}`).join('\n');
           contextInjection = `\nContexto Interactivo: El usuario ya aprendió estos bloques previos:\n${blocksText}\nÚsalos como metáforas, referéncialos o conéctalos visualmente si esto te ayuda a explicar el tema actual.\n`;
        }

        const prompt = `
          Escribe una clase MUY interactiva y didáctica sobre: "${topic}".
          El estudiante tiene un nivel de dominio previo de esta clase de ${masteryLevel}%.
          Adapta el nivel de lenguaje, dificultad técnica y profundidad de tu explicación a ese porcentaje. Nivel 0 es novato total, Nivel 100 es experto.
          ${contextInjection}
          Crea una lección paso a paso (micro-aprendizaje interactivo estilo Brilliant.org).
          Devuelve OBLIGATORIAMENTE un array JSON válido de "Slides", alternando teoría y quizzes.
          Usa diagramas mermaid (ej. \`\`\`mermaid\\ngraph TD...\\n\`\`\`) o ecuaciones en LaTeX separadas por $ en la teoría.
          
          Formato estricto (no incluyas formato Markdown fuera del JSON):
          [
            {
              "type": "theory",
              "content": "Párrafos cautivadores, introducciones, gráficas o ecuaciones."
            },
            {
              "type": "quiz",
              "question": "¿Pregunta de prueba?",
              "options": ["Op1", "Op2", "Op3"],
              "correct": "Op2",
              "explanation": "El motivo..."
            }
          ]
          Genera al menos 4 slides. Asegúrate que las comillas internas en el contenido estén escapadas para que sea JSON válido.
        `;

        const result = await model.generateContent(prompt);
        const text = await result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        const finalSlides = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
        setSlides(finalSlides);
        await saveLessonLocally(topic || '', finalSlides);

        
      } catch (e: any) {
        const msg = e.message || 'Error desconocido';
        if (msg.includes('503') || msg.includes('high demand') || msg.includes('overloaded')) {
          setErrorMsg("AI_OVERLOADED");
        } else if (msg.includes('429') || msg.includes('quota')) {
          setErrorMsg("AI_QUOTA");
        } else {
          setErrorMsg("AI_ERROR:" + msg);
        }
      } finally {
        setLoading(false);
      }
    }
    generateLesson();
  }, [topic, apiKey, masteryLevel, retryCount]);

  const handleRetry = () => {
    setErrorMsg("");
    setLoading(true);
    setRetryCount(prev => prev + 1);
  };

  const handleSelectOpt = (op: string) => {
    if (quizFinished || selectedOpt || remedialLoading) return;
    
    setSelectedOpt(op);
    const currentSlide = slides[currentSlideIndex];
    if (currentSlide.type !== 'quiz') return;

    const correct = op === currentSlide.correct;
    setIsCorrect(correct);
    setQuizFinished(true);

    if (correct) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6']
      });
      updateNodeProgress(topic || "Unknown", 20, 5);
    } else {
      updateNodeProgress(topic || "Unknown", 5, 0);
      handleRemedialAction(op, currentSlide);
    }
  };

  const handleRemedialAction = async (wrongAns: string, currentSlide: Slide) => {
    if (!apiKey) return;
    setRemedialLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `
        El estudiante estaba en un quiz sobre: "${topic}".
        La pregunta era: "${currentSlide.question}"
        La respuesta correcta era: "${currentSlide.correct}".
        El estudiante escogió: "${wrongAns}".
        
        Genera UN slide JSON de teoría que sea un "Módulo de Refuerzo" explicándole con mucha paciencia por qué se equivocó y cuál es la intuición detrás de la respuesta correcta.
        Formato JSON: { "type": "theory", "content": "Explicación de refuerzo..." }
      `;
      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      const newSlide: Slide = match ? JSON.parse(match[0]) : JSON.parse(text);
      if(newSlide.type === 'theory') {
         const newSlides = [...slides];
         newSlides.splice(currentSlideIndex + 1, 0, newSlide);
         setSlides(newSlides);
      }
    } catch (e) {
      console.error("No remedial generated", e);
    } finally {
      setRemedialLoading(false);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex === slides.length - 1) {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.4 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
      });
      updateNodeProgress(topic || "Unknown", 50, 10);
      setTimeout(() => navigate('/tree'), 3000);
      return;
    }
    setSelectedOpt(null);
    setIsCorrect(null);
    setQuizFinished(false);
    setCurrentSlideIndex(prev => prev + 1);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '24px', color: 'var(--accent-blue)' }}>
         <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
           <Loader2 size={64} />
         </motion.div>
         <h2 style={{ fontSize: '24px', fontWeight: 300 }}>Ensamblando módulos adaptativos...</h2>
         <p style={{ color: 'var(--text-secondary)' }}>Nivel de Maestría Base: {masteryLevel}%</p>
      </div>
    );
  }

  // ========== ERROR STATES ==========
  if (errorMsg) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => navigate('/tree')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '24px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={18} /> Volver al Árbol
        </button>

        {errorMsg === "NO_API_KEY" ? (
          <div style={{ padding: '40px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#f59e0b" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '22px', marginBottom: '12px' }}>API Key no configurada</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
              Para generar lecciones interactivas con IA necesitas una clave de Google Gemini. 
              Es <strong>gratuita</strong> y puedes obtenerla en 10 segundos.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/settings')} style={{ background: 'var(--accent-gradient)', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Ir a Configuración
              </button>
              <button onClick={() => navigate('/tools/editor')} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} /> Escribir una nota manualmente
              </button>
            </div>
          </div>
        ) : errorMsg === "AI_OVERLOADED" ? (
          <div style={{ padding: '40px', background: 'var(--bg-panel)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <RefreshCw size={48} color="#f59e0b" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '22px', marginBottom: '12px' }}>El servidor de IA está saturado</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.6 }}>
              El modelo de Google Gemini está experimentando alta demanda. Esto suele resolverse en unos segundos.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Error 503 — Picos de demanda temporales en los servidores de Google.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleRetry} style={{ background: 'var(--accent-gradient)', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={18} /> Reintentar
              </button>
              <button onClick={() => navigate('/tools/editor')} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} /> Tomar notas manuales de "{topic}"
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', background: 'var(--bg-panel)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <XCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '22px', marginBottom: '12px' }}>Error de conexión</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.6 }}>
              No se pudo conectar con la inteligencia artificial.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '13px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {errorMsg.replace('AI_ERROR:', '')}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleRetry} style={{ background: 'var(--accent-gradient)', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={18} /> Reintentar
              </button>
              <button onClick={() => navigate('/tools/editor')} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} /> Escribir notas manualmente
              </button>
              <button onClick={() => navigate('/tree')} style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Volver al Árbol
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const isLast = currentSlideIndex === slides.length - 1;
  const progressPercent = slides.length > 0 ? ((currentSlideIndex) / slides.length) * 100 : 0;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '80vh', paddingBottom: '60px' }}>
      
      {/* Brilliant Style Header w/ Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
        <button onClick={() => navigate('/tree')} style={{ color: 'var(--text-secondary)', padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <XCircle size={24} />
        </button>
        <div style={{ flex: 1, background: 'var(--bg-panel)', height: '12px', borderRadius: '9999px', overflow: 'hidden' }}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ background: 'var(--accent-gradient)', height: '100%', borderRadius: '9999px' }}
          />
        </div>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Nivel: {masteryLevel}%</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={currentSlideIndex}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.3 }}
           style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {currentSlide.type === 'theory' && (
            <div className="glass" style={{ padding: '40px', lineHeight: 1.8, fontSize: '18px', borderRadius: 'var(--radius-lg)' }}>
              <ReactMarkdown 
                 remarkPlugins={[remarkMath]} 
                 rehypePlugins={[rehypeKatex]}
                 components={{
                   code({node, inline, className, children, ...props}: any) {
                     const match = /language-(\w+)/.exec(className || '')
                     if (!inline && match && match[1] === 'mermaid') {
                       return <MermaidDiagram chart={String(children).replace(/\\n/g, '\n')} />
                     }
                     return <code className={className} {...props}>{children}</code>
                   }
                 }}
              >
                {currentSlide.content || ''}
              </ReactMarkdown>
            </div>
          )}

          {currentSlide.type === 'quiz' && (
            <div style={{ background: 'var(--bg-panel)', padding: '40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>{currentSlide.question}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {currentSlide.options?.map((op, idx) => {
                  const isSelected = selectedOpt === op;
                  const isWrongSelected = quizFinished && isSelected && !isCorrect;
                  const isRightAnswer = quizFinished && op === currentSlide.correct;

                  return (
                    <motion.button 
                      key={idx}
                      whileHover={!quizFinished ? { scale: 1.01 } : {}}
                      whileTap={!quizFinished ? { scale: 0.98 } : {}}
                      onClick={() => handleSelectOpt(op)}
                      animate={isWrongSelected ? { x: [-10, 10, -10, 10, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      style={{
                        background: isRightAnswer ? 'rgba(16, 185, 129, 0.2)' : isWrongSelected ? 'rgba(239, 68, 68, 0.2)' : isSelected ? 'var(--bg-panel-hover)' : 'var(--bg-secondary)',
                        border: `2px solid ${isRightAnswer ? 'var(--accent-green)' : isWrongSelected ? '#ef4444' : isSelected ? 'var(--accent-blue)' : 'transparent'}`,
                        padding: '24px',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left',
                        fontSize: '18px',
                        cursor: quizFinished || remedialLoading ? 'default' : 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {op}
                      {isRightAnswer && <CheckCircle size={28} color="var(--accent-green)" />}
                      {isWrongSelected && <XCircle size={28} color="#ef4444" />}
                    </motion.button>
                  )
                })}
              </div>
              
              {quizFinished && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: '32px', padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}
                >
                  <p style={{ fontSize: '18px', fontWeight: 600, color: isCorrect ? 'var(--accent-green)' : '#ef4444', marginBottom: '12px' }}>
                    {isCorrect ? '¡Magistral!' : 'Incorrecto'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.6 }}>{currentSlide.explanation}</p>
                </motion.div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Footer Nav Controls */}
      <div style={{ marginTop: 'auto', paddingTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
        {((currentSlide.type === 'theory') || (currentSlide.type === 'quiz' && quizFinished)) && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={nextSlide}
            disabled={remedialLoading}
            style={{ 
              background: isLast ? 'var(--accent-green)' : 'var(--accent-gradient)', 
              color: 'white', 
              padding: '16px 32px', 
              borderRadius: 'var(--radius-full)', 
              fontWeight: 700, 
              fontSize: '18px',
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              boxShadow: 'var(--shadow-lg)',
              opacity: remedialLoading ? 0.5 : 1,
              border: 'none',
              cursor: remedialLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {remedialLoading ? (
               <><Loader2 size={24} className="animate-spin" /> Analizando tu respuesta...</>
            ) : isLast ? (
               <><GraduationCap size={24} /> Completar Módulo</>
            ) : (
               <>Continuar <ChevronRight size={24} /></>
            )}
          </motion.button>
        )}
      </div>

    </div>
  );
}
