import { GoogleGenerativeAI } from '@google/generative-ai';
import { useStore } from '../store/useStore';

// Ordered by availability on free tier
const MODEL_CHAIN = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-1.5-flash-8b',
];

export class GeminiError extends Error {
  code: 'NO_KEY' | 'QUOTA_EXCEEDED' | 'OVERLOADED' | 'NOT_FOUND' | 'UNKNOWN';
  constructor(message: string, code: 'NO_KEY' | 'QUOTA_EXCEEDED' | 'OVERLOADED' | 'NOT_FOUND' | 'UNKNOWN') {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

function classifyMsg(msg: string): 'QUOTA_EXCEEDED' | 'OVERLOADED' | 'NOT_FOUND' | 'UNKNOWN' {
  const m = msg.toLowerCase();
  if (m.includes('429') || m.includes('quota') || m.includes('rate limit') || m.includes('too many')) return 'QUOTA_EXCEEDED';
  if (m.includes('503') || m.includes('overloaded') || m.includes('high demand')) return 'OVERLOADED';
  if (m.includes('404') || m.includes('not found')) return 'NOT_FOUND';
  return 'UNKNOWN';
}

export async function callGemini(apiKey: string, prompt: string): Promise<string> {
  let lastErr = '';
  let lastCode: ReturnType<typeof classifyMsg> = 'UNKNOWN';

  for (const modelName of MODEL_CHAIN) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      lastErr = msg;
      lastCode = classifyMsg(msg);
      console.warn(`[Gemini] model=${modelName} error:`, lastCode, msg.substring(0, 120));
      // For quota exceeded, try next model anyway (different models have separate quotas)
      // For unknown errors also try next model
      // Only stop if all models fail
    }
  }

  throw new GeminiError(lastErr, lastCode);
}

// ─── Public helpers ─────────────────────────────────────────────────────────

function getKey(): string {
  const k = useStore.getState().apiKey;
  if (!k) throw new GeminiError('No hay API Key configurada. Ve a Configuración.', 'NO_KEY');
  return k;
}

export async function getNextTopicsFromGemini(currentLearned: string[], category: string): Promise<string[]> {
  const apiKey = getKey();
  const prompt = `Eres un tutor experto. Categoría: "${category}". El usuario ya sabe: [${currentLearned.join(', ') || 'Nada, es principiante'}].
Sugiere exactamente 3 nuevos temas fundamentales a aprender. Responde SOLO con un JSON array de 3 strings. Ejemplo: ["Suma","Resta","Multiplicación"]`;
  const text = await callGemini(apiKey, prompt);
  const match = text.match(/\[[\s\S]*?\]/);
  return JSON.parse(match ? match[0] : text);
}

export async function enhanceNoteInteractive(rawNote: string, topic: string, category: string): Promise<string> {
  const apiKey = getKey();
  const prompt = `Eres un experto en ${category}. El usuario escribió estas notas sobre "${topic}":
"""
${rawNote}
"""
Corrige errores, expande conceptos con lagunas, formatea en Markdown con h2, bullet points, tablas o mermaid si ayuda.
Conserva el conocimiento original. Devuelve SOLO el Markdown sin explicaciones extra.`;
  return await callGemini(apiKey, prompt);
}

export async function evaluateFlashcard(topic: string, answer: string): Promise<{ isCorrect: boolean; feedback: string }> {
  const apiKey = getKey();
  const prompt = `Eres un profesor universitario. Tema: "${topic}". Respuesta del estudiante: "${answer}".
Evalúa si la comprensión es fundamentalmente correcta. Devuelve SOLO JSON plano:
{"isCorrect":boolean,"feedback":"Markdown con retroalimentación detallada, usa TeX si hay fórmulas."}
NO uses bloques \`\`\`json, solo el JSON crudo.`;
  const raw = await callGemini(apiKey, prompt);
  const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

export async function generateExam(topic: string, difficulty: 'fácil' | 'medio' | 'difícil', count: number): Promise<any[]> {
  const apiKey = getKey();
  const prompt = `Genera un examen de ${count} preguntas sobre "${topic}" con dificultad ${difficulty}.
Devuelve SOLO un JSON array válido con esta estructura:
[{"question":"¿Pregunta?","type":"multiple","options":["A","B","C","D"],"correct":"A","explanation":"Por qué..."},...]
Tipos permitidos: "multiple" o "open". Para open no incluyas options.`;
  const text = await callGemini(apiKey, prompt);
  const match = text.match(/\[[\s\S]*\]/);
  return JSON.parse(match ? match[0] : text);
}
