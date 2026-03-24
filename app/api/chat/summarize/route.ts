import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SUMMARIZE_PROMPT = `You are a clinical note summarizer for a women's mental health app.
Given a conversation between a user and "Matri" (AI wellness companion), produce a JSON object with:
- "summary": A 2-3 sentence clinical-style summary of what the user discussed and their emotional state.
- "themes": An array of 1-5 lowercase topic tags (e.g. "anxiety", "sleep", "family", "grief", "work").
- "mood_label": A single word describing the user's overall mood in this session (e.g. "anxious", "hopeful", "distressed", "calm").

Respond ONLY with valid JSON. No markdown, no explanation.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 messages" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build conversation transcript for the summarizer
    const transcript = messages
      .map(
        (m: { role: string; parts?: { type: string; text?: string }[] }) =>
          `${m.role === "user" ? "User" : "Matri"}: ${
            m.parts
              ?.filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("") ?? ""
          }`
      )
      .join("\n");

    // Generate summary via LLM
    const { text } = await generateText({
      model: openrouter.chat("arcee-ai/trinity-large-preview:free"),
      system: SUMMARIZE_PROMPT,
      prompt: transcript,
    });

    // Parse JSON response
    let parsed: { summary: string; themes: string[]; mood_label: string };
    try {
      // Strip markdown fences if the model wraps it
      const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback if JSON parsing fails
      parsed = {
        summary: text.slice(0, 500),
        themes: [],
        mood_label: "unknown",
      };
    }

    // Insert into chat_summaries
    const { error: dbError } = await supabase.from("chat_summaries").insert({
      user_id: user.id,
      summary: parsed.summary,
      themes: parsed.themes || [],
      mood_label: parsed.mood_label || null,
    });

    if (dbError) {
      console.error("chat_summaries insert error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
