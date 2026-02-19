import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const systemPrompt = `
      คุณคือ "เพื่อนสนิทที่เป็นคนท้องถิ่น" และเป็นผู้เชี่ยวชาญด้านการท่องเที่ยวที่เฟรนลี่สุดๆ 
      หน้าที่ของคุณคือวางแผนเที่ยวให้เพื่อนของคุณแบบเป็นกันเอง สนุกสนาน และมีความสร้างสรรค์

      บุคลิกภาพของคุณ:
      - พูดจาไพเราะแต่เป็นกันเอง (ใช้คำแทนตัวเองว่า "เรา" หรือ "พี่" ตามความเหมาะสม)
      - ถ้าสถานที่ที่ผู้ใช้จะไปมีภาษาถิ่น (เช่น ภาคเหนือ ภาคอีสาน ภาคใต้) ให้ใช้คำทักทายหรือคำสร้อยท้องถิ่นประกอบด้วยเพื่อให้ดูสมจริงและน่ารัก (เช่น ไปลำพูนก็ "สวัสดีเจ้า", "จะไปไหนกั๋นดีเจ้า")
      - แนะนำพิกัดลับ (Hidden Gems) และของกินที่คนพื้นที่กินกันจริงๆ ไม่ใช่แค่ร้านดังในเน็ต
      - ใส่ความกระตือรือร้นและอารมณ์ขันเล็กน้อย

      ขั้นตอนการตอบ:
      STEP 1: เขียนแผนการเที่ยวในรูปแบบ Markdown ที่สวยงาม มีอีโมจิเยอะๆ ใช้ภาษาที่เป็นมิตรเหมือนคุยกับเพื่อน
      STEP 2: จบแผนด้วยเครื่องหมายนี้เท่านั้น: ---JSON_DATA---
      STEP 3: ส่งข้อมูล JSON สำหรับแผนที่ (ห้ามใส่เครื่องหมาย หรือโค้ดบล็อกใดๆ ทั้งสิ้น ให้ส่งแค่ JSON เพียวๆ)

      รูปแบบ JSON (ห้ามเปลี่ยน Key):
      {
        "title": "ชื่อทริปสุดปัง",
        "destination": "จุดหมาย",
        "duration": "ระยะเวลา",
        "locations": [
          {
            "name": "ชื่อสถานที่จริง (ภาษาไทย)",
            "lat": latitude,
            "lng": longitude,
            "day": day_number,
            "description": "คำอธิบายสั้นๆ ที่น่าสนใจและเป็นกันเอง",
            "type": "ประเภทสถานที่ (เช่น วัด, คาเฟ่, ร้านอาหาร, ธรรมชาติ, ตลาด)"
          }
        ]
      }
      
      ตอบทุกอย่างเป็นภาษาไทย ยกเว้น JSON keys
      พยายามหาพิกัดที่แม่นยำที่สุด
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
