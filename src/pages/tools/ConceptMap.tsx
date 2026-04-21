import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Shapes, Plus, Trash2, Download, Undo2 } from 'lucide-react';


const initialNodes: Node[] = [
  { id: '1', type: 'default', position: { x: 400, y: 50 }, data: { label: 'Concepto Central' }, style: { background: 'rgba(99,102,241,0.3)', border: '2px solid rgba(99,102,241,0.8)', borderRadius: '50px', padding: '8px 18px', color: 'white', fontWeight: 700, fontSize: '14px' } },
];

const shapeStyles = {
  rounded: { borderRadius: '8px' },
  oval: { borderRadius: '50px' },
  box: { borderRadius: '2px' },
  diamond: { transform: 'rotate(45deg)', borderRadius: '4px' },
};

const nodeColors = [
  'rgba(99,102,241,0.3)',
  'rgba(16,185,129,0.3)',
  'rgba(245,158,11,0.3)',
  'rgba(239,68,68,0.3)',
  'rgba(139,92,246,0.3)',
  'rgba(14,165,233,0.3)',
];
const borderColors = [
  'rgba(99,102,241,0.8)',
  'rgba(16,185,129,0.8)',
  'rgba(245,158,11,0.8)',
  'rgba(239,68,68,0.8)',
  'rgba(139,92,246,0.8)',
  'rgba(14,165,233,0.8)',
];

export default function ConceptMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedShape, setSelectedShape] = useState<keyof typeof shapeStyles>('oval');
  const [newLabel, setNewLabel] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');
  const idRef = useRef(2);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);

  const saveHistory = () => setHistory(h => [...h.slice(-20), { nodes: [...nodes], edges: [...edges] }]);

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({
      ...params,
      label: edgeLabel || undefined,
      style: { stroke: borderColors[selectedColor], strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: borderColors[selectedColor] },
      animated: false,
    }, eds));
    setEdgeLabel('');
  }, [selectedColor, edgeLabel, setEdges]);

  const addNode = () => {
    if (!newLabel.trim()) return;
    saveHistory();
    const newNode: Node = {
      id: String(idRef.current++),
      type: 'default',
      position: { x: 200 + Math.random() * 400, y: 150 + Math.random() * 300 },
      data: { label: newLabel.trim() },
      style: {
        background: nodeColors[selectedColor],
        border: `2px solid ${borderColors[selectedColor]}`,
        color: 'white',
        fontWeight: 600,
        fontSize: '13px',
        ...shapeStyles[selectedShape],
      },
    };
    setNodes(ns => [...ns, newNode]);
    setNewLabel('');
  };

  const deleteSelected = useCallback(() => {
    saveHistory();
    setNodes(ns => ns.filter(n => !n.selected));
    setEdges(es => es.filter(e => !e.selected));
  }, [nodes, edges]);

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistory(h => h.slice(0, -1));
  };

  const exportSVG = () => {
    const svg = document.querySelector('.react-flow__viewport')?.parentElement?.innerHTML;
    if (!svg) return;
    const blob = new Blob([`<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mapa-conceptual.svg';
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Shapes size={26} color="var(--accent-blue)" />
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Mapa Conceptual</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Arrastra nodos, conecta conceptos, construye conocimiento</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', borderRadius: '10px', alignItems: 'center' }}>
        {/* Add node */}
        <input
          value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNode()}
          placeholder="Nombre del concepto..."
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', padding: '8px 12px', borderRadius: '8px', width: '200px', fontSize: '14px' }}
        />
        <button onClick={addNode} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-gradient)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
          <Plus size={14} /> Agregar
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

        {/* Color picker */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {nodeColors.map((c, i) => (
            <button key={i} onClick={() => setSelectedColor(i)} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: selectedColor === i ? `2px solid white` : `1px solid ${borderColors[i]}`, cursor: 'pointer' }} />
          ))}
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

        {/* Shapes */}
        {(Object.keys(shapeStyles) as (keyof typeof shapeStyles)[]).map(s => (
          <button key={s} onClick={() => setSelectedShape(s)}
            style={{ padding: '4px 10px', borderRadius: s === 'oval' ? '20px' : s === 'box' ? '2px' : '6px', border: `1px solid ${selectedShape === s ? borderColors[selectedColor] : 'var(--border-color)'}`, background: selectedShape === s ? nodeColors[selectedColor] : 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
            {s}
          </button>
        ))}

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

        {/* Edge label */}
        <input
          value={edgeLabel} onChange={e => setEdgeLabel(e.target.value)}
          placeholder="Etiqueta de flecha..."
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', padding: '6px 10px', borderRadius: '8px', width: '150px', fontSize: '13px' }}
        />

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <button onClick={undo} title="Deshacer" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
          <Undo2 size={14} /> Deshacer
        </button>
        <button onClick={deleteSelected} title="Eliminar seleccionados" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
          <Trash2 size={14} /> Eliminar
        </button>
        <button onClick={exportSVG} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
          <Download size={14} /> Exportar
        </button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', minHeight: '500px' }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          deleteKeyCode="Delete"
          style={{ background: '#0d0d1a' }}
        >
          <Controls style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
          <MiniMap
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
            nodeColor={n => (n.style?.background as string) || 'rgba(99,102,241,0.5)'}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.04)" />
          <Panel position="top-right">
            <div style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div>• <strong>Clic + Arrastrar</strong> para mover</div>
              <div>• <strong>Conectar</strong>: arrastra desde el punto de un nodo</div>
              <div>• <strong>Delete</strong>: eliminar seleccionado</div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
