import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background, Controls, BackgroundVariant, addEdge,
  applyNodeChanges, applyEdgeChanges,
  type NodeChange, type EdgeChange, type Connection,
  type Node, type Edge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';
import { getNextTopicsFromGemini } from '../lib/gemini';
import { getAllNotes, type Note } from '../lib/db';
import { Network, Sparkles, Loader2, Play, FileText, X, Plus, PenLine, Trash2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function KnowledgeTree() {
  const { learnedNodes, apiKey, treeNodes, treeEdges, setTreeItems } = useStore();

  const [nodes, setNodes] = useState<Node[]>(treeNodes);
  const [edges, setEdges] = useState<Edge[]>(treeEdges);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dbNotes, setDbNotes] = useState<Note[]>([]);
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string; isLearned: boolean; note?: Note } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const navigate = useNavigate();

  // Keep store in sync whenever nodes/edges change
  useEffect(() => {
    setTreeItems(nodes, edges);
  }, [nodes, edges]);

  useEffect(() => {
    const fetchNotes = async () => {
      const notes = await getAllNotes();
      setDbNotes(notes);
      // Auto-add nodes for notes that aren't in the tree yet
      setNodes(prev => {
        let updated = [...prev];
        notes.forEach(note => {
          if (!updated.find(n => (typeof n.data.label === 'string' ? n.data.label : n.data._rawLabel || '').toLowerCase() === note.topic.toLowerCase())) {
            updated.push({
              id: `note-gen-${note.id}`,
              position: { x: 150 + Math.random() * 500, y: 150 + Math.random() * 400 },
              data: { label: note.topic }
            });
          }
        });
        return updated;
      });
    };
    fetchNotes();
  }, []);

  // ── Node/Edge changes WITH position persistence ────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(ns => applyNodeChanges(changes, ns)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(es => applyEdgeChanges(changes, es)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges(es => addEdge({ ...params, animated: true, style: { stroke: 'var(--accent-blue)', strokeWidth: 2 } }, es)),
    []
  );

  // ── Node click ─────────────────────────────────────────────────────────────
  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setContextMenu(null);
    const rawLabel = typeof node.data.label === 'string' ? node.data.label : (node.data._rawLabel as string) || '';
    const learnedData = learnedNodes.find(ln => ln.topic.toLowerCase() === rawLabel.toLowerCase());
    const noteData = dbNotes.find(n => n.topic.toLowerCase() === rawLabel.toLowerCase());
    setSelectedNode({ id: node.id, label: rawLabel, isLearned: !!learnedData, note: noteData });
  };

  // ── Right-click context menu ───────────────────────────────────────────────
  const handleNodeContextMenu = (e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  };

  const deleteNode = (id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
    setContextMenu(null);
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  // ── Add node manually ─────────────────────────────────────────────────────
  const handleAddNodeManually = () => {
    if (!newNodeLabel.trim()) return;
    const newNode: Node = {
      id: `manual-${Date.now()}`,
      position: { x: 220 + Math.random() * 350, y: 200 + Math.random() * 300 },
      data: { label: newNodeLabel.trim() }
    };
    const parentId = nodes.length > 0 ? nodes[nodes.length - 1].id : '1';
    const newEdge: Edge = {
      id: `e-manual-${Date.now()}`,
      source: parentId,
      target: newNode.id,
      animated: true,
      style: { stroke: 'var(--accent-purple)', strokeWidth: 2 }
    };
    setNodes(ns => [...ns, newNode]);
    setEdges(es => [...es, newEdge]);
    setNewNodeLabel('');
    setShowAddModal(false);
  };

  // ── Expand with AI ─────────────────────────────────────────────────────────
  const expandTreeAI = async () => {
    if (!apiKey) { setErrorMsg("Configura tu API Key en Configuración para usar la IA."); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      const topLearned = learnedNodes.map(n => n.topic);
      const newTopics = await getNextTopicsFromGemini(topLearned.length ? topLearned : ['Ciencias generales'], 'Conocimiento General');
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0);
      const sourceId = nodes[nodes.length - 1]?.id ?? '1';
      const base = Date.now();
      const newNodes = newTopics.map((t, i) => ({ id: String(base + i), position: { x: 150 + i * 220, y: maxY + 180 }, data: { label: t } }));
      const newEdges = newTopics.map((_, i) => ({ id: `e${sourceId}-${base + i}`, source: sourceId, target: String(base + i), animated: true, style: { stroke: 'var(--accent-blue)', strokeWidth: 2 } }));
      setNodes(ns => [...ns, ...newNodes]);
      setEdges(es => [...es, ...newEdges]);
    } catch (e: any) {
      setErrorMsg((e.message || 'Error al expandir') + ' — Usa el botón "+" para agregar temas manualmente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render nodes with visual state ────────────────────────────────────────
  const styledNodes = nodes.map(n => {
    const rawLabel = typeof n.data.label === 'string' ? n.data.label : (n.data._rawLabel as string) || '';
    const isLearned = learnedNodes.some(ln => ln.topic.toLowerCase() === rawLabel.toLowerCase());
    const hasNote = dbNotes.some(note => note.topic.toLowerCase() === rawLabel.toLowerCase());
    let bg = 'var(--bg-secondary)';
    let border = '1px solid var(--border-color)';
    if (isLearned) { bg = 'var(--accent-green)'; border = '2px solid rgba(255,255,255,0.5)'; }
    else if (hasNote) { bg = 'var(--accent-purple)'; border = '2px solid rgba(255,255,255,0.3)'; }
    return {
      ...n,
      data: {
        ...n.data,
        _rawLabel: rawLabel,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hasNote && <FileText size={12} />} {rawLabel}
          </div>
        )
      },
      style: { background: bg, color: 'white', border, borderRadius: '8px', padding: '10px 18px', fontWeight: 600, cursor: 'pointer', minWidth: '100px', textAlign: 'center' as const, fontSize: '13px' as const },
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }} onClick={() => setContextMenu(null)}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={28} className="text-gradient" />
            <h2 style={{ fontSize: '26px' }}>Grafo de Conocimiento</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            🟢 Aprendido &nbsp; 🟣 Con apuntes &nbsp; ⬛ Por explorar &nbsp; · Clic derecho en un nodo para eliminarlo
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowAddModal(true)}
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '10px 18px', borderRadius: '9999px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '14px' }}>
            <Plus size={16} /> Agregar Nodo
          </button>
          <button onClick={expandTreeAI} disabled={loading}
            style={{ background: apiKey ? 'var(--accent-gradient)' : 'var(--bg-secondary)', color: 'white', padding: '10px 20px', borderRadius: '9999px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : (!apiKey ? 0.4 : 1), border: apiKey ? 'none' : '1px solid var(--border-color)', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Expandir con IA
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'transparent', color: '#f59e0b', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>

        {/* REACT FLOW */}
        <div className="glass" style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
          <ReactFlow
            nodes={styledNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onNodeContextMenu={handleNodeContextMenu}
            deleteKeyCode="Delete"
            fitView
            style={{ background: '#0d0d1a' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.05)" />
            <Controls style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            <Panel position="bottom-left">
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.7)', padding: '6px 10px', borderRadius: '6px' }}>
                Arrastra nodos · Conecta: punto → punto · Elimina: clic derecho o tecla Delete
              </div>
            </Panel>
          </ReactFlow>

          {/* Context Menu */}
          {contextMenu && (
            <div
              style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px 0', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => deleteNode(contextMenu.nodeId)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                <Trash2 size={14} /> Eliminar nodo
              </button>
              <button
                onClick={() => {
                  const node = nodes.find(n => n.id === contextMenu.nodeId);
                  if (node) handleNodeClick({} as React.MouseEvent, node);
                  setContextMenu(null);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>
                <Info size={14} /> Ver detalles
              </button>
            </div>
          )}
        </div>

        {/* OBSIDIAN SIDEBAR */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 440, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="glass"
              style={{ display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }} className="text-gradient">{selectedNode.label}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => deleteNode(selectedNode.id)} title="Eliminar nodo"
                    style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setSelectedNode(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                </div>
              </div>
              <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                {selectedNode.note ? (
                  <div>
                    <div style={{ marginBottom: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Materia: {selectedNode.note.grandParentCategory || 'N/A'}
                      </span>
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Rama: {selectedNode.note.category || 'General'}
                      </span>
                    </div>
                    {/* Render HTML or Markdown depending on content type */}
                    {selectedNode.note.markdownEnhanced.startsWith('<') ? (
                      <div className="markdown-preview" style={{ lineHeight: 1.7, fontSize: '14px' }}
                        dangerouslySetInnerHTML={{ __html: selectedNode.note.markdownEnhanced }}
                      />
                    ) : (
                      <div className="markdown-preview" style={{ lineHeight: 1.7, fontSize: '14px' }}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {selectedNode.note.markdownEnhanced.replace(/\[\[(.*?)\]\]/g, '[$1](/tree?node=$1)')}
                        </ReactMarkdown>
                      </div>
                    )}
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => navigate('/tools/editor', { state: { topic: selectedNode.label } })}
                        style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <PenLine size={14} /> Editar nota
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
                    <Network size={36} style={{ margin: '0 auto 14px', opacity: 0.4 }} />
                    <p style={{ marginBottom: '20px', lineHeight: 1.6 }}>Aún no hay apuntes sobre este tema.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button onClick={() => navigate('/tools/editor')}
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '10px 18px', borderRadius: '9999px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', justifyContent: 'center' }}>
                        <PenLine size={16} /> Escribir notas
                      </button>
                      {apiKey && (
                        <button onClick={() => navigate(`/lesson/${encodeURIComponent(selectedNode.label)}`)}
                          style={{ background: 'var(--accent-gradient)', color: 'white', padding: '10px 18px', borderRadius: '9999px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', justifyContent: 'center' }}>
                          <Play size={16} /> Clase Virtual con IA
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
            onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '32px', width: '400px', maxWidth: '90vw' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="var(--accent-blue)" /> Agregar Nodo al Árbol
              </h3>
              <input autoFocus value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNodeManually()}
                placeholder="Ej: Ecuaciones lineales, Biología celular..."
                style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px', fontSize: '16px', marginBottom: '20px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleAddNodeManually} disabled={!newNodeLabel.trim()}
                  style={{ padding: '10px 18px', borderRadius: '8px', background: 'var(--accent-gradient)', color: 'white', border: 'none', cursor: newNodeLabel.trim() ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: newNodeLabel.trim() ? 1 : 0.5 }}>
                  Crear Nodo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
