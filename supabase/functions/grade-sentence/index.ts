import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const MASTERY_THRESHOLD = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GradeResult {
  is_correct: boolean;
  feedback: string;
  correction: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const groqKey = Deno.env.get("GROQ_API_KEY");

    if (!groqKey) {
      return jsonResponse({ error: "GROQ_API_KEY not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { word_id, term, definition, sentence, context = "daily" } = body;

    if (!word_id || !term || !sentence) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const prompt = `You are an English teacher grading vocabulary usage.

Word: "${term}"
Definition: "${definition}"
Student's sentence: "${sentence}"

Evaluate whether the student used the word correctly in context (correct meaning, grammar, and natural usage).

Return ONLY valid JSON (no markdown):
{"is_correct":true|false,"feedback":"brief encouraging feedback","correction":"corrected sentence if wrong, or null if correct"}`;

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq error:", errText);
      return jsonResponse({ error: "AI grading failed" }, 502);
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;
    const grade = parseGradeJson(content);

    if (!grade) {
      return jsonResponse({ error: "Failed to parse AI response" }, 502);
    }

    const { data: word, error: wordError } = await supabase
      .from("words")
      .select("*")
      .eq("id", word_id)
      .eq("user_id", user.id)
      .single();

    if (wordError || !word) {
      return jsonResponse({ error: "Word not found" }, 404);
    }

    const today = new Date().toISOString().slice(0, 10);
    const updates = computeMasteryUpdate(word, grade.is_correct, today);

    const { error: attemptError } = await supabase.from("attempts").insert({
      user_id: user.id,
      word_id,
      sentence,
      is_correct: grade.is_correct,
      feedback: grade.feedback,
      correction: grade.correction,
      context,
    });

    if (attemptError) {
      console.error("Attempt insert error:", attemptError);
      return jsonResponse({ error: attemptError.message }, 500);
    }

    const { error: updateError } = await supabase
      .from("words")
      .update(updates)
      .eq("id", word_id);

    if (updateError) {
      console.error("Word update error:", updateError);
      return jsonResponse({ error: updateError.message }, 500);
    }

    return jsonResponse(grade);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function parseGradeJson(content: string): GradeResult | null {
  try {
    const parsed = JSON.parse(content);
    return {
      is_correct: Boolean(parsed.is_correct),
      feedback: String(parsed.feedback || ""),
      correction: parsed.correction ? String(parsed.correction) : null,
    };
  } catch {
    return null;
  }
}

function computeMasteryUpdate(
  word: Record<string, unknown>,
  isCorrect: boolean,
  today: string,
): Record<string, unknown> {
  const mastery = Number(word.mastery) || 0;
  const timesCorrect = Number(word.times_correct) || 0;
  const timesIncorrect = Number(word.times_incorrect) || 0;

  if (isCorrect) {
    const newMastery = Math.min(MASTERY_THRESHOLD, mastery + 1);
    const mastered = newMastery >= MASTERY_THRESHOLD;
    return {
      mastery: newMastery,
      times_correct: timesCorrect + 1,
      status: mastered ? "mastered" : "learning",
      next_review_date: mastered ? null : addDays(today, spacedInterval(newMastery)),
      learned_at: mastered ? new Date().toISOString() : word.learned_at,
    };
  }

  const newMastery = Math.max(0, mastery - 1);
  return {
    mastery: newMastery,
    times_incorrect: timesIncorrect + 1,
    status: "learning",
    next_review_date: addDays(today, spacedInterval(newMastery)),
    learned_at: null,
  };
}

function spacedInterval(mastery: number): number {
  switch (mastery) {
    case 0:
      return 1;
    case 1:
      return 2;
    case 2:
      return 4;
    default:
      return 7;
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
