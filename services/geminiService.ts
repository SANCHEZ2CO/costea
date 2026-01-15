import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeImage = async (base64Image: string, prompt: string = "Analiza esta imagen. Si es una factura, extrae los ingredientes y sus precios. Si es un plato de comida, estima los ingredientes visibles.") => {
    try {
        const model = 'gemini-3-pro-preview';
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Image
                        }
                    },
                    { text: prompt }
                ]
            }
        });
        return response.text;
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        return "No pude analizar la imagen correctamente.";
    }
};

export const generateChatResponse = async (history: { role: string; parts: { text: string }[] }[], message: string) => {
    try {
        const model = 'gemini-3-flash-preview';
        const response = await ai.models.generateContent({
            model: model,
            contents: [
                ...history,
                { role: 'user', parts: [{ text: message }] }
            ]
        });
        return response.text;
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "Lo siento, no pude procesar tu solicitud.";
    }
};