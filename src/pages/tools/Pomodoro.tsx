import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Plus } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  done: boolean;
}

export default function Pomodoro() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskStr, setNewTaskStr] = useState('');

  // Editable Time support
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);

  useEffect(() => {
    let interval: number;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      const isWork = mode === 'work';
      setMode(isWork ? 'break' : 'work');
      setTimeLeft((isWork ? breakMinutes : workMinutes) * 60);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, breakMinutes, workMinutes]);

  const toggleRun = () => setIsRunning(!isRunning);
  
  const reset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60);
  };

  const handleApplyTimes = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60);
  };

  const addTask = () => {
    if(!newTaskStr.trim()) return;
    setTasks([...tasks, { id: crypto.randomUUID(), text: newTaskStr, done: false }]);
    setNewTaskStr('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ display: 'flex', gap: '32px', height: '100%' }}>
      
      {/* LEFT: Timer Config */}
      <div className="glass" style={{ flex: 1, padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
          <button 
            onClick={() => { setMode('work'); setTimeLeft(workMinutes * 60); setIsRunning(false); }}
            style={{ padding: '8px 16px', borderRadius: '20px', background: mode === 'work' ? 'var(--accent-purple)' : 'transparent', color: mode === 'work' ? 'white' : 'var(--text-muted)' }}
          >
            Concentración
          </button>
          <button 
            onClick={() => { setMode('break'); setTimeLeft(breakMinutes * 60); setIsRunning(false); }}
            style={{ padding: '8px 16px', borderRadius: '20px', background: mode === 'break' ? 'var(--accent-green)' : 'transparent', color: mode === 'break' ? 'white' : 'var(--text-muted)' }}
          >
            Descanso
          </button>
        </div>

        <div style={{ fontSize: '96px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '32px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '40px' }}>
          <button 
            onClick={toggleRun}
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: isRunning ? 'var(--bg-secondary)' : 'var(--text-primary)', color: isRunning ? 'var(--text-primary)' : 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isRunning ? 'none' : 'var(--shadow-lg)' }}
          >
            {isRunning ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: '4px' }} />}
          </button>
          <button 
            onClick={reset}
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}
          >
            <RotateCcw size={28} />
          </button>
        </div>

        <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
           <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Configuración de Tiempo (Mins)</h4>
           <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
             <input type="number" value={workMinutes} onChange={e => setWorkMinutes(Number(e.target.value))} style={{ width: '70px', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '8px', textAlign: 'center' }} />
             <input type="number" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} style={{ width: '70px', background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '8px', textAlign: 'center' }} />
             <button onClick={handleApplyTimes} style={{ background: 'var(--bg-panel-hover)', color: 'var(--text-secondary)', padding: '0 12px', borderRadius: '8px' }}>Aplicar</button>
           </div>
        </div>

      </div>

      {/* RIGHT: Focus Tasks */}
      <div className="glass" style={{ width: '380px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Objetivos de la Sesión</h3>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <input 
            value={newTaskStr}
            onChange={e => setNewTaskStr(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="¿Qué quieres completar ahora?"
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '10px 16px', borderRadius: 'var(--radius-full)' }}
          />
          <button onClick={addTask} style={{ background: 'var(--accent-gradient)', color: 'white', padding: '10px', borderRadius: '50%' }}>
            <Plus size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.length === 0 ? (
             <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px', fontStyle: 'italic', fontSize: '14px' }}>
                No hay tareas. ¡Añade tu primer objetivo de sesión!
             </div>
          ) : (
             tasks.map(task => (
                <div 
                   key={task.id} 
                   onClick={() => toggleTask(task.id)}
                   style={{ 
                     display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                     background: task.done ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-panel-hover)', 
                     border: task.done ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)',
                     borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                   }}
                 >
                   <CheckCircle size={20} color={task.done ? 'var(--accent-green)' : 'var(--text-muted)'} />
                   <span style={{ color: task.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.done ? 'line-through' : 'none' }}>
                     {task.text}
                   </span>
                </div>
             ))
          )}
        </div>
      </div>

    </div>
  );
}
