
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Smart Menu Restructurer: Restructures menu data according to exact enterprise header specifications.
 */
export async function aiFixMenuData(data: any[][]): Promise<any[][]> {
  const ai = getAI();
  const prompt = `
    Task: Enterprise Restaurant Menu Architect.
    
    Instructions: Transform the provided 2D array into a strictly formatted table with specific columns. 
    
    TARGET HEADER: 
    ["Name", "Item_Online_DisplayName", "Variation_Name", "Price", "Category", "Category_Online_DisplayName", "Short_Code", "Short_Code_2", "Description", "Attributes", "Goods_Services"]

    PROCESSING RULES:
    1. NAME & DISPLAY NAME:
       - Combine Item Name and Variation/Portion (e.g., "6 PCS.", "Half") into: "Item Name (Portion)".
       - Prefix "Veg" or "Non-Veg" to the start if indicated in variations or zero-price columns.
       - "Item_Online_DisplayName" MUST be identical to the final formatted "Name".
    
    2. SEQUENTIAL DATA:
       - "Short_Code": Generate a sequence: "1-AKM", "2-AKM", "3-AKM"... for every item row.
       - "Goods_Services": MUST always be "Services".
       - "Short_Code_2": Leave empty or use for internal ID if found.
    
    3. ZERO PRICE CLEANUP:
       - If there are split columns for Veg/Non-Veg with 0 values, merge them into the single "Price" column and ensure the "Name" prefix (Veg/Non-Veg) is correct.
    
    4. DATA INTEGRITY:
       - Fix spelling (e.g., "panner" -> "Paneer").
       - Ensure consistent Title Case for Categories and Names.
       - Check if 'Attributes' contains relevant tags (e.g., Spicy, Chef Special).
    
    Input Data (2D Array):
    ${JSON.stringify(data)}

    Return ONLY the valid JSON 2D array starting with the TARGET HEADER row.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    }
  });

  try {
    const text = response.text;
    return JSON.parse(text || "[]");
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return data; 
  }
}

/**
 * Intelligent Data Extraction from Image/PDF with Language Support.
 */
export async function aiExtractToExcel(base64Data: string, mimeType: string, language: string = 'English'): Promise<any[][]> {
  const ai = getAI();
  const prompt = `Task: Extract tabular data from the provided document.
    Language Context: The document is primarily in ${language}.
    Instructions:
    1. Identify all tables.
    2. Extract all rows and columns accurately.
    3. Return strictly as a JSON 2D array (Array of Arrays).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text || "[[]]");
}

/**
 * Summarize Document.
 */
export async function aiSummarizeDoc(text: string): Promise<string> {
  const ai = getAI();
  const prompt = `Summarize the following document intelligently. 
    1. High-level overview.
    2. Key findings.
    
    Document Text:
    ${text.substring(0, 15000)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });

  return response.text || "Summary could not be generated.";
}
