import { GoogleGenAI } from "@google/genai";
import { GearItem, RecallResult, TripContext, LoadoutAnalysis, InspectionTask, RecentRecallSummary, WidgetStats } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean JSON strings from Markdown code blocks
const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * CORE: Recall Check Engine
 * Uses a 2-step process:
 * 1. gemini-2.5-flash + Google Search to gather latest facts.
 * 2. gemini-3-pro-preview (Thinking) to analyze facts against specific gear details.
 */
export const checkGearSafety = async (item: GearItem): Promise<RecallResult> => {
  try {
    // STEP 1: GATHER FACTS (Search Grounding)
    const searchQuery = `official safety recall ${item.brand} ${item.model} ${item.category} ${item.purchaseDate} ${item.region}`;
    
    const searchResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find official safety recall notices, manufacturer warnings, or CPSC/EU Safety Gate alerts for: ${item.brand} ${item.model} (${item.category}). Focus on production years around ${item.purchaseDate}.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const searchContext = searchResponse.text;
    const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract sources from grounding
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri,
      }))
      .slice(0, 3); // Top 3 sources

    // STEP 2: ANALYZE (Thinking Model)
    // We use the Thinking model to process the raw search context and determine risk.
    const analysisPrompt = `
      You are a rigorous outdoor gear safety analyst. 
      
      GEAR ITEM:
      Brand: ${item.brand}
      Model: ${item.model}
      Category: ${item.category}
      Purchase Date: ${item.purchaseDate}
      Serial/Notes: ${item.notes || 'N/A'}

      SEARCH CONTEXT (Evidence):
      ${searchContext}

      TASK:
      Analyze the search context to determine if THIS specific item is subject to a recall or safety warning.
      Be precise about model numbers and years. If the recall is for a different model or year, the status should be 'safe'.
      
      OUTPUT JSON ONLY:
      {
        "status": "safe" | "warning" | "recalled",
        "summary": "Short explanation (max 20 words)",
        "hazardReason": "The technical failure point (e.g. 'Valve O-ring failure')",
        "hazardType": "Fire / Burn" | "Fall / Failure" | "Gas Leak" | "Electrical" | "Water / Drowning" | "Structural" | "None",
        "affectedRegion": "Region code or 'Global'",
        "actionRequired": ["Action step 1", "Action step 2"]
      }
    `;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: analysisPrompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(cleanJson(analysisResponse.text || '{}'));
    
    return {
      ...result,
      sources: sources,
      lastChecked: new Date().toISOString()
    };

  } catch (error) {
    console.error("Error checking gear safety:", error);
    return {
      status: 'unknown',
      summary: 'Could not verify safety status due to network error.',
      hazardReason: 'Unknown',
      hazardType: 'None',
      affectedRegion: 'Unknown',
      actionRequired: ['Check manufacturer website manually'],
      sources: [],
      lastChecked: new Date().toISOString()
    };
  }
};

/**
 * Generates inspection checklist, expiry estimates, AND Known Weak Points.
 * Uses gemini-2.5-flash-lite for speed.
 */
