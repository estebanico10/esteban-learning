import { openDB, type DBSchema } from 'idb';

export interface Slide {
  type: 'theory' | 'quiz';
  content?: string;
  question?: string;
  options?: string[];
  correct?: string;
  explanation?: string;
}

export interface KnowledgeBlock {
  id: string;
  topic: string;
  type: 'theory' | 'quiz';
  contentSnippet: string; 
  fullContent: Slide;
  timestamp: number;
}

export interface Profile {
  id: string;
  name: string;
  bio: string;
  targetDegree: string;
}

export interface Note {
  id: string;
  topic: string; // Rama final (e.g. Suma)
  category: string; // Rama padre (e.g. Aritmética)
  grandParentCategory?: string; // Rama abuelo (e.g. Matemáticas)
  rawContent: string; // Lo que el usuario tecleó rápido
  markdownEnhanced: string; // Generado por IA
  timestamp: number;
}

interface LearnOSDB extends DBSchema {
  lessons: {
    key: string; 
    value: {
      topic: string;
      slides: Slide[];
      completedAt: number;
    }
  };
  blocks: {
    key: string;
    value: KnowledgeBlock;
    indexes: { 'by-topic': string };
  };
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-topic': string, 'by-category': string };
  };
  profile: {
    key: string;
    value: { id: string; data: any };
  };
}

const DB_NAME = 'learnos-db';
const DB_VERSION = 3;

export const initDB = async () => {
  const db = await openDB<LearnOSDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('lessons', { keyPath: 'topic' });
        const blockStore = db.createObjectStore('blocks', { keyPath: 'id' });
        blockStore.createIndex('by-topic', 'topic');
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('by-topic', 'topic');
        notesStore.createIndex('by-category', 'category');
      }
      // UPDATE V3: Perfil
      if (oldVersion < 3 && !db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }
    },
  });
  return db;
};

export const getProfileLocally = async (): Promise<Profile | null> => {
  const db = await initDB();
  const profile = await db.get('profile', 'user');
  return profile ? (profile.data as Profile) : null;
};

export const saveProfileLocally = async (profile: Profile) => {
  const db = await initDB();
  await db.put('profile', { id: 'user', data: profile });
};

export const saveLessonLocally = async (topic: string, slides: Slide[]) => {
  const db = await initDB();
  
  // Guardamos la lección completa
  await db.put('lessons', {
    topic: topic.toLowerCase(),
    slides,
    completedAt: Date.now()
  });

  // Convertimos las slides en bloques modulares para reutilización
  const tx = db.transaction('blocks', 'readwrite');
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    let snippet = '';
    if (s.type === 'theory' && s.content) {
      snippet = s.content.substring(0, 150) + '...'; // Snippet para contexto AI
    } else if (s.type === 'quiz' && s.question) {
      snippet = s.question;
    }
    
    await tx.store.put({
      id: crypto.randomUUID(),
      topic: topic.toLowerCase(),
      type: s.type,
      contentSnippet: snippet,
      fullContent: s,
      timestamp: Date.now()
    });
  }
  await tx.done;
};

export const getLessonLocally = async (topic: string): Promise<Slide[] | null> => {
  const db = await initDB();
  const lesson = await db.get('lessons', topic.toLowerCase());
  return lesson ? lesson.slides : null;
};

// Ontenemos los bloques recientes (hasta un maximo) aleatorios o los últimos 5 para inyectarlos en prompt
export const getContextBlocksForAI = async (limit: number = 5): Promise<KnowledgeBlock[]> => {
  const db = await initDB();
  const allBlocks = await db.getAll('blocks');
  // Filtramos o tomamos sorteados (las ultimas aprendidas para seguir el hilo)
  allBlocks.sort((a, b) => b.timestamp - a.timestamp);
  return allBlocks.slice(0, limit);
};

// =======================
// NOTES VAULT (Libreta IA)
// =======================
export const saveNoteLocally = async (note: Note) => {
  const db = await initDB();
  await db.put('notes', note);
};

export const getAllNotes = async (): Promise<Note[]> => {
  const db = await initDB();
  const notes = await db.getAll('notes');
  return notes.sort((a, b) => b.timestamp - a.timestamp); // Mas recientes primero
};

export const getNoteById = async (id: string): Promise<Note | undefined> => {
  const db = await initDB();
  return await db.get('notes', id);
};
