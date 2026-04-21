import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { Background, Controls, BackgroundVariant, addEdge } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';
import { getNextTopicsFromGemini } from '../lib/gemini';
import { getAllNotes, type Note } from '../lib/db';
import { Network, Sparkles, Loader2, Play, FileText, X, Plus, PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function KnowledgeTree() {
  const { learnedNodes, apiKey, treeNodes: nodes, treeEdges: edges, setTreeItems } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dbNotes, setDbNotes] = useState<Note[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string; isLearned: boolean; note?: Note } | null>(null);
  
  // Manual node creation
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotes = async () => {
      const notes = await getAllNotes();
      setDbNotes(notes);
      
      let newNodes: Node[] = [];
      let newEdges: Edge[] = [];
      
      notes.forEach((note) => {
        if (!nodes.find(n => n.data.label.toLowerCase() === note.topic.toLowerCase())) {
          newNodes.push({
            id: `note-gen-${note.id}`,
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            data: { label: note.topic }
          });
        }
      });
      if (newNodes.length > 0) {
        setTreeItems([...nodes, ...newNodes], [...edges, ...newEdges]);
      }
    };
    fetchNotes();
  }, []);

  const onConnect = useCallback((params: any) => setTreeItems(nodes, addEdge(params, edges)), [nodes, edges, setTreeItems]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    const label = typeof node.data.label === 'string' ? node.data.label : (node.data as any)._rawLabel || 'Unknown';
    const learnedData = learnedNodes.find(ln => ln.topic.toLowerCase() === label.toLowerCase());
    const noteData = dbNotes.find(n => n.topic.toLowerCase() === label.toLowerCase());
    
    setSelectedNode({
      id: node.id,
      label: label,
      isLearned: !!learnedData,
      note: noteData
    });
  };

  const handleAddNodeManually = () => {
    if (!newNodeLabel.trim()) return;
    
    let maxY = 0;
    let maxX = 0;
    nodes.forEach(n => { 
      if (n.position.y > maxY) maxY = n.position.y; 
      if (n.position.x > maxX) maxX = n.position.x; 
    });
    
    const newNode: Node = {
      id: `manual-${Date.now()}`,
      position: { x: 200 + Math.random() * 300, y: maxY + 120 },
      data: { label: newNodeLabel.trim() }
    };
    
    // Connect to the last node or the root
    const parentId = nodes.length > 0 ? nodes[nodes.length - 1].id : '1';
    const newEdge: Edge = {
      id: `e-manual-${Date.now()}`,
      source: parentId,
      target: newNode.id,
      animated: true,
      style: { stroke: 'var(--accent-purple)' }
    };
    
    setTreeItems([...nodes, newNode], [...edges, newEdge]);
    setNewNodeLabel('');
    setShowAddModal(false);
  };

  const expandTreeAI = async () => {
    if (!apiKey) {
      setErrorMsg("Configura tu API Key en Configuración para usar la IA. Puedes agregar nodos manualmente con el botón '+'.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const topLearned = learnedNodes.map(n => n.topic);
      const lastLearned = topLearned.length > 0 ? topLearned : ["Ciencia General"];
      const newTopics = await getNextTopicsFromGemini(lastLearned, "Ciencias y Tecnología");
      
      let maxY = 0;
      nodes.forEach(n => { if (n.position.y > maxY) maxY = n.position.y; });
      const sourceNodeId = nodes[nodes.length - 1].id;
      
      const newNodes = newTopics.map((topic, index) => ({
        id: String(nodes.length + index + 1000),
        position: { x: 200 + (index * 200), y: maxY + 150 },
        data: { label: topic }
      }));

      const newEdges = newTopics.map((_, index) => ({
        id: `e${sourceNodeId}-${nodes.length + index + 1000}`,
        source: sourceNodeId,
        target: String(nodes.length + index + 1000),
        animated: true,
        style: { stroke: 'var(--accent-blue)' }
      }));

      setTreeItems([...nodes, ...newNodes], [...edges, ...newEdges]);
    } catch (e: any) {
      const msg = e.message || "Error al expandir el árbol";
      if (msg.includes('503') || msg.includes('high demand')) {
        setErrorMsg("IA temporalmente saturada (Error 503). Puedes agregar temas manualmente con el botón '+'.");
      } else {
        setErrorMsg(msg + " — Usa el botón '+' para agregar nodos manualmente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={28} className="text-gradient" />
            <h2 style={{ fontSize: '28px' }}>Grafo de Conocimiento (Obsidian Mode)</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Haz clic en un nodo para leer sus apuntes o tomar una lección.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '12px 20px', borderRadius: 'var(--radius-full)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', cursor: 'pointer'
            }}
          >
            <Plus size={18} /> Agregar Nodo
          </button>
          <button 
            onClick={expandTreeAI}
            disabled={loading}
            style={{
              background: apiKey ? 'var(--accent-gradient)' : 'var(--bg-secondary)', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : (apiKey ? 1 : 0.5), border: apiKey ? 'none' : '1px solid var(--border-color)', cursor: loading ? 'not-allowed' : 'pointer'
            }}
            title={!apiKey ? 'Necesitas API Key para expandir con IA' : ''}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Expandir con IA
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'transparent', color: '#f59e0b', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Add Node Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '32px', width: '400px', maxWidth: '90vw' }}
            >
              <h3 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="var(--accent-blue)" /> Agregar Nodo al Árbol
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', lineHeight: 1.5 }}>
                Escribe el nombre del tema que quieres agregar. Podrás crear notas sobre él después.
              </p>
              <input 
                autoFocus
                value={newNodeLabel}
                onChange={e => setNewNodeLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNodeManually()}
                placeholder="Ej: Ecuaciones cuadráticas, Biología celular..."
                style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '16px', marginBottom: '20px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleAddNodeManually} disabled={!newNodeLabel.trim()} style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-gradient)', color: 'white', border: 'none', cursor: newNodeLabel.trim() ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: newNodeLabel.trim() ? 1 : 0.5 }}>
                  Crear Nodo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
        {/* REACT FLOW GRAPH */}
        <div className="glass" style={{ flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
          <ReactFlow
            nodes={nodes.map(n => {
              const rawLabel = typeof n.data.label === 'string' ? n.data.label : '';
              const learnedData = learnedNodes.find(ln => ln.topic.toLowerCase() === rawLabel.toLowerCase());
              const hasNote = dbNotes.some(note => note.topic.toLowerCase() === rawLabel.toLowerCase());
              const isLearned = !!learnedData;
              
              let bg = 'var(--bg-secondary)';
              let border = '1px solid var(--border-color)';
              if (isLearned) {
                 bg = 'var(--accent-green)';
                 border = '2px solid rgba(255,255,255,0.5)';
              } else if (hasNote) {
                 bg = 'var(--accent-purple)';
                 border = '2px solid rgba(255,255,255,0.3)';
              }

              return {
                ...n,
                data: { 
                  ...n.data,
                  _rawLabel: rawLabel,
                  label: (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                        {hasNote && <FileText size={14}/>} {rawLabel}
                      </span>
                    </div>
                  )
                },
                style: {
                   background: bg,
                   color: 'white',
                   border: border,
                   borderRadius: 'var(--radius-sm)',
                   padding: '12px 20px',
                   boxShadow: isLearned || hasNote ? '0 0 15px rgba(0, 0, 0, 0.3)' : 'var(--shadow-sm)',
                   cursor: 'pointer',
                   fontWeight: 600
                },
              };
            })}
            edges={edges}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--border-color)" />
            <Controls style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', overflow: 'hidden' }} />
          </ReactFlow>
        </div>

        {/* SIDEBAR PANEL (OBSIDIAN STYLE PREVIEW) */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 450, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="glass"
              style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
            >
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h3 style={{ fontSize: '20px', fontWeight: 700 }} className="text-gradient">{selectedNode.label}</h3>
                 <button onClick={() => setSelectedNode(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
              </div>

              <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                 {selectedNode.note ? (
                    <div>
                      <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                         <span style={{background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px'}}>
                           Materia: {selectedNode.note.grandParentCategory || 'N/A'}
                         </span>
                         <span style={{background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px'}}>
                           Rama: {selectedNode.note.category || 'General'}
                         </span>
                      </div>
                      <div className="markdown-preview" style={{ lineHeight: 1.6, fontSize: '15px' }}>
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
                          {selectedNode.note.markdownEnhanced.replace(/\[\[(.*?)\]\]/g, '[$1](/tree?node=$1)')}
                        </ReactMarkdown>
                      </div>
                    </div>
                 ) : (
                    <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
                      <Network size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                      <p style={{ marginBottom: '24px' }}>Aún no hay apuntes sobre esta rama.</p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button 
                          onClick={() => navigate('/tools/editor')}
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: 'var(--radius-full)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', justifyContent: 'center' }}
                        >
                          <PenLine size={18} /> Escribir Notas Manualmente
                        </button>
                        
                        {apiKey && (
                          <button 
                            onClick={() => navigate(`/lesson/${encodeURIComponent(selectedNode.label)}`)}
                            style={{ background: 'var(--accent-gradient)', color: 'white', padding: '10px 20px', borderRadius: 'var(--radius-full)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', justifyContent: 'center' }}
                          >
                            <Play size={18} /> Iniciar Clase Virtual con IA
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
    </div>
  );
}
