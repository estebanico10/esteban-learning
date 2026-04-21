import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import {
  TrendingUp, Star, Zap, BookOpen, Award, Target,
  BarChart2, Trophy, Brain, CheckCircle2, Clock, Flame
} from 'lucide-react';

// ── MINI CIRCULAR PROGRESS ─────────────────────────────────────────────────
function CircleProgress({ value, size = 80, color = '#6366f1', label }: {
  value: number; size?: number; color?: string; label?: string;
}) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize={size * 0.22} fontWeight="bold">
          {value}%
        </text>
      </svg>
      {label && <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>{label}</span>}
    </div>
  );
}

// ── HORIZONTAL BAR ─────────────────────────────────────────────────────────
function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{value} XP · {pct}%</span>
      </div>
      <div style={{ height: '8px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: '99px', background: color }}
        />
      </div>
    </div>
  );
}

// ── STAT CARD ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="glass"
      style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}
    >
      <div style={{ background: `${color}20`, padding: '12px', borderRadius: '12px', flexShrink: 0 }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

// ── MASTERY BADGE ─────────────────────────────────────────────────────────
function MasteryBadge({ level }: { level: number }) {
  const cfg =
    level >= 90 ? { label: '🏆 Maestro', color: '#f59e0b' } :
    level >= 70 ? { label: '⭐ Avanzado', color: '#6366f1' } :
    level >= 40 ? { label: '📘 Intermedio', color: '#06b6d4' } :
    { label: '🌱 Explorando', color: '#10b981' };
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: `${cfg.color}25`, color: cfg.color, border: `1px solid ${cfg.color}50` }}>
      {cfg.label}
    </span>
  );
}

