import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.0-flash';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { query?: string };
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const prompt = `You are an expert AI tools curator for a platform called FWAI AI Tools Finder.

User requirement: "${query}"

Recommend 2 to 3 of the best AI tools for this specific use case.

Return ONLY a valid JSON array — no markdown, no code fences, no explanation. Just raw JSON.

Each item must follow this exact schema:
{
  "name": "Official product name",
  "description": "One clear sentence explaining exactly why this tool is best for the user's requirement.",
  "pricing": "Free" | "Freemium" | "Paid",
  "rating": "4.8/5",
  "link": "https://official-website.com",
  "trending": true | false,
  "tags": ["tag1", "tag2", "tag3"]
}

Rules:
- Only recommend real, well-known AI tools with valid, working URLs
- Free = completely free forever, Freemium = free tier + paid upgrades, Paid = subscription/purchase required
- Rating must be a realistic score out of 5 based on general user community reviews
- trending = true only if the tool is widely discussed and growing in 2025–2026
- Minimum 2 tools, maximum 3 tools
- Tags should be 2–4 short lowercase category labels`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[Gemini API error]', geminiRes.status, errText);
      return NextResponse.json({ error: 'Gemini API request failed' }, { status: 502 });
    }

    const data = await geminiRes.json();
    const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!rawText) {
      console.error('[Gemini] Empty response', JSON.stringify(data));
      return NextResponse.json({ error: 'Empty response from Gemini' }, { status: 502 });
    }

    // Strip any accidental markdown fences
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const tools = JSON.parse(cleaned);

    if (!Array.isArray(tools) || tools.length === 0) {
      return NextResponse.json({ error: 'Invalid tool list format' }, { status: 502 });
    }

    return NextResponse.json({ tools: tools.slice(0, 3) });
  } catch (err) {
    console.error('[/api/recommend error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
