import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GeneratedWord {
  term: string;
  definition: string;
  part_of_speech: string;
  example: string;
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
    const count = Math.min(Math.max(Number(body.count) || 5, 1), 20);
    const level = body.level || "intermediate";
    const categories: string[] = body.categories || ["general"];
    const exclude: string[] = body.exclude || [];
    const customTerms: string[] | undefined = body.custom_terms;

    const termsInstruction = customTerms?.length
      ? `Generate definitions for exactly these terms: ${customTerms.join(", ")}.`
      : `Generate exactly ${count} unique English vocabulary words.`;

    const prompt = `You are a vocabulary teacher. ${termsInstruction}
Level: ${level}
Categories/themes: ${categories.join(", ")}
${exclude.length ? `Do NOT include any of these words: ${exclude.join(", ")}` : ""}

Return ONLY a valid JSON array (no markdown) with objects:
{"term":"word","definition":"clear definition","part_of_speech":"noun|verb|adjective|adverb","example":"example sentence using the word"}

Each word should be appropriate for ${level} learners. Definitions should be concise.`;

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq error:", errText);
      return jsonResponse({ error: "AI generation failed" }, 502);
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;
    const words = parseWordsJson(content, count, customTerms);

    if (words.length === 0) {
      return jsonResponse({ error: "Failed to parse AI response" }, 502);
    }

    // Insert words unless this is a fill-only request (custom_terms without insert flag)
    const insertWords = body.insert !== false;
    if (insertWords && !customTerms?.length) {
      const today = new Date().toISOString().slice(0, 10);
      const weekStart = getWeekStart(today);

      const rows = words.map((w) => ({
        user_id: user.id,
        term: w.term,
        definition: w.definition,
        part_of_speech: w.part_of_speech,
        example: w.example,
        source: "ai",
        week_start: weekStart,
        added_date: today,
        mastery: 0,
        times_correct: 0,
        times_incorrect: 0,
        status: "learning",
        next_review_date: today,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("words")
        .insert(rows)
        .select("*");

      if (insertError) {
        console.error("Insert error:", insertError);
        return jsonResponse({ error: insertError.message }, 500);
      }

      return jsonResponse({ words: inserted });
    }

    return jsonResponse({ words });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function parseWordsJson(
  content: string,
  count: number,
  customTerms?: string[],
): GeneratedWord[] {
  try {
    const parsed = JSON.parse(content);
    let arr: GeneratedWord[];

    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed.words && Array.isArray(parsed.words)) {
      arr = parsed.words;
    } else {
      arr = Object.values(parsed).filter(
        (v) => typeof v === "object" && v !== null && "term" in (v as object),
      ) as GeneratedWord[];
    }

    return arr
      .slice(0, customTerms?.length || count)
      .map(normalizeWord)
      .filter((w) => w.term && w.definition);
  } catch {
    return [];
  }
}

function normalizeWord(w: GeneratedWord): GeneratedWord {
  return {
    term: String(w.term).trim(),
    definition: String(w.definition).trim(),
    part_of_speech: String(w.part_of_speech || "noun").trim(),
    example: String(w.example || "").trim(),
  };
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
