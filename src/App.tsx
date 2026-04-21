import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookOpen, TreePine, Wrench, Settings, Menu, Brain, BarChart2, Cloud, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import KnowledgeTree from './pages/KnowledgeTree';
import Tools from './pages/Tools';
import SettingsPage from './pages/Settings';
import LessonView from './pages/LessonView';
import Analytics from './pages/Analytics';
import { useStore } from './store/useStore';
import { getProfileLocally } from './lib/db';
import './index.css';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const { theme, setProfile, user, isSyncing } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    getProfileLocally().then(prof => {
      if(prof) setProfile(prof);
    });
  }, [theme, setProfile]);

  const navItems = [
    { name: 'Inicio', path: '/', icon: <BookOpen size={20} /> },
    { name: 'Mapa de Nodos', path: '/tree', icon: <TreePine size={20} /> },
    { name: 'Herramientas', path: '/tools', icon: <Wrench size={20} /> },
    { name: 'Métricas', path: '/analytics', icon: <BarChart2 size={20} /> },
    { name: 'Configuración', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="glass" 
            style={{ display: 'flex', flexDirection: 'column', padding: '24px', borderRight: '1px solid var(--border-color)', borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderBottom: 'none', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', minWidth: '200px' }}>
              <div style={{ background: 'var(--accent-gradient)', padding: '8px', borderRadius: '8px' }}>
                <Brain size={24} color="white" />
              </div>
              <h1 style={{ fontSize: '22px', margin: 0, whiteSpace: 'nowrap' }} className="text-gradient">Esteban Learning</h1>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px', flex: 1 }}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link 
                    key={item.path} to={item.path}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: 'var(--radius-md)', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', background: isActive ? 'var(--bg-panel-hover)' : 'transparent', fontWeight: isActive ? 500 : 400, transition: 'all var(--transition-fast)', textDecoration: 'none' }}
                    onMouseEnter={(e) => { if(!isActive) e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { if(!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* User & Cloud Status */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <img src={user.photoURL || ''} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.displayName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isSyncing ? <RefreshCw size={10} className="spin" /> : <Cloud size={10} color="var(--accent-blue)" />}
                      {isSyncing ? 'Sincronizando' : 'Nube activa'}
                    </div>
                  </div>
                </div>
              )}
              
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99,102,241,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  🌐 {user ? 'Sincronizado' : 'Modo Invitado'}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <header style={{ padding: '24px 32px 0 32px', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '8px', borderRadius: 'var(--radius-md)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Menu size={28} />
          </button>
        </header>

        <div style={{ flex: 1, padding: '16px 32px 32px 32px', maxWidth: '1200px', margin: '0 auto', width: '100%', height: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tree" element={<KnowledgeTree />} />
          <Route path="/lesson/:topic" element={<LessonView />} />
          <Route path="/tools/*" element={<Tools />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
