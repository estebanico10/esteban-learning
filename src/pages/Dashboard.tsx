import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Sparkles, BrainCircuit, Rocket, Flame, Trophy, Play, BookOpenText, Calculator, Bot, Microscope } from 'lucide-react';

const allQuotes = [
  { text: "El mejor proceso es ningún proceso.", author: "Elon Musk" },
  { text: "La imaginación es más importante que el conocimiento.", author: "Albert Einstein" },
  { text: "La mente lo es todo. Te conviertes en lo que piensas.", author: "Buda" },
  { text: "No temo a los ordenadores. Temo a la falta de ellos.", author: "Isaac Asimov" },
  { text: "Aquel que tiene un porqué para vivir, puede soportar casi cualquier cómo.", author: "Friedrich Nietzsche" },
  { text: "La educación es encender un fuego, no llenar un recipiente.", author: "Sócrates" }
];

const cards = [
  {
    topic: "Suma de polinomios",
    category: "Matemáticas",
    query: "Suma de polinomios",
    icon: <Calculator size={28} />,
    color: "var(--accent-blue)",
    previewText: "En matemáticas, para sumar polinomios simplemente sumamos los términos semejantes (los que tienen las mismas variables y exponentes).",
    isFeatured: true
  },
  {
    topic: "¿Huesos del cuerpo humano?",
    category: "Ciencia",
    query: "Huesos del cuerpo humano",
    icon: <Microscope size={24} />,
    color: "var(--accent-green)",
    previewText: "Un adulto promedio tiene 206 huesos, pero ¡nacemos con 270! ¿Qué pasó con los demás?"
  },
  {
    topic: "¿Qué es el AGI?",
    category: "Inteligencia Artificial",
    query: "Inteligencia artificial general",
    icon: <Bot size={24} />,
    color: "var(--accent-purple)",
    previewText: "La Inteligencia Artificial General es el punto donde una máquina puede comprender y aprender cualquier tarea intelectual como un humano."
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { learnedNodes, totalXP } = useStore();

  const dailyQuote = useMemo(() => {
    // Calculamos un índice estático basado en el día (Midnight stable)
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return allQuotes[seed % allQuotes.length];
  }, []);

  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpTowardsNextLevel = totalXP % 100;
  const avgMastery = learnedNodes.length > 0 
      ? Math.round(learnedNodes.reduce((acc, curr) => acc + curr.masteryLevel, 0) / learnedNodes.length)
      : 0;

  const cardStyle = {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    position: 'relative' as const,
    overflow: 'hidden' as const
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header Level & XP */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)', padding: '20px 32px', borderRadius: 'var(--radius-lg)', border: 'var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <h2 style={{ fontSize: '28px', marginBottom: '4px' }}>Bienvenido Estudiante.</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Hoy es un gran día para descubrir nuevas fronteras.</p>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.05)', padding: '12px 20px', borderRadius: 'var(--radius-full)' }}>
              <Trophy size={28} color="var(--accent-green)" />
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Nivel Actual</p>
                <h3 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1 }}>{currentLevel}</h3>
              </div>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.05)', padding: '12px 20px', borderRadius: 'var(--radius-full)' }}>
              <Flame size={28} color="var(--accent-pink)" />
              <div>
                 <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Puntos XP</p>
                 <h3 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1 }}>{totalXP}</h3>
              </div>
           </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Main Feed (Discovery) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--accent-blue)" /> Tu Feed de Descubrimiento
          </h3>

          {cards.map((card, idx) => (
             <div key={idx} className="glass" style={{
                padding: card.isFeatured ? '32px' : '24px',
                borderLeft: `4px solid ${card.color}`
             }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: card.color, marginBottom: '12px', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase' }}>
                  {card.icon}
                  {card.category}
                </div>
                <h3 style={{ fontSize: card.isFeatured ? '28px' : '22px', fontWeight: 700, marginBottom: '12px' }}>
                  {card.topic}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: card.isFeatured ? '16px' : '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                  {card.previewText}
                </p>
                <button 
                  onClick={() => navigate(`/lesson/${encodeURIComponent(card.query)}`)}
                  style={{
                    background: card.isFeatured ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                    color: 'white',
                    padding: card.isFeatured ? '12px 24px' : '10px 20px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    border: card.isFeatured ? 'none' : '1px solid var(--border-color)',
                  }}
                  onMouseEnter={(e) => {
                    if(!card.isFeatured) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    if(!card.isFeatured) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  }}
                >
                  <Play size={18} /> Seguir aprendiendo
                </button>
             </div>
          ))}

        </div>

        {/* RIGHT COLUMN: Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '24px' }}>
          
          <div className="glass" style={{ ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-purple)' }}>
              <BookOpenText size={20} />
              <h3 style={{ fontSize: '16px', fontWeight: 500 }}>Inspiración del Día</h3>
            </div>
            <div>
              <p style={{ fontSize: '20px', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.4, marginBottom: '16px' }}>
                "{dailyQuote.text}"
              </p>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>— {dailyQuote.author}</p>
            </div>
          </div>

          <div className="glass" style={{ ...cardStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', marginBottom: '8px' }}>
              <BrainCircuit size={20} />
              <h3 style={{ fontSize: '16px', fontWeight: 500 }}>Salud de Retención Global</h3>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <span style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>{avgMastery}%</span>
            </div>

            <div style={{ marginTop: 'auto' }}>
               <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                 <span>Próximo nivel (XP)</span>
                 <span>{xpTowardsNextLevel} / 100</span>
               </p>
               <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                 <div style={{ width: `${xpTowardsNextLevel}%`, height: '100%', background: 'var(--accent-gradient)' }} />
               </div>
            </div>
          </div>

          {/* Ramas Aprendidas (Métricas de Jerarquía) */}
          <div className="glass" style={{ ...cardStyle }}>
             <h3 style={{ fontSize: '16px', fontWeight: 500, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>Ramas de Conocimiento</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {learnedNodes.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Aún no has explorado ninguna rama principal.</p>
                ) : (
                  Object.entries(
                    learnedNodes.reduce((acc, curr) => {
                      const key = curr.grandParentCategory ? `${curr.grandParentCategory} → ${curr.category || curr.topic}` : (curr.category || curr.topic);
                      if (!acc[key]) acc[key] = { mastery: 0, count: 0 };
                      acc[key].mastery += curr.masteryLevel;
                      acc[key].count += 1;
                      return acc;
                    }, {} as Record<string, { mastery: number, count: number }>)
                  ).map(([branchName, data], i) => {
                    const avg = Math.round(data.mastery / data.count);
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{branchName}</span>
                          <span style={{ color: avg === 100 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{avg}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                         <div style={{ width: `${avg}%`, height: '100%', background: avg === 100 ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                       </div>
                      </div>
                    )
                  })
                )}
             </div>
          </div>

          <div 
             className="glass" 
             onClick={() => navigate('/tree')}
             style={{ ...cardStyle, padding: '20px', cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--accent-green)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '50%', color: 'var(--accent-green)' }}>
                <Rocket size={24} />
              </div>
              <div>
                <h4 style={{ fontWeight: 600 }}>Entrar al Árbol</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Misiones diarias e interactivas</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