// ── MAIN ANALYTICS PAGE ────────────────────────────────────────────────────
export default function Analytics() {
  const { learnedNodes, totalXP, profile } = useStore();

  // Group by grandParent → category → topics
  const grouped = useMemo(() => {
    const map: Record<string, { xp: number; mastery: number; topics: typeof learnedNodes }> = {};
    learnedNodes.forEach(n => {
      const key = n.grandParentCategory || n.category || 'General';
      if (!map[key]) map[key] = { xp: 0, mastery: 0, topics: [] };
      map[key].xp += n.xp;
      map[key].mastery = Math.max(map[key].mastery, n.masteryLevel);
      map[key].topics.push(n);
    });
    return map;
  }, [learnedNodes]);

  const areas = Object.keys(grouped);
  const maxAreaXP = Math.max(1, ...areas.map(a => grouped[a].xp));

  const completedTopics = learnedNodes.filter(n => n.masteryLevel >= 80).length;
  const inProgress = learnedNodes.filter(n => n.masteryLevel > 0 && n.masteryLevel < 80).length;
  const avgMastery = learnedNodes.length
    ? Math.round(learnedNodes.reduce((s, n) => s + n.masteryLevel, 0) / learnedNodes.length)
    : 0;

  const PALETTE = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];

  const levelInfo = useMemo(() => {
    if (totalXP >= 5000) return { name: 'Leyenda del Conocimiento', icon: '🏆', next: null, pct: 100 };
    if (totalXP >= 2000) return { name: 'Erudito', icon: '🎓', next: 5000, pct: Math.round(((totalXP - 2000) / 3000) * 100) };
    if (totalXP >= 800)  return { name: 'Investigador', icon: '🔬', next: 2000, pct: Math.round(((totalXP - 800) / 1200) * 100) };
    if (totalXP >= 200)  return { name: 'Explorador', icon: '🧭', next: 800, pct: Math.round(((totalXP - 200) / 600) * 100) };
    return { name: 'Aprendiz', icon: '🌱', next: 200, pct: Math.round((totalXP / 200) * 100) };
  }, [totalXP]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '60px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: '32px', marginBottom: '6px' }}>
          <BarChart2 size={28} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle', color: 'var(--accent-blue)' }} />
          Métricas de Aprendizaje
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Hola {profile?.name || 'Esteban'} 👋 — Aquí tienes una radiografía completa de tu progreso.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard icon={<Zap size={22} />} label="XP Total" value={totalXP.toLocaleString()} sub="Experiencia acumulada" color="#f59e0b" />
        <StatCard icon={<BookOpen size={22} />} label="Temas Explorados" value={learnedNodes.length} sub="Nodos del árbol" color="#6366f1" />
        <StatCard icon={<CheckCircle2 size={22} />} label="Completados" value={completedTopics} sub="Dominio ≥ 80%" color="#10b981" />
        <StatCard icon={<Clock size={22} />} label="En Progreso" value={inProgress} sub="Dominio 1–79%" color="#06b6d4" />
        <StatCard icon={<Target size={22} />} label="Dominio Promedio" value={`${avgMastery}%`} sub="Todos los temas" color="#8b5cf6" />
        <StatCard icon={<Flame size={22} />} label="Áreas de Estudio" value={areas.length} sub="Ramas del árbol" color="#ec4899" />
      </div>

      {/* Level + Overall Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Level Card */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="glass" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Trophy size={22} color="#f59e0b" />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Tu Nivel</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '48px' }}>{levelInfo.icon}</span>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b' }}>{levelInfo.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{totalXP} XP total</div>
            </div>
          </div>
          {levelInfo.next && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Progreso al siguiente nivel</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{levelInfo.next} XP</span>
              </div>
              <div style={{ height: '8px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${levelInfo.pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Circular progress overview */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="glass" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Brain size={22} color="#6366f1" />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Resumen Visual</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px' }}>
            <CircleProgress value={avgMastery} color="#6366f1" label="Dominio Promedio" />
            <CircleProgress value={learnedNodes.length > 0 ? Math.round((completedTopics / learnedNodes.length) * 100) : 0} color="#10b981" label="% Completados" />
            <CircleProgress value={Math.min(100, levelInfo.pct)} color="#f59e0b" label="Nivel Actual" />
          </div>
        </motion.div>
      </div>

      {/* XP by area */}
      {areas.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <TrendingUp size={22} color="#06b6d4" />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>XP por Área de Conocimiento</h3>
          </div>
          {areas.map((area, i) => (
            <HBar key={area} label={area} value={grouped[area].xp} max={maxAreaXP} color={PALETTE[i % PALETTE.length]} />
          ))}
        </motion.div>
      )}

      {/* Topic Breakdown */}
      {learnedNodes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Star size={22} color="#f59e0b" />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Desglose Detallado por Tema</h3>
          </div>

          {/* Tree: grandParent → category → topics */}
          {areas.map((area, ai) => (
            <div key={area} style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: PALETTE[ai % PALETTE.length], flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '16px' }}>{area}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{grouped[area].topics.length} temas</span>
              </div>

              <div style={{ paddingLeft: '22px', borderLeft: `2px solid ${PALETTE[ai % PALETTE.length]}40` }}>
                {grouped[area].topics.map(n => (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', marginBottom: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.grandParentCategory && n.category ? `${n.grandParentCategory} → ${n.category} → ` : n.category ? `${n.category} → ` : ''}
                        <span style={{ color: PALETTE[ai % PALETTE.length] }}>{n.topic}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden', flex: 1 }}>
                          <div style={{ width: `${n.masteryLevel}%`, height: '100%', background: PALETTE[ai % PALETTE.length], borderRadius: '99px', transition: 'width 0.6s' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{n.masteryLevel}%</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <MasteryBadge level={n.masteryLevel} />
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{n.xp} XP</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Awards / Achievements */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Award size={22} color="#ec4899" />
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Logros y Medallas</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { icon: '🌱', name: 'Primer Paso', desc: 'Completaste tu 1er tema', cond: learnedNodes.length >= 1 },
            { icon: '📚', name: 'Bibliófilo', desc: '5+ temas explorados', cond: learnedNodes.length >= 5 },
            { icon: '🔥', name: 'En llamas', desc: '100 XP acumulados', cond: totalXP >= 100 },
            { icon: '⚡', name: 'Imparable', desc: '500 XP acumulados', cond: totalXP >= 500 },
            { icon: '🎓', name: 'Graduado', desc: '3+ temas al 80%', cond: completedTopics >= 3 },
            { icon: '🏆', name: 'Campeón', desc: '2000 XP acumulados', cond: totalXP >= 2000 },
            { icon: '🌐', name: 'Multidisciplinar', desc: '3+ áreas distintas', cond: areas.length >= 3 },
            { icon: '🧠', name: 'Cerebro de Élite', desc: 'Dominio promedio 70%+', cond: avgMastery >= 70 },
          ].map(a => (
            <div key={a.name} style={{
              padding: '16px', borderRadius: '10px', textAlign: 'center',
              background: a.cond ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${a.cond ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
              opacity: a.cond ? 1 : 0.45, transition: 'all 0.3s'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{a.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{a.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.desc}</div>
              {a.cond && <div style={{ fontSize: '10px', color: '#10b981', marginTop: '6px', fontWeight: 600 }}>✓ Desbloqueado</div>}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Empty state */}
      {learnedNodes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Aún no hay métricas</h3>
          <p>Completa lecciones y empieza a construir tu árbol de conocimiento para ver tu progreso aquí.</p>
        </div>
      )}
    </div>
  );
}
