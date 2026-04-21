import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useNavigate } from 'react-router-dom';
import { Wand2, Save, BookOpen, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { enhanceNoteInteractive } from '../../lib/gemini';
import { saveNoteLocally } from '../../lib/db';
import { useStore } from '../../store/useStore';

export default function Editor() {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('');
  const [grandParent, setGrandParent] = useState('');
  
  const [rawContent, setRawContent] = useState('');
  const [enhancedContent, setEnhancedContent] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [activeTab, setActiveTab] = useState<'raw' | 'enhanced'>('raw');
  const [savedMsg, setSavedMsg] = useState('');
  const navigate = useNavigate();
  const { updateNodeProgress, apiKey } = useStore();

  const handleEnhance = async () => {
    if (!topic || !category || !rawContent) return alert('Completa Materia, Área, Tema y las Notas.');
    if (!apiKey) return alert('Configura tu API Key en Configuración para usar la IA. Puedes guardar notas sin IA usando el botón Guardar.');
    setIsEnhancing(true);
    try {
      const result = await enhanceNoteInteractive(rawContent, topic, category);
      setEnhancedContent(result);
      setActiveTab('enhanced');
    } catch (e: any) {
      alert("Error al conectar con la IA: " + (e.message || 'Intenta de nuevo.') + "\n\nPuedes guardar tu nota sin IA usando el botón Guardar.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSaveNote = async () => {
    if (!topic) return alert('Escribe al menos el Tema de la nota.');
    if (!rawContent && !enhancedContent) return alert('Escribe algo en la nota antes de guardar.');
    
    // Si no hay contenido enhanced, usamos el raw directamente
    const finalContent = enhancedContent || rawContent;
    
    await saveNoteLocally({
      id: crypto.randomUUID(),
      topic,
      category: category || 'General',
      grandParentCategory: grandParent || 'Sin clasificar',
      rawContent,
      markdownEnhanced: finalContent,
      timestamp: Date.now()
    });

    // Subir progreso para que aparezca en el árbol
    updateNodeProgress(topic, 25, 100, category || 'General', grandParent || 'Sin clasificar');
    
    setSavedMsg('¡Nota guardada! Apareció en tu Árbol de Conocimiento.');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  // El contenido a previsualizar: enhanced si existe, sino raw
  const previewContent = activeTab === 'enhanced' && enhancedContent ? enhancedContent : rawContent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: '600px' }}>
      
      {/* Settings Ribbon */}
      <div className="glass" style={{ display: 'flex', gap: '16px', padding: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <BookOpen size={24} color="var(--accent-blue)" />
        <div style={{ display: 'flex', flex: 1, gap: '12px' }}>
          <input 
            placeholder="Materia (ej. Matemáticas)" 
            value={grandParent} onChange={e => setGrandParent(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '8px 12px', borderRadius: '8px' }}
          />
          <span style={{color: 'var(--text-muted)', lineHeight: '2.5'}}>→</span>
          <input 
            placeholder="Área (ej. Aritmética)" 
            value={category} onChange={e => setCategory(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '8px 12px', borderRadius: '8px' }}
          />
          <span style={{color: 'var(--text-muted)', lineHeight: '2.5'}}>→</span>
          <input 
            placeholder="Tema (ej. Suma)" 
            value={topic} onChange={e => setTopic(e.target.value)}
            style={{ flex: 1.5, background: 'rgba(255,255,255,0.1)', border: '1px solid var(--accent-blue)', color: 'white', padding: '8px 12px', borderRadius: '8px', fontWeight: 600 }}
          />
        </div>
      </div>

      {/* Status bar */}
      {savedMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-green)', borderRadius: '8px', color: 'var(--accent-green)', fontSize: '14px', fontWeight: 500 }}>
          <CheckCircle2 size={16} /> {savedMsg}
        </div>
      )}

      {!apiKey && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', color: '#f59e0b', fontSize: '13px' }}>
          <AlertTriangle size={16} /> Sin API Key — puedes escribir y guardar notas normalmente. El "Magic Enhancer" requiere la clave de Gemini.
        </div>
      )}

      {/* Editor & Preview Split View */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden' }}>
        
        {/* Left: Raw Notes */}
        <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
            <span>Borrador Rápido</span>
            <button 
               onClick={handleEnhance} 
               disabled={isEnhancing || !apiKey}
               title={!apiKey ? 'Necesitas una API Key para usar la IA' : ''}
               style={{ display: 'flex', gap: '6px', alignItems: 'center', background: apiKey ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)', color: 'white', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600, opacity: !apiKey ? 0.4 : 1, cursor: !apiKey ? 'not-allowed' : 'pointer' }}
            >
              {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Magic Enhancer
            </button>
          </div>
          <textarea
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            style={{
              flex: 1, padding: '16px', resize: 'none', fontSize: '15px', lineHeight: 1.6, background: 'transparent',
              color: 'var(--text-primary)', fontFamily: 'monospace', outline: 'none', border: 'none'
            }}
            placeholder={`Escribe todo lo que el profesor diga de forma desordenada...

Puedes usar Markdown:
# Título
## Subtítulo
- Lista con viñetas
**texto en negrita**

Fórmulas TeX:
$E = mc^2$ (en línea)
$$\\sum_{i=0}^{n} x_i$$ (bloque)

Wiki links: [[Otro Tema]]`}
          />
        </div>

        {/* Right: Preview / AI Enhanced */}
        <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setActiveTab('enhanced')}
                style={{ color: activeTab === 'enhanced' ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: activeTab === 'enhanced' ? 600 : 400, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >Previsualizar</button>
              {enhancedContent && (
                <button 
                  onClick={() => setActiveTab('raw')}
                  style={{ color: activeTab === 'raw' ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: activeTab === 'raw' ? 600 : 400, background: 'transparent', border: 'none', cursor: 'pointer' }}
                >Editar Markdown</button>
              )}
            </div>

            <button 
               onClick={handleSaveNote} 
               style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--accent-green)', color: 'white', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Save size={14} /> Guardar
            </button>
          </div>
          
          {activeTab === 'raw' && enhancedContent ? (
             <textarea
               value={enhancedContent}
               onChange={(e) => setEnhancedContent(e.target.value)}
               style={{ flex: 1, padding: '16px', resize: 'none', fontSize: '15px', background: 'transparent', color: 'var(--text-primary)', fontFamily: 'monospace', border: 'none', outline: 'none' }}
               placeholder="El markdown generado aparecerá aquí para ser editado..."
             />
          ) : (
            <div className="markdown-preview" style={{ flex: 1, padding: '16px', overflowY: 'auto', lineHeight: 1.6 }}>
              {previewContent ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    a: ({node, ...props}) => {
                      if (props.href && props.href.startsWith('/tree')) {
                        return (
                          <span 
                            onClick={() => navigate(props.href!)} 
                            style={{ color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                          >
                            {props.children}
                          </span>
                        );
                      }
                      return <a {...props} target="_blank" rel="noopener noreferrer" />;
                    }
                  }}
                >
                  {previewContent.replace(/\[\[(.*?)\]\]/g, '[$1](/tree?node=$1)')}
                </ReactMarkdown>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.5, gap: '12px', textAlign: 'center', padding: '20px' }}>
                  <BookOpen size={32} />
                  <p>Empieza a escribir a la izquierda y la previsualización aparecerá aquí en tiempo real.</p>
                  <p style={{ fontSize: '13px' }}>También puedes usar el "Magic Enhancer" con IA para mejorar tus notas automáticamente.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
