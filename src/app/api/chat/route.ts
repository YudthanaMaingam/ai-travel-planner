import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const systemPrompt = `
      You are an expert travel planner. 
      Your task is to plan a trip based on the user's request.
      Respond ONLY in JSON format.
      The JSON should have the following structure:
      {
        "title": "A catchy title for the trip",
        "destination": "Main destination",
        "duration": "Duration of the trip",
        "plan": "Detailed markdown formatted travel plan",
        "locations": [
          {
            "name": "Location Name",
            "lat": latitude_number,
            "lng": longitude_number,
            "day": day_number,
            "description": "Brief description of what to do here"
          }
        ]
      }
      Ensure coordinates (lat, lng) are accurate for the locations mentioned.
      If the user speaks Thai, respond in Thai but keep the JSON keys in English.
    `;

    const result = await model.generateContent([systemPrompt, prompt]);
    const response = await result.response;
    let text = response.text();
    
    // Clean the response in case AI adds markdown code blocks
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error("JSON Parse Error:", text);
      return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
