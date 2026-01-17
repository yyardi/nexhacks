import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callGemini(systemPrompt: string, userPrompt: string) {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const model = "gemini-2.0-flash-exp";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userPrompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("Gemini API error:", resp.status, t);
    if (resp.status === 429) return { status: 429, body: { error: "Rate limits exceeded, please try again shortly." } };
    if (resp.status === 403) return { status: 403, body: { error: "Invalid API key or permissions." } };
    return { status: 500, body: { error: "Gemini API error" } };
  }

  const data = await resp.json();
  return { status: 200, body: data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcriptTurns, existingQuestions } = await req.json();

    const system = `You are an interview orchestrator for a psychiatric intake.
Your job is to:
1) Identify the current interview phase.
2) Provide 3 short, natural doctor utterances to say next.
3) Propose 0-3 NEW structured form questions to add (PHQ-9, GAD-7, C-SSRS, AUDIT, MSE, Clinical Interview), only if needed.

Rules:
- Suggestions must be clinician spoken lines (not meta-instructions).
- Avoid robotic/templated phrasing.
- Do NOT repeat the same prompt across turns unless nothing changed.
- Keep prompts <= 140 characters.
- Prefer progressing the interview (avoid loops).

Return VALID JSON with this schema:
{
  "phase": "opening|chief_complaint|history_present_illness|safety|mood_anxiety|substances|psychosis_mania|trauma|mse|wrap_up",
  "phaseLabel": "Short human label",
  "nextPrompts": [{"text":"...","rationale":"..."}],
  "newQuestions": [{"question":"...","source":"PHQ-9|GAD-7|C-SSRS|AUDIT|MSE|Clinical Interview","category":"Depression|Anxiety|Suicidality|Substance Use|Trauma|Mania|Cognition|General"}]
}`;

    const user = `LATEST TURNS (most recent last):\n${JSON.stringify(transcriptTurns ?? [], null, 2)}\n\nEXISTING QUESTIONS (some may already be answered/asked):\n${JSON.stringify(existingQuestions ?? [], null, 2)}`;

    const out = await callGemini(system, user);
    if (out.status !== 200) {
      return new Response(JSON.stringify(out.body), {
        status: out.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = out.body?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;

    return new Response(JSON.stringify(parsed ?? {}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("interview-orchestrator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
