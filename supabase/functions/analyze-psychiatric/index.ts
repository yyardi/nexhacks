import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    if (!transcript) throw new Error('No transcript provided');

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    const prompt = `You are a psychiatric diagnostic assistant following DSM-5-TR and C-SSRS guidelines.

TRANSCRIPT:
${transcript}

Return this EXACT JSON structure:
{
  "differential_diagnoses": [
    {
      "diagnosis": "Major Depressive Disorder",
      "dsm5_code": "F32.1",
      "severity": "Moderate",
      "probability": 0.85,
      "supporting_criteria": ["depressed mood", "anhedonia"],
      "missing_criteria": ["weight changes"],
      "severity_rationale": "explanation"
    }
  ],
  "safety_assessment": {
    "suicide_risk_level": "Low|Moderate|High|Imminent",
    "risk_factors": ["list of risk factors"],
    "protective_factors": ["list of protective factors"],
    "immediate_actions": ["actions if high risk"],
    "recommended_action": "clinical recommendation"
  },
  "critical_questions_to_ask": [
    {
      "question": "Have you had thoughts of harming yourself?",
      "source": "C-SSRS",
      "category": "Suicidality"
    }
  ],
  "treatment_plan": {
    "immediate_interventions": ["safety planning"],
    "medication_recommendations": [
      {
        "medication": "Sertraline",
        "dose": "50mg daily",
        "rationale": "first-line SSRI",
        "monitoring": "suicidality in first 2 weeks"
      }
    ],
    "psychotherapy": ["CBT", "IPT"],
    "follow_up_schedule": ["1 week", "2 weeks"],
    "patient_education": ["sleep hygiene"]
  }
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
