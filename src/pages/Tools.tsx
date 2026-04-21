import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Timer, FileText, LayoutGrid, Brain, Wrench } from 'lucide-react';
import Pomodoro from './tools/Pomodoro';
import Editor from './tools/Editor';
import Flashcards from './tools/Flashcards';

export default function Tools() {
  const location = useLocation();
  
  const isPomodoro = location.pathname.includes('/pomodoro');
  const isNotes = location.pathname.includes('/editor');
  const isFlashcards = location.pathname.includes('/flashcards');
  const isRootPath = location.pathname === '/tools' || location.pathname === '/tools/';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Wrench size={28} className="text-gradient" />
        <h2 style={{ fontSize: '28px' }}>Caja de Herramientas</h2>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <Link to="/tools" style={{ padding: '8px 16px', borderRadius: '8px', background: isRootPath ? 'var(--bg-secondary)' : 'transparent', color: isRootPath ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 500 }}><LayoutGrid size={18} /> Hub</Link>
        <Link to="/tools/pomodoro" style={{ padding: '8px 16px', borderRadius: '8px', background: isPomodoro ? 'var(--bg-secondary)' : 'transparent', color: isPomodoro ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 500 }}><Timer size={18} /> Pomodoro+</Link>
        <Link to="/tools/editor" style={{ padding: '8px 16px', borderRadius: '8px', background: isNotes ? 'var(--bg-secondary)' : 'transparent', color: isNotes ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 500 }}><FileText size={18} /> Notas & Código</Link>
        <Link to="/tools/flashcards" style={{ padding: '8px 16px', borderRadius: '8px', background: isFlashcards ? 'var(--bg-secondary)' : 'transparent', color: isFlashcards ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 500 }}><Brain size={18} /> Repaso IA</Link>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
          <Routes>
            <Route path="pomodoro" element={<Pomodoro />} />
            <Route path="editor" element={<Editor />} />
            <Route path="flashcards" element={<Flashcards />} />
            <Route path="*" element={
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                 Habilita tu concentración y elige una herramienta arriba.
              </div>
            } />
          </Routes>
      </div>

    </div>
  );
}
