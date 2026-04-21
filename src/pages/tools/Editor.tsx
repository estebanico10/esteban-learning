import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { useState, useRef } from 'react';
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Link2, Image as ImageIcon,
  Table as TableIcon, CheckSquare, Undo, Redo, Save, Wand2, Loader2,
  CheckCircle2, AlertTriangle, Upload, FileText, X
} from 'lucide-react';
import { enhanceNoteInteractive } from '../../lib/gemini';
import { saveNoteLocally } from '../../lib/db';
import { useStore } from '../../store/useStore';
import './Editor.css';

// ── TOOLBAR BUTTON ─────────────────────────────────────────────────────────
function ToolBtn({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        background: active ? 'rgba(99,102,241,0.3)' : 'transparent',
        border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
        color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
        padding: '5px 8px',
        borderRadius: '5px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '30px',
        height: '30px',
        transition: 'all 0.15s',
        fontSize: '13px',
        fontWeight: 600,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(99,102,241,0.3)' : 'transparent'; }}
    >
      {children}
    </button>
  );
}

const Sep = () => <div style={{ width: '1px', height: '22px', background: 'var(--border-color)', margin: '0 4px', alignSelf: 'center' }} />;

// ── MAIN EDITOR ────────────────────────────────────────────────────────────
export default function Editor() {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('');
  const [grandParent, setGrandParent] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showFileModal, setShowFileModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateNodeProgress, apiKey } = useStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { languageClassPrefix: 'language-' },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { style: 'color: var(--accent-blue); cursor: pointer;' } }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Highlight.configure({ multicolor: true }),
      Typography,
    ],
    content: '<p>Empieza a escribir tus notas aquí...</p>',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'true',
      },
    },
  });

  const addLink = () => {
    const url = window.prompt('URL del enlace:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('URL de la imagen:');
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  };

  const insertTable = () => {
    if (editor) editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const insertCodeBlock = () => {
    if (editor) editor.chain().focus().toggleCodeBlock().run();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'txt' || ext === 'md') {
      const text = await file.text();
      editor.commands.setContent(`<pre>${text}</pre>`);
    } else if (ext === 'html') {
      const text = await file.text();
      editor.commands.setContent(text);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          editor.chain().focus().setImage({ src: ev.target.result as string }).run();
        }
      };
      reader.readAsDataURL(file);
    } else {
      const text = await file.text();
      editor.commands.insertContent(`<p><code>${text.substring(0, 5000)}</code></p>`);
    }
    setShowFileModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEnhance = async () => {
    if (!topic || !editor) return;
    if (!apiKey) { setErrorMsg('Configura tu API Key en Configuración para usar la IA.'); return; }
    const rawText = editor.getText();
    if (!rawText.trim()) return;
    setIsEnhancing(true);
    setErrorMsg('');
    try {
      const result = await enhanceNoteInteractive(rawText, topic, category || 'General');
      // Convert markdown-ish result to HTML for TipTap
      editor.commands.setContent(`<div>${result.replace(/\n/g, '<br/>')}</div>`);
    } catch (e: any) {
      setErrorMsg('Error IA: ' + (e.message || 'Intenta de nuevo'));
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSaveNote = async () => {
    if (!topic) { setErrorMsg('Escribe el Tema antes de guardar.'); return; }
    if (!editor || editor.getText().trim().length < 5) { setErrorMsg('Escribe algo en el editor antes de guardar.'); return; }
    setErrorMsg('');
    const htmlContent = editor.getHTML();
    const textContent = editor.getText();
    await saveNoteLocally({
      id: crypto.randomUUID(),
      topic,
      category: category || 'General',
      grandParentCategory: grandParent || 'Sin clasificar',
      rawContent: textContent,
      markdownEnhanced: htmlContent,
      timestamp: Date.now()
    });
    updateNodeProgress(topic, 25, 25, category || 'General', grandParent || 'Sin clasificar');
    setSavedMsg('¡Guardado en tu Árbol de Conocimiento!');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  if (!editor) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>

      {/* — Meta fields — */}
      <div className="glass" style={{ display: 'flex', gap: '10px', padding: '12px 16px', alignItems: 'center', flexWrap: 'wrap', borderRadius: '10px' }}>
        <FileText size={20} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
        {[
          { ph: 'Materia (ej. Física)', val: grandParent, set: setGrandParent, flex: 1 },
          { ph: 'Área (ej. Dinámica)', val: category, set: setCategory, flex: 1 },
          { ph: 'Tema (ej. Leyes de Newton)', val: topic, set: setTopic, flex: 1.5, accent: true },
        ].map((f, i) => (
          <input key={i} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
            style={{ flex: f.flex, background: f.accent ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${f.accent ? 'var(--accent-blue)' : 'var(--border-color)'}`, color: 'white', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}
          />
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace' }}>
          {editor.storage?.characterCount?.characters?.() ?? ''} chars
        </span>
      </div>

      {/* — Alerts — */}
      {savedMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid var(--accent-green)', borderRadius: '8px', color: 'var(--accent-green)', fontSize: '14px' }}>
          <CheckCircle2 size={16} /> {savedMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#f59e0b', fontSize: '13px' }}>
          <span><AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px' }} />{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b' }}><X size={14} /></button>
        </div>
      )}
      {!apiKey && (
        <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
          💡 Sin API Key — el "Magic Enhancer" de IA está desactivado. Puedes escribir y guardar normalmente.
        </div>
      )}

      {/* — Main Editor + Toolbar — */}
      <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '10px', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>

          {/* History */}
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Deshacer (Ctrl+Z)"><Undo size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Rehacer (Ctrl+Y)"><Redo size={14} /></ToolBtn>

          <Sep />

          {/* Headings */}
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título H1"><Heading1 size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título H2"><Heading2 size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título H3"><Heading3 size={14} /></ToolBtn>

          <Sep />

          {/* Text formatting */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita (Ctrl+B)"><Bold size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva (Ctrl+I)"><Italic size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado"><Strikethrough size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Resaltar"><span style={{ fontSize: '12px' }}>H</span></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código en línea"><Code size={14} /></ToolBtn>

          <Sep />

          {/* Lists */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista con viñetas"><List size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleTaskList?.().run()} active={editor.isActive('taskList')} title="Lista de tareas"><CheckSquare size={14} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cita"><Quote size={14} /></ToolBtn>

          <Sep />

          {/* Insert */}
          <ToolBtn onClick={addLink} active={editor.isActive('link')} title="Insertar enlace"><Link2 size={14} /></ToolBtn>
          <ToolBtn onClick={addImage} title="Insertar imagen (URL)"><ImageIcon size={14} /></ToolBtn>
          <ToolBtn onClick={insertTable} title="Insertar tabla"><TableIcon size={14} /></ToolBtn>
          <ToolBtn onClick={insertCodeBlock} active={editor.isActive('codeBlock')} title="Bloque de código"><span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{'</>'}</span></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Separador"><Minus size={14} /></ToolBtn>

          <Sep />

          {/* File upload */}
          <ToolBtn onClick={() => setShowFileModal(true)} title="Subir archivo (.txt, .md, .html, imagen)">
            <Upload size={14} />
          </ToolBtn>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* AI Enhance */}
          <button onMouseDown={e => { e.preventDefault(); handleEnhance(); }} disabled={isEnhancing || !apiKey}
            title={!apiKey ? 'Necesitas API Key' : 'Mejorar nota con IA'}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: apiKey ? 'var(--accent-purple)' : 'rgba(255,255,255,0.06)', color: 'white', padding: '5px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: 600, opacity: !apiKey ? 0.4 : 1, cursor: !apiKey ? 'not-allowed' : 'pointer', border: 'none' }}>
            {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Magic IA
          </button>

          {/* Save */}
          <button onMouseDown={e => { e.preventDefault(); handleSaveNote(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-green)', color: 'white', padding: '5px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', marginLeft: '4px' }}>
            <Save size={14} /> Guardar
          </button>
        </div>

        {/* TipTap editor area */}
        <EditorContent editor={editor} style={{ flex: 1, overflow: 'auto' }} />
      </div>

      {/* File Upload Modal */}
      {showFileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setShowFileModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '32px', width: '480px', maxWidth: '90vw' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={20} color="var(--accent-blue)" /> Subir archivo
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 }}>
              Acepta: <strong>.txt</strong>, <strong>.md</strong>, <strong>.html</strong> (Notion export), imágenes (PNG, JPG, GIF).
              El contenido se insertará en el editor.
            </p>
            <div
              style={{ border: '2px dashed var(--border-color)', borderRadius: '10px', padding: '40px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--border-color)';
                if (e.dataTransfer.files[0]) {
                  const fakeEvt = { target: { files: e.dataTransfer.files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileUpload(fakeEvt);
                }
              }}
            >
              <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Arrastra y suelta un archivo aquí</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>o haz clic para buscar</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.html,.htm,.png,.jpg,.jpeg,.gif,.webp" style={{ display: 'none' }} onChange={handleFileUpload} />
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>¿Vienes de Notion?</strong> Exporta tu página en Notion como "HTML" y súbela aquí. El contenido se importará directamente.
            </div>
            <button onClick={() => setShowFileModal(false)} style={{ marginTop: '16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', width: '100%' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
