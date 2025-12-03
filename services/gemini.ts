import { GoogleGenAI } from "@google/genai";

// Ensure API key is present
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const generateAgentResponse = async (
  prompt: string,
  config: {
    model: string;
    systemInstruction?: string;
    temperature?: number;
    useSearch?: boolean;
  }
) => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const modelName = config.model || 'gemini-2.5-flash';
  
  const requestConfig: any = {
    temperature: config.temperature ?? 0.7,
  };

  if (config.systemInstruction) {
    requestConfig.systemInstruction = config.systemInstruction;
  }

  // Handle Grounding (Google Search)
  if (config.useSearch) {
    requestConfig.tools = [{ googleSearch: {} }];
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: requestConfig
    });

    // Check for grounding metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let groundingText = '';
    
    if (groundingChunks && groundingChunks.length > 0) {
      const links = groundingChunks
        .map((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            return `[${chunk.web.title}](${chunk.web.uri})`;
          }
          return null;
        })
        .filter(Boolean)
        .join(', ');
      
      if (links) {
        groundingText = `\n\n*Sources: ${links}*`;
      }
    }

    return (response.text || "No response generated.") + groundingText;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to call Gemini API");
  }
};

// Simulated tool call for standalone search node if needed
// Real implementation would use the Google Search Tool directly via Gemini
// but here we might simulate or use a specific model for just search summarization
export const performSearch = async (query: string) => {
    // For this demo, we use Gemini to simulate a search-based answer since we can't call a raw search API easily without the grounding tool.
    // We strictly use the grounding tool configuration.
    return generateAgentResponse(query, {
        model: 'gemini-2.5-flash',
        useSearch: true,
        systemInstruction: "You are a search engine. Provide a concise summary of the search results for the user's query."
    });
};
