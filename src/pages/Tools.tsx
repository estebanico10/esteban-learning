import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Timer, FileText, LayoutGrid, Brain, Wrench, ClipboardList, Shapes } from 'lucide-react';
import Pomodoro from './tools/Pomodoro';
import Editor from './tools/Editor';
import Flashcards from './tools/Flashcards';
import ExamCreator from './tools/ExamCreator';
import ConceptMap from './tools/ConceptMap';
import { Link as RouterLink } from 'react-router-dom';

const toolCards = [
  { path: '/tools/editor', icon: '✏️', title: 'Editor de Notas', desc: 'Editor rico con formato, tablas, código, imágenes. Sube archivos o pega desde Notion.' },
  { path: '/tools/pomodoro', icon: '⏱️', title: 'Pomodoro+', desc: 'Temporizador con sesiones, estadísticas y modo de concentración avanzado.' },
  { path: '/tools/flashcards', icon: '🧠', title: 'Repaso con IA', desc: 'Tarjetas de memoria generadas por IA para reforzar lo que aprendiste.' },
  { path: '/tools/exam', icon: '📋', title: 'Creador de Exámenes', desc: 'Genera exámenes con IA por tema, dificultad y número de preguntas. Opción múltiple y respuesta abierta.' },
  { path: '/tools/conceptmap', icon: '🗺️', title: 'Mapa Conceptual', desc: 'Crea mapas conceptuales interactivos con nodos, colores, formas y flechas etiquetadas.' },
];

export default function Tools() {
  const location = useLocation();
  const isPomodoro = location.pathname.includes('/pomodoro');
  const isNotes = location.pathname.includes('/editor');
  const isFlashcards = location.pathname.includes('/flashcards');
  const isExam = location.pathname.includes('/exam');
  const isConcept = location.pathname.includes('/conceptmap');
  const isRootPath = location.pathname === '/tools' || location.pathname === '/tools/';

  const tabStyle = (active: boolean) => ({
    padding: '8px 14px', borderRadius: '8px',
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
    display: 'flex', alignItems: 'center', gap: '6px',
    textDecoration: 'none', fontWeight: active ? 600 : 400,
    border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
    fontSize: '13px', transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Wrench size={26} className="text-gradient" />
        <h2 style={{ fontSize: '26px' }}>Caja de Herramientas</h2>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
        <Link to="/tools" style={tabStyle(isRootPath)}><LayoutGrid size={15} /> Hub</Link>
        <Link to="/tools/editor" style={tabStyle(isNotes)}><FileText size={15} /> Notas</Link>
        <Link to="/tools/pomodoro" style={tabStyle(isPomodoro)}><Timer size={15} /> Pomodoro</Link>
        <Link to="/tools/flashcards" style={tabStyle(isFlashcards)}><Brain size={15} /> Flashcards</Link>
        <Link to="/tools/exam" style={tabStyle(isExam)}><ClipboardList size={15} /> Examen</Link>
        <Link to="/tools/conceptmap" style={tabStyle(isConcept)}><Shapes size={15} /> Mapa Conceptual</Link>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="pomodoro" element={<Pomodoro />} />
          <Route path="editor" element={<Editor />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="exam" element={<ExamCreator />} />
          <Route path="conceptmap" element={<ConceptMap />} />
          <Route path="*" element={
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {toolCards.map(t => (
                <RouterLink key={t.path} to={t.path} style={{ textDecoration: 'none' }}>
                  <div className="glass" style={{ padding: '24px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', height: '100%' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = ''; }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{t.icon}</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{t.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.55 }}>{t.desc}</p>
                  </div>
                </RouterLink>
              ))}
            </div>
          } />
        </Routes>
      </div>

    </div>
  );
}
