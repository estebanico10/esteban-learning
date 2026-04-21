import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Brain, CheckCircle2, XCircle, Loader2, ChevronRight } from 'lucide-react';
import { evaluateFlashcard } from '../../lib/gemini';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function Flashcards() {
  const { learnedNodes, apiKey } = useStore();
  
  const nodesToReview = useMemo(() => {
    return learnedNodes.filter(n => n.masteryLevel < 100) || [];
  }, [learnedNodes]);


  const allTopics = useMemo(() => {
    if(nodesToReview.length > 0) return nodesToReview;
    return learnedNodes; 
  }, [nodesToReview, learnedNodes]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<{ isCorrect: boolean, feedback: string } | null>(null);

  const currentTopicNode = allTopics[currentIndex];

  const handleEvaluate = async () => {
    if(!answerInput.trim() || !currentTopicNode) return;
    setIsEvaluating(true);
    try {
      const result = await evaluateFlashcard(currentTopicNode.topic, answerInput);
      setEvaluation(result);
    } catch (e) {
      alert("Asegúrate de haber guardado tu API Key en la pantalla de Perfil y Configuración para usar las Flashcards IA.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextCard = () => {
    setEvaluation(null);
    setAnswerInput('');
    setCurrentIndex(prev => (prev + 1) % allTopics.length);
  };

  if(!currentTopicNode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <Brain size={48} style={{ opacity: 0.3, marginBottom: '24px' }} />
        <h3>No tienes apuntes ni lecciones aún.</h3>
        <p>Aprende un nuevo tema usando el Editor o la Inteligencia Artificial para desbloquear el modo de repaso Anki.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', height: '100%', maxWidth: '800px', margin: '0 auto', width: '100%', paddingBottom: '60px' }}>
      
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Repaso Activo (Flashcards)</h2>
        <p style={{ color: 'var(--text-secondary)' }}>La Inteligencia evaluará tus respuestas sobre lo que aprendiste.</p>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', marginTop: '12px' }}>
          Tarjeta {currentIndex + 1} de {allTopics.length}
        </div>
      </div>

      {!evaluation ? (
        <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '300px' }}>
           <span style={{ fontSize: '14px', color: 'var(--accent-purple)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>
             {currentTopicNode.grandParentCategory ? `${currentTopicNode.grandParentCategory} > ${currentTopicNode.category}` : 'Área General'}
           </span>
           <h3 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '32px', textAlign: 'center' }}>
             Explica todo lo que consideres vital acerca de: <br/><span className="text-gradient">"{currentTopicNode.topic}"</span>
           </h3>

           <textarea 
             autoFocus
             value={answerInput}
             onChange={e => setAnswerInput(e.target.value)}
             placeholder="Escribe tu conocimiento aquí. (Ecuaciones soportadas)..."
             style={{
               width: '100%', minHeight: '120px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', 
               color: 'white', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '16px', resize: 'none', marginBottom: '24px'
             }}
           />

           <button 
             onClick={handleEvaluate}
             disabled={isEvaluating || !answerInput.trim() || !apiKey}
             title={!apiKey ? 'Necesitas configurar tu API Key para que la IA evalúe' : ''}
             style={{ background: apiKey ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '14px 40px', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: (isEvaluating || !answerInput.trim() || !apiKey) ? 'not-allowed' : 'pointer', opacity: (isEvaluating || !answerInput.trim() || !apiKey) ? 0.5 : 1 }}
           >
             {isEvaluating ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />} Evaluar con IA
           </button>
           
           {!apiKey && (
             <p style={{marginTop: '12px', fontSize: '13px', color: '#f59e0b'}}>Requiere API Key de Gemini (configurar en Perfil).</p>
           )}
        </div>
      ) : (
        <div className="glass" style={{ padding: '40px', borderRadius: 'var(--radius-lg)', borderColor: evaluation.isCorrect ? 'var(--accent-green)' : 'var(--accent-pink)', borderStyle: 'solid', borderWidth: '1px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
             {evaluation.isCorrect ? <CheckCircle2 size={32} color="var(--accent-green)" /> : <XCircle size={32} color="var(--accent-pink)" />}
             <h3 style={{ fontSize: '24px', fontWeight: 600, color: evaluation.isCorrect ? 'var(--accent-green)' : 'var(--accent-pink)' }}>
               {evaluation.isCorrect ? '¡Excelente comprensión!' : 'Hace falta refinar tus conocimientos.'}
             </h3>
           </div>
           
           <div className="markdown-preview" style={{ background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: 'var(--radius-sm)', lineHeight: 1.6, marginBottom: '24px', fontSize: '15px' }}>
             <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{evaluation.feedback}</ReactMarkdown>
           </div>

           <div style={{ display: 'flex', justifyContent: 'center' }}>
             <button 
               onClick={nextCard}
               style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px 32px', borderRadius: 'var(--radius-full)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
             >
               Siguiente Tarjeta <ChevronRight size={18} />
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
