import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `
      You are a creative and expert travel planner. 
      Plan a trip based on the user's request with a creative touch, local secrets, and "must-try" food recommendations.
      
      STEP 1: Write a beautiful, creative travel plan in Markdown format. Use emojis and engaging headers.
      STEP 2: End your plan with exactly this separator: ---JSON_DATA---
      STEP 3: After the separator, provide the trip data in JSON format for the map.
      
      Provide a "type" for icons.
      Possible types: "temple", "cafe", "restaurant", "park", "hotel", "mall", "landmark", "nature", "market".
      
      The JSON structure MUST be:
      {
        "title": "Creative Trip Title",
        "destination": "Main Destination",
        "duration": "Duration",
        "locations": [
          {
            "name": "Exact Landmark Name",
            "lat": latitude,
            "lng": longitude,
            "day": day_number,
            "description": "Short creative description",
            "type": "one_of_the_types_above"
          }
        ]
      }
      
      Respond in Thai for the plan, but keep JSON keys in English.
      Ensure coordinates are accurate.
    `;

    const result = await model.generateContentStream([systemPrompt, prompt]);

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          controller.enqueue(new TextEncoder().encode(chunkText));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
