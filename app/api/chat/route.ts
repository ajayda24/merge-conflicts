import {
  generateText,
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const maxDuration = 30;

// ─── TRIAGE PROMPT ─────────────────────────────────────────
const TRIAGE_PROMPT = `You are a mental health triage classifier. Given the user's latest message (and optional conversation history), classify the severity level.

LEVELS:
- "normal": Everyday stress, curiosity, general conversation, mild worries, self-care questions, technique requests (breathing, meditation). No red flags.
- "bad": Sustained emotional distress lasting days/weeks, insomnia, persistent anxiety, ongoing sadness, feeling stuck, moderate symptoms that could benefit from peer support but are not immediately dangerous.
- "severe": Active self-harm thoughts, suicidal ideation, severe panic attacks, mentions of abuse/violence, extreme hopelessness, mentions of substance abuse as coping, or clear need for medical/psychiatric intervention.

Also extract:
- "topics": 1-3 lowercase keywords describing what the user is going through (e.g. "anxiety", "sleep", "grief", "pregnancy", "family", "work"). Used to search community threads.
- "specialist": If severe, which type of doctor they need. One of: "Psychiatrist", "Gynaecologist", "Psychologist", "Counsellor", or null if not severe.

Respond ONLY with valid JSON:
{"level": "normal"|"bad"|"severe", "topics": ["..."], "specialist": "..." | null}

No markdown, no explanation, just JSON.`;

// ─── RESPONSE PROMPTS PER LEVEL ────────────────────────────
const NORMAL_PROMPT = `You are Matri, a warm, empathetic AI wellness companion for women's mental health.

Rules:
- Be warm, nurturing, non-judgmental
- You MAY suggest breathing exercises, meditation, journaling, grounding techniques, self-care routines
- You MUST NOT give medical advice, diagnose, prescribe medication, or recommend specific treatments
- Keep responses concise (2-4 paragraphs max)
- Acknowledge feelings before offering suggestions`;

const BAD_PROMPT = `You are Matri, a warm, empathetic AI wellness companion for women's mental health.

The user is experiencing sustained emotional distress. Rules:
- Be extra gentle and validating
- Acknowledge their pain deeply before anything else
- Keep your response brief (2-3 paragraphs) — the app will show them related community threads below your message
- End by encouraging them that they're not alone and that others in the community have shared similar experiences
- Do NOT give medical advice or diagnose`;

const SEVERE_PROMPT = `You are Matri, a warm, empathetic AI wellness companion for women's mental health.

The user may be in crisis or needs professional help. Rules:
- Be extremely gentle, compassionate, and validating
- Keep response SHORT (1-2 paragraphs max)
- Acknowledge their courage in sharing
- Gently and clearly state that what they're going through deserves professional support
- The app will automatically show them a card to find a SPECIALIST_TYPE below your message, so do NOT include links or specific doctor references — just mention that professional support can really help
- If there are signs of immediate danger, include crisis helpline info: iCall (9152987821), Vandrevala Foundation (1860-2662-345)`;

// ─── USER CONTEXT BUILDER ──────────────────────────────────
async function buildUserContext(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "";

    const userId = user.id;

    const [profileRes, checkinsRes, screeningRes, culturalRes, summariesRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, life_stage")
          .eq("id", userId)
          .single(),
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
        supabase
          .from("onboarding_screenings")
          .select("type, score, severity, screened_on")
          .eq("user_id", userId)
          .order("screened_on", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("cultural_context_responses")
          .select("cq1, cq2, cq3_single, cq3_multi, cq4, cq5")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("chat_summaries")
          .select("summary, themes, mood_label, created_at")
          .eq("user_id", userId)
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    const parts: string[] = [];

    const profile = profileRes.data;
    if (profile) {
      parts.push(
        `USER PROFILE: Name: ${profile.full_name || "Unknown"}. Life stage: ${profile.life_stage || "not specified"}.`
      );
    }

    const checkins = checkinsRes.data;
    if (checkins && checkins.length > 0) {
      const lines = checkins.map(
        (c) =>
          `  ${c.checkin_date}: mood=${c.mood}, score=${c.computed_score}/100 (${c.severity})${c.symptoms?.length ? `, symptoms: ${c.symptoms.join(", ")}` : ""}${c.notes ? `, notes: "${c.notes}"` : ""}`
      );
      parts.push(`RECENT CHECK-INS (last 7 days):\n${lines.join("\n")}`);
    }

    const screening = screeningRes.data;
    if (screening) {
      parts.push(
        `LATEST SCREENING: ${screening.type} on ${screening.screened_on} — score ${screening.score}, severity: ${screening.severity}.`
      );
    }

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

    const summaries = summariesRes.data;
    if (summaries && summaries.length > 0) {
      const sumLines = summaries.map(
        (s) =>
          `  [${new Date(s.created_at).toLocaleDateString()}] (mood: ${s.mood_label || "?"}${s.themes?.length ? `, themes: ${s.themes.join(", ")}` : ""}) ${s.summary}`
      );
      parts.push(`RECENT CONVERSATION SUMMARIES:\n${sumLines.join("\n")}`);
    }

    if (parts.length === 0) return "";

    return `\n\n--- USER CONTEXT (private, do not repeat verbatim) ---\n${parts.join("\n\n")}\n--- END CONTEXT ---\n\nUse this context to personalize your responses naturally.`;
  } catch (e) {
    console.error("buildUserContext error:", e);
    return "";
  }
}

// ─── TRIAGE FUNCTION ───────────────────────────────────────
interface TriageResult {
  level: "normal" | "bad" | "severe";
  topics: string[];
  specialist: string | null;
}

async function triageMessage(messages: UIMessage[]): Promise<TriageResult> {
  try {
    // Build transcript of last few messages for context
    const recent = messages.slice(-6);
    const transcript = recent
      .map(
        (m) =>
          `${m.role === "user" ? "User" : "Matri"}: ${
            m.parts
              ?.filter((p: { type: string }) => p.type === "text")
              .map((p: { type: string; text?: string }) => p.text)
              .join("") ?? ""
          }`
      )
      .join("\n");

    const { text } = await generateText({
      model: openrouter.chat("arcee-ai/trinity-large-preview:free"),
      system: TRIAGE_PROMPT,
      prompt: transcript,
    });

    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      level: ["normal", "bad", "severe"].includes(parsed.level)
        ? parsed.level
        : "normal",
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      specialist: parsed.specialist || null,
    };
  } catch (e) {
    console.error("Triage error, defaulting to normal:", e);
    return { level: "normal", topics: [], specialist: null };
  }
}

// ─── SEARCH RELATED THREADS ────────────────────────────────
interface ThreadResult {
  id: string;
  title: string;
  category: string | null;
  created_at: string;
}

async function searchRelatedThreads(
  topics: string[]
): Promise<ThreadResult[]> {
  try {
    const supabase = await createClient();

    // Build OR conditions for ilike matching against title and content
    const conditions = topics
      .map((t) => `title.ilike.%${t}%,content.ilike.%${t}%`)
      .join(",");

    const { data } = await supabase
      .from("threads")
      .select("id, title, category, created_at")
      .or(conditions)
      .order("created_at", { ascending: false })
      .limit(5);

    return data || [];
  } catch (e) {
    console.error("Thread search error:", e);
    return [];
  }
}

// ─── MAIN HANDLER ──────────────────────────────────────────
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Step 1: Triage the latest user message
  const triage = await triageMessage(messages);

  // Step 2: Build user context from DB
  const userContext = await buildUserContext();

  // Step 3: Handle based on triage level
  if (triage.level === "normal") {
    // ── NORMAL: Stream response as usual ──────────────────
    const systemPrompt = NORMAL_PROMPT + userContext;
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

  if (triage.level === "bad") {
    // ── BAD: Generate response + search threads ───────────
    const systemPrompt = BAD_PROMPT + userContext;

    const [aiResult, threads] = await Promise.all([
      generateText({
        model: openrouter.chat("arcee-ai/trinity-large-preview:free"),
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
      }),
      searchRelatedThreads(triage.topics),
    ]);

    return NextResponse.json({
      level: "bad",
      content: aiResult.text,
      threads,
      topics: triage.topics,
    });
  }

  // ── SEVERE: Generate response + specialist redirect ─────
  const specialist = triage.specialist || "Psychiatrist";
  const systemPrompt =
    SEVERE_PROMPT.replace("SPECIALIST_TYPE", specialist) + userContext;

  const aiResult = await generateText({
    model: openrouter.chat("arcee-ai/trinity-large-preview:free"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return NextResponse.json({
    level: "severe",
    content: aiResult.text,
    specialist,
    topics: triage.topics,
  });
}
