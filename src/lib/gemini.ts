import { GoogleGenerativeAI } from '@google/generative-ai';
import { useStore } from '../store/useStore';

// Priority order: newest stable → fallback → legacy
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

// Typed error codes so UI can show the right message
export class GeminiError extends Error {
  code: 'NO_KEY' | 'QUOTA_EXCEEDED' | 'OVERLOADED' | 'NOT_FOUND' | 'UNKNOWN';
  constructor(
    message: string,
    code: 'NO_KEY' | 'QUOTA_EXCEEDED' | 'OVERLOADED' | 'NOT_FOUND' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

function classifyError(e: unknown): GeminiError {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many requests')) {
    return new GeminiError('Cuota de solicitudes agotada. Espera unos minutos o regresa mañana.', 'QUOTA_EXCEEDED');
  }
  if (msg.includes('503') || msg.includes('high demand') || msg.includes('overloaded')) {
    return new GeminiError('El servidor de IA está saturado temporalmente. Reintenta en unos segundos.', 'OVERLOADED');
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return new GeminiError('Modelo no disponible para esta clave API.', 'NOT_FOUND');
  }
  return new GeminiError(e instanceof Error ? e.message : String(e), 'UNKNOWN');
}

/** Intenta generar contenido con fallback automático entre modelos */
async function generateWithFallback(apiKey: string, prompt: string): Promise<string> {
  let lastError: GeminiError | null = null;

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e) {
      const classified = classifyError(e);
      lastError = classified;
      // Only continue to next model for NOT_FOUND or OVERLOADED — for QUOTA_EXCEEDED stop immediately
      if (classified.code === 'QUOTA_EXCEEDED') break;
      if (classified.code === 'NOT_FOUND') continue;
      if (classified.code === 'OVERLOADED') continue;
      // UNKNOWN — stop
      break;
    }
  }

  throw lastError ?? new GeminiError('Error desconocido de la IA.', 'UNKNOWN');
}

// ─── PUBLIC FUNCTIONS ────────────────────────────────────────────────────────

export const getNextTopicsFromGemini = async (currentLearned: string[], category: string): Promise<string[]> => {
  const apiKey = useStore.getState().apiKey;
  if (!apiKey) throw new GeminiError('No hay API Key configurada.', 'NO_KEY');

  const prompt = `
    Eres un tutor experto. El usuario está explorando un árbol de conocimiento en la categoría: "${category}".
    El usuario ya conoce los siguientes temas: [${currentLearned.length > 0 ? currentLearned.join(', ') : 'Nada todavía, es un principiante'}].
    
    Basado en lo que saben, sugiere exactamente 3 nuevos temas fundamentales a aprender a continuación.
    Responde SOLO con un array JSON válido de 3 strings. Ejemplo: ["Suma", "Resta", "Números pares"]
  `;

  const text = await generateWithFallback(apiKey, prompt);
  const jsonStrMatch = text.match(/\[.*\]/s);
  if (jsonStrMatch) return JSON.parse(jsonStrMatch[0]);
  return JSON.parse(text);
};

export const enhanceNoteInteractive = async (rawNote: string, topic: string, category: string): Promise<string> => {
  const apiKey = useStore.getState().apiKey;
  if (!apiKey) throw new GeminiError('No hay API Key configurada.', 'NO_KEY');

  const prompt = `
    Eres un tutor experto y tomador de notas. El usuario ha escrito notas de clase sobre "${topic}" en el dominio de "${category}".
    
    Notas crudas:
    """
    ${rawNote}
    """

    Tu tarea:
    1. Corrige errores de ortografía o gramática.
    2. Expande los conceptos donde el usuario dejó lagunas.
    3. Formatealo en Markdown: usa h2, bullet points, y añade tablas o diagramas mermaid si aplica.
    4. Conserva el conocimiento original pero hazlo leer como un documento oficial de Notion o Wikipedia.
    
    NO devuelvas JSON. Devuelve SOLO el string Markdown formateado.
  `;

  return await generateWithFallback(apiKey, prompt);
};

export const evaluateFlashcard = async (topic: string, answer: string): Promise<{ isCorrect: boolean; feedback: string }> => {
  const apiKey = useStore.getState().apiKey;
  if (!apiKey) throw new GeminiError('No hay API Key configurada.', 'NO_KEY');

  const prompt = `
  Eres un profesor exigente pero justo de la universidad.
  El usuario está estudiando el tema: "${topic}".
  Ha respondido con este texto o fórmula: "${answer}".
  
  Evalúa si la comprensión es fundamentalmente CORRECTA.
  Si está sumamente incompleta o mal, es incorrecta.
  Devuelve ESTRICTAMENTE JSON plano:
  {
    "isCorrect": boolean,
    "feedback": "string detallado en Markdown donde lo felicites o corrijas usando TeX matemáticamente si es necesario."
  }
  NO uses bloques markdown como \`\`\`json. Solo el JSON crudo.
  `;

  const txt = await generateWithFallback(apiKey, prompt);
  const cleaned = txt.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
};