export const getInspectionDetails = async (item: GearItem): Promise<{ expiryYear: number, inspectionTasks: InspectionTask[], weakPoints: string[] }> => {
  try {
    const prompt = `
      Generate maintenance data for this outdoor gear:
      Type: ${item.category}
      Item: ${item.brand} ${item.model}
      Purchased: ${item.purchaseDate}

      Return JSON:
      {
        "expiryYear": number (estimated end of life year based on category standards),
        "tasks": ["string"] (3-4 specific inspection steps),
        "weakPoints": ["string"] (2-3 common failure points for this specific type of gear, e.g. "Check hipbelt stitching")
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(cleanJson(response.text || '{}'));
    
    return {
      expiryYear: data.expiryYear || (new Date().getFullYear() + 5),
      inspectionTasks: (data.tasks || []).map((t: string, i: number) => ({
        id: `task-${Date.now()}-${i}`,
        task: t,
        isCompleted: false
      })),
      weakPoints: data.weakPoints || []
    };
  } catch (error) {
    return {
      expiryYear: new Date().getFullYear() + 5,
      inspectionTasks: [{ id: '1', task: 'Visually inspect for damage', isCompleted: false }],
      weakPoints: ['Check general condition']
    };
  }
};

/**
 * Calculates a Condition Score (0-100) based on age, category, and notes.
 * Uses gemini-2.5-flash.
 */
export const analyzeGearCondition = async (item: GearItem): Promise<{ score: number, label: string }> => {
  try {
    const currentYear = new Date().getFullYear();
    const prompt = `
      Estimate the condition score (0-100) for this gear item.
      Item: ${item.brand} ${item.model} (${item.category})
      Purchased: ${item.purchaseDate}
      Current Year: ${currentYear}
      User Notes: ${item.notes || 'None'}
      Recall Status: ${item.status}

      Logic:
      - If recalled, score < 40.
      - If old (>10 years for safety gear), score < 50.
      - If user notes mention 'worn', 'frayed', etc., lower score significantly.
      - Otherwise base on typical lifespan decay.

      Return JSON:
      {
        "score": number,
        "label": "Good condition" | "Needs inspection soon" | "High wear" | "Not recommended"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(cleanJson(response.text || '{"score": 80, "label": "Unknown"}'));
  } catch (e) {
    return { score: 50, label: "Needs check" };
  }
};

/**
 * "Is this safe to use right now?"
 * Context-aware quick check using gemini-2.5-flash.
 */
export const assessImmediateSafety = async (item: GearItem, context: TripContext): Promise<string> => {
  try {
    const prompt = `
      Verdict: Is this safe to use RIGHT NOW?
      Item: ${item.brand} ${item.model} (${item.category})
      Age: ${item.purchaseDate}
      Condition Score: ${item.conditionScore || 'Unknown'}
      Status: ${item.status}
      Weak Points: ${item.knownWeakPoints?.join(', ') || 'Unknown'}

      TRIP CONTEXT:
      Type: ${context.type}
      Conditions: ${context.environment.join(', ')}

      Output a SHORT 2-sentence verdict. Be conservative about safety.
      Example: "Reasonably safe for a day hike, but risk of failure in freezing conditions due to age."
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (e) {
    return "Could not assess. Please inspect manually.";
  }
};

/**
 * Trip Loadout Risk Overview
 * Uses gemini-3-pro-preview (Thinking) to analyze a set of items against trip conditions.
 */
export const analyzeTripLoadout = async (items: GearItem[], context: TripContext): Promise<LoadoutAnalysis> => {
  try {
    const simplifiedItems = items.map(i => ({
      name: i.name,
      category: i.category,
      age: i.purchaseDate,
      status: i.status,
      score: i.conditionScore
    }));

    const prompt = `
      Analyze this Trip Loadout for safety risks.
      
      TRIP CONTEXT:
      Type: ${context.type}
      Conditions: ${context.environment.join(', ')}

      GEAR LOADOUT:
      ${JSON.stringify(simplifiedItems)}

      Identify gaps, risks, and red flags.
      
      Return JSON:
      {
        "summary": "Overall risk assessment summary (max 30 words)",
        "weakestCategories": ["Category 1", "Category 2"],
        "redFlagItems": ["Item Name - Reason"],
        "suggestions": ["Actionable suggestion 1", "Actionable suggestion 2"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (e) {
    return {
      summary: "Could not analyze loadout.",
      weakestCategories: [],
      redFlagItems: [],
      suggestions: ["Check all gear manually before departure."]
    };
  }
};

/**
 * Sidebar Widget: Recent Recalls
 * Uses gemini-2.5-flash with Search
 */
export const getRecentRecalls = async (): Promise<RecentRecallSummary[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "List 5 recent major outdoor gear recalls (climbing, hiking, camping) from the last 6 months. Focus on US/EU markets.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // We process the text with Flash-Lite to format it strictly into JSON
    const formatterResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `Extract a list of recalls from this text into JSON array [{productName, date, hazardType, region, url}]: \n\n ${response.text}`,
      config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(cleanJson(formatterResponse.text || '[]'));
  } catch (error) {
    console.error("Recent recalls error", error);
    return [];
  }
};

/**
 * Sidebar Widget: Stats & Trends
 * Uses gemini-2.5-flash-lite (Summarization)
 */
export const getRecallStats = async (): Promise<WidgetStats> => {
  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: "Based on general knowledge of outdoor gear recalls in the last year, generate a JSON summary of: 1. A list of 4 common hazard types and their approximate count (e.g., Fire: 4). 2. The highest risk category this month (e.g. 'Carabiners'). JSON format: { hazardBreakdown: [{type, count}], highRiskCategory: string }",
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (error) {
    return { hazardBreakdown: [], highRiskCategory: 'Unknown' };
  }
};
