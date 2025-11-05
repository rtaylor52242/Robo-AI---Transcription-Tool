import { GoogleGenAI, Type } from "@google/genai";

export const transcribeAudio = async (base64Audio: string, mimeType: string, language: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const audioPart = {
        inlineData: {
            mimeType: mimeType,
            data: base64Audio,
        },
    };

    const textPart = {
        text: `Please transcribe this audio recording accurately and provide the final text in ${language}.`
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, audioPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error during transcription:", error);
        if (error instanceof Error) {
            return `Transcription failed: ${error.message}`;
        }
        return "An unknown error occurred during transcription.";
    }
};

export interface WordMetrics {
    wordCount: number;
    characterCount: number;
    verbCount: number;
    nounCount: number;
    adjectiveCount: number;
    conjunctionCount: number;
    profanityCount: number;
}

export const analyzeTextMetrics = async (text: string): Promise<WordMetrics> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const schema = {
        type: Type.OBJECT,
        properties: {
            wordCount: { type: Type.INTEGER, description: "Total number of words in the text." },
            characterCount: { type: Type.INTEGER, description: "Total number of characters in the text, including spaces." },
            verbCount: { type: Type.INTEGER, description: "Total number of verbs." },
            nounCount: { type: Type.INTEGER, description: "Total number of nouns." },
            adjectiveCount: { type: Type.INTEGER, description: "Total number of adjectives." },
            conjunctionCount: { type: Type.INTEGER, description: "Total number of conjunctions." },
            profanityCount: { type: Type.INTEGER, description: "Total number of profane or curse words." },
        },
        required: ["wordCount", "characterCount", "verbCount", "nounCount", "adjectiveCount", "conjunctionCount", "profanityCount"],
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following text and provide counts for the specified metrics. Text: "${text}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        
        const jsonString = response.text.trim();
        const metrics: WordMetrics = JSON.parse(jsonString);
        return metrics;
    } catch (error) {
        console.error("Error analyzing text metrics:", error);
        if (error instanceof Error) {
             throw new Error(`Metrics analysis failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during metrics analysis.");
    }
};