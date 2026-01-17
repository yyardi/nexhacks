import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const callLovableAI = async (prompt: string) => {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  console.log('Calling Lovable AI for psychiatric analysis...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are a clinical psychiatric analysis assistant. Analyze psychiatric interviews and provide structured clinical assessments. Always return valid JSON matching the exact schema provided.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('AI rate limit exceeded. Please wait a moment and try again.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add credits to continue.');
    }
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Psychiatric analysis request received');
    const { transcript, patientHistory, speechMetrics } = await req.json();
    
    if (!transcript) {
      throw new Error('No transcript provided');
    }

    console.log('Analyzing psychiatric presentation...');
    
    // Clinical analysis with proper severity detection
    const combinedPrompt = `You are a psychiatric diagnostic assistant following DSM-5-TR and C-SSRS guidelines. Analyze this interview with clinical precision.

TRANSCRIPT:
${transcript}

SPEECH METRICS:
- Rate: ${speechMetrics?.rate || 0} words/min
- Pauses: ${speechMetrics?.longPauses || 0} pauses >3 sec
${speechMetrics?.rate < 80 ? '⚠️ SLOWED SPEECH - suggests psychomotor retardation' : ''}

PATIENT HISTORY:
${JSON.stringify(patientHistory || {}, null, 2)}

CRITICAL SEVERITY RULES:
1. SEVERE (F32.2) if ANY: past suicide attempts, active suicidal ideation, plan/intent, 7+ symptoms, severe functional impairment, psychotic features
2. MODERATE (F32.1) if: moderate symptoms, some functional impairment
3. MILD (F32.0) if: minimal symptoms beyond criteria

SAFETY ASSESSMENT RULES (C-SSRS based):
- IMMINENT: Past attempts + current ideation, or active plan with intent
- HIGH: Active suicidal ideation with method/plan, or past attempts
- MODERATE: Passive ideation without plan
- LOW: No current ideation

Return this EXACT JSON structure:
{
  "chief_complaint": "patient's stated reason",
  "psychiatric_symptoms": {
    "mood": ["symptoms"],
    "anxiety": ["symptoms"],
    "sleep": ["disturbances"],
    "appetite": ["changes"],
    "energy": ["fatigue/anhedonia"],
    "cognition": ["concentration/memory"],
    "psychomotor": ["retardation/agitation"],
    "suicidality": ["any SI/HI with details"]
  },
  "thought_content": {
    "suicidal_ideation": "none|passive|active without plan|active with plan|intent",
    "past_suicide_attempts": "none|present with details",
    "homicidal_ideation": "none|present"
  },
  "differential_diagnoses": [
    {
      "diagnosis": "Major Depressive Disorder",
      "dsm5_code": "F32.0|F32.1|F32.2",
      "severity": "Mild|Moderate|Severe",
      "probability": 0.85,
      "supporting_criteria": ["DSM-5 criteria met"],
      "missing_criteria": ["need to assess"],
      "severity_rationale": "explain severity classification based on symptom count, functional impairment, suicidality"
    }
  ],
  "safety_assessment": {
    "suicide_risk_level": "Low|Moderate|High|Imminent",
    "risk_factors": ["past attempts", "current ideation", "plan", "intent", "access to means", "hopelessness", "isolation"],
    "protective_factors": ["social support", "treatment engagement", "reasons for living"],
    "immediate_actions": ["hospitalization", "crisis intervention", "safety plan", "means restriction"],
    "recommended_action": "detailed clinical action"
  },
  "critical_questions_to_ask": [
    {
      "question": "specific question to ask",
      "source": "PHQ-9|C-SSRS|GAD-7|MMSE|Clinical Interview|MSE|AUDIT|PCL-5|MDQ",
      "category": "Depression|Suicidality|Anxiety|Cognition|Substance Use|Trauma|Mania"
    }
  ],
  "assessment_tools_to_administer": [
    {
      "tool": "C-SSRS|PHQ-9|GAD-7|MMSE",
      "reason": "clinical rationale",
      "priority": "immediate|routine",
      "expected_score_range": "range"
    }
  ],
  "treatment_plan": {
    "immediate_interventions": ["actions to take today"],
    "medication_recommendations": [
      {
        "medication": "name",
        "dose": "starting dose",
        "rationale": "why this medication",
        "monitoring": "what to monitor"
      }
    ],
    "psychotherapy": ["CBT|IPT|supportive therapy"],
    "follow_up_schedule": ["timing of follow-ups"],
    "patient_education": ["key points to discuss"]
  }
}

CRITICAL: Be precise with severity and safety classifications. Past suicide attempts = HIGH/IMMINENT risk. Multiple severe symptoms or functional impairment = SEVERE depression. Prioritize patient safety above all.`;

    const result = await callLovableAI(combinedPrompt);
    console.log('Analysis completed successfully');

    // Structure response with treatment plan
    const response = {
      entities: {
        chief_complaint: result.chief_complaint,
        psychiatric_symptoms: result.psychiatric_symptoms,
        thought_content: result.thought_content
      },
      differential_diagnoses: result.differential_diagnoses || [],
      safety_assessment: result.safety_assessment || null,
      assessment_tools_to_administer: result.assessment_tools_to_administer || [],
      critical_questions_to_ask: result.critical_questions_to_ask || [],
      treatment_plan: result.treatment_plan || null,
      speechMetrics: speechMetrics || {}
    };

    console.log('Analysis completed successfully');
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Psychiatric analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
