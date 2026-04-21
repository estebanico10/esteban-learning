import { GoogleGenerativeAI } from '@google/generative-ai';
import { useStore } from '../store/useStore';

export const getNextTopicsFromGemini = async (currentLearned: string[], category: string): Promise<string[]> => {
  const apiKey = useStore.getState().apiKey;
  if (!apiKey) {
    throw new Error("No API Key configured. Please go to settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using a fast, widely available model

  const prompt = `
    You are an expert tutor. The user is exploring a knowledge tree in the category: "${category}".
    The user already knows the following topics: [${currentLearned.length > 0 ? currentLearned.join(', ') : 'Nothing yet, they are a beginner'}].
    
    Based on what they know, suggest exactly 3 new logical foundational topics they should learn next.
    Reply ONLY with a valid JSON array of 3 strings. Example: ["Suma", "Resta", "Números pares"]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON array in case there are backticks
    const jsonStrMatch = text.match(/\[.*\]/s);
    if(jsonStrMatch) {
      return JSON.parse(jsonStrMatch[0]);
    }
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini API Error:", err);
    throw new Error("Error generating recommendations from Gemini.");
  }
};

export const enhanceNoteInteractive = async (rawNote: string, topic: string, category: string): Promise<string> => {
  const apiKey = useStore.getState().apiKey;
  if (!apiKey) throw new Error("No API Key configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are an expert tutor and note-taker. The user has written rough, scattered class notes about "${topic}" in the domain of "${category}".
    
    Here are their raw notes:
    """
    ${rawNote}
    """

    Your task:
    1. Correct any spelling or grammar mistakes.
    2. Expand upon the concepts seamlessly where the user left gaps (complete the knowledge).
    3. Format it beautifully in Markdown. Use h2, bullet points, and add a quick summary table or diagrams (using markdown or mermaid) if applicable.
    4. Keep the original knowledge intact but make it read like an official, polished Notion doc or Wikipedia page.
    
    Do NOT output JSON. Output ONLY the beautifully formatted raw Markdown string.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    console.error("Gemini Note Error:", err);
    throw new Error("Error enhancing note with Gemini.");
  }
};

export const evaluateFlashcard = async (topic: string, answer: string): Promise<{ isCorrect: boolean, feedback: string }> => {
  const apiKey = useStore.getState().apiKey;
  if (!apiKey) throw new Error("No API Key configured.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `
  Eres un profesor exigente per justo de la universidad.
  El usuario está estudiando el tema: "${topic}".
  Ha respondido con este texto o fórmula: "${answer}".
  
  Tu trabajo es evaluar si la comprensión es fundamentalmente CORRECTA.
  Si está sumamente incompleta, esotérica o mal, es incorrecta.
  Devuelve ESTRICTAMENTE JSON plano usando este schema:
  {
    "isCorrect": boolean,
    "feedback": "string detallado en Markdown donde lo felicites o le corrijas usando TeX matemáticamente si es necesario. Explícale por qué."
  }
  NO uses corchetes bloque markdown como \`\`\`json. Solo el texto crudo JSON.
  `;
  try {
    const response = await model.generateContent(prompt);
    let txt = response.response.text().trim();
    if (txt.startsWith('\`\`\`json')) txt = txt.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
    return JSON.parse(txt);
  } catch (e) {
    return { isCorrect: false, feedback: "Error de red evaluando la tarjeta. Intenta nuevamente." };
  }
};
