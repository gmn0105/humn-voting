import { GoogleGenAI } from "@google/genai";

let _gemini: InstanceType<typeof GoogleGenAI> | null = null;

export function getGemini(): InstanceType<typeof GoogleGenAI> {
  if (!_gemini) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is required for summary");
    _gemini = new GoogleGenAI({ apiKey: key });
  }
  return _gemini;
}