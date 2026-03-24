import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const maxDuration = 30;

const BASE_PROMPT = `You are Matri, a warm, empathetic AI wellness companion designed specifically for women's mental health. Your communication style is:

- Warm and nurturing, like a supportive friend
- Non-judgmental and validating of feelings
- Encouraging without being preachy
- Culturally sensitive and inclusive
- Focused on active listening and reflection

Key behaviors:
1. Always acknowledge the user's feelings first before offering advice
2. Use gentle, supportive language
3. Offer practical wellness tips when appropriate
4. Encourage professional help when detecting signs of serious distress
5. Celebrate small wins and progress
6. Be mindful of life stage-specific challenges (motherhood, menopause, career stress, etc.)

Important boundaries:
- You are NOT a replacement for professional mental health care
- For crisis situations, gently encourage seeking professional help
- Never diagnose or prescribe medication
- Keep conversations focused on emotional wellbeing and self-care

Remember: Your goal is to make users feel heard, supported, and empowered on their wellness journey.`;

/**
 * Build a rich context block from the user's DB data.
 * Returns a string to prepend to the system prompt, or empty string
 * if the user is unauthenticated or data is unavailable.
 */
async function buildUserContext(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "";

    const userId = user.id;

    // Fire all queries in parallel
    const [profileRes, checkinsRes, screeningRes, culturalRes, summariesRes] =
      await Promise.all([
        // 1. Profile
        supabase
          .from("profiles")
          .select("full_name, life_stage")
          .eq("id", userId)
          .single(),

        // 2. Recent check-ins (last 7 days)
        supabase
          .from("daily_checkins")
          .select(
            "checkin_date, mood, computed_score, severity, symptoms, notes"
          )
          .eq("user_id", userId)
          .gte(
            "checkin_date",
            new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
          )
          .order("checkin_date", { ascending: false })
          .limit(7),

        // 3. Latest screening
        supabase
          .from("onboarding_screenings")
          .select("type, score, severity, screened_on")
          .eq("user_id", userId)
          .order("screened_on", { ascending: false })
          .limit(1)
          .maybeSingle(),

        // 4. Cultural context
        supabase
          .from("cultural_context_responses")
          .select("cq1, cq2, cq3_single, cq3_multi, cq4, cq5")
          .eq("user_id", userId)
          .maybeSingle(),

        // 5. Recent chat summaries (last 7 days)
        supabase
          .from("chat_summaries")
          .select("summary, themes, mood_label, created_at")
          .eq("user_id", userId)
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    const parts: string[] = [];

    // Profile
    const profile = profileRes.data;
    if (profile) {
      parts.push(
        `USER PROFILE: Name: ${profile.full_name || "Unknown"}. Life stage: ${profile.life_stage || "not specified"}.`
      );
    }

    // Check-ins
    const checkins = checkinsRes.data;
    if (checkins && checkins.length > 0) {
      const checkinLines = checkins.map(
        (c) =>
          `  ${c.checkin_date}: mood=${c.mood}, score=${c.computed_score}/100 (${c.severity})${c.symptoms?.length ? `, symptoms: ${c.symptoms.join(", ")}` : ""}${c.notes ? `, notes: "${c.notes}"` : ""}`
      );
      parts.push(`RECENT CHECK-INS (last 7 days):\n${checkinLines.join("\n")}`);
    }

    // Screening
    const screening = screeningRes.data;
    if (screening) {
      parts.push(
        `LATEST SCREENING: ${screening.type} on ${screening.screened_on} — score ${screening.score}, severity: ${screening.severity}.`
      );
    }

    // Cultural context
    const cultural = culturalRes.data;
    if (cultural) {
      const answers = [
        cultural.cq1,
        cultural.cq2,
        cultural.cq3_single ||
          (cultural.cq3_multi?.length
            ? cultural.cq3_multi.join(", ")
            : null),
        cultural.cq4,
        cultural.cq5,
      ].filter(Boolean);
      if (answers.length > 0) {
        parts.push(`CULTURAL CONTEXT: ${answers.join(" | ")}`);
      }
    }

    // Chat summaries
    const summaries = summariesRes.data;
    if (summaries && summaries.length > 0) {
      const sumLines = summaries.map(
        (s) =>
          `  [${new Date(s.created_at).toLocaleDateString()}] (mood: ${s.mood_label || "?"}${s.themes?.length ? `, themes: ${s.themes.join(", ")}` : ""}) ${s.summary}`
      );
      parts.push(
        `RECENT CONVERSATION SUMMARIES:\n${sumLines.join("\n")}`
      );
    }

    if (parts.length === 0) return "";

    return `\n\n--- USER CONTEXT (private, do not repeat verbatim) ---\n${parts.join("\n\n")}\n--- END CONTEXT ---\n\nUse this context to personalize your responses. Reference specific details naturally when relevant, but never dump raw data back at the user.`;
  } catch (e) {
    console.error("buildUserContext error:", e);
    return "";
  }
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Build rich context from DB (non-blocking — falls back to base prompt)
  const userContext = await buildUserContext();
  const systemPrompt = BASE_PROMPT + userContext;

  const result = streamText({
    model: openrouter.chat("arcee-ai/trinity-large-preview:free"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  });
}
