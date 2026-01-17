import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionData {
  transcript: string;
  biometrics: any[];
  questionsAnswers: Record<string, string>;
  differential: any[];
  safetyAssessment: any;
  emotionSummary: Record<string, number>;
  duration: number;
  patientName?: string;
}

async function callGemini(systemPrompt: string, userPrompt: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = "gemini-2.0-flash-exp";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
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
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${text}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionData } = await req.json() as { sessionData: SessionData };

    // Calculate biometric statistics
    const bioStats = calculateBiometricStats(sessionData.biometrics || []);
    const emotionTimeline = extractEmotionTimeline(sessionData.biometrics || []);
    const speechPatterns = analyzeSpeechPatterns(sessionData.transcript);

    const systemPrompt = `You are a senior psychiatrist AI assistant creating a comprehensive post-session clinical analysis. 
Generate a detailed, actionable clinical report that would be suitable for YC-level medical software.

Your analysis should be:
1. Data-driven - Reference specific biometric findings, emotion patterns, and speech metrics
2. Clinically precise - Use DSM-5 terminology and evidence-based reasoning
3. Actionable - Provide specific next steps, not vague recommendations
4. Risk-aware - Highlight any safety concerns prominently
5. Integrative - Connect biometric data with verbal content for deeper insights

IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`;

    const userPrompt = `Analyze this psychiatric session comprehensively:

## Session Transcript:
${sessionData.transcript?.slice(0, 8000) || "No transcript available"}

## Biometric Summary:
- Average Eye Contact: ${bioStats.avgEyeContact?.toFixed(1) || 'N/A'}%
- Gaze Stability: ${bioStats.avgGazeStability?.toFixed(1) || 'N/A'}%
- Avg Pulse: ${bioStats.avgPulse?.toFixed(0) || 'N/A'} BPM
- Pulse Variability: ${bioStats.pulseVariability?.toFixed(1) || 'N/A'} BPM
- Blink Rate: ${bioStats.avgBlinkRate?.toFixed(1) || 'N/A'}/min

## Emotion Timeline (per-segment dominants):
${emotionTimeline.slice(0, 20).map((e, i) => `[${i}] ${e.dominant} (${(e.intensity * 100).toFixed(0)}%)`).join(' → ')}

## Overall Emotion Distribution:
${Object.entries(sessionData.emotionSummary || {})
  .sort((a, b) => (b[1] as number) - (a[1] as number))
  .map(([e, v]) => `${e}: ${((v as number) * 100).toFixed(0)}%`)
  .join(', ')}

## Speech Patterns:
- Total words: ${speechPatterns.totalWords}
- Avg sentence length: ${speechPatterns.avgSentenceLength.toFixed(1)} words
- Questions asked by patient: ${speechPatterns.patientQuestions}
- Hesitation markers: ${speechPatterns.hesitations}

## Q&A Summary:
${Object.entries(sessionData.questionsAnswers || {})
  .slice(0, 10)
  .map(([q, a]) => `Q: ${q}\nA: ${a}`)
  .join('\n\n')}

## Current Differential:
${(sessionData.differential || []).slice(0, 3).map(d => `${d.diagnosis} (${(d.probability * 100).toFixed(0)}%)`).join(', ')}

## Safety Assessment:
Risk Level: ${sessionData.safetyAssessment?.suicide_risk_level || 'Not assessed'}
${sessionData.safetyAssessment?.recommended_action || ''}

---

Generate a comprehensive clinical report in this JSON structure:
{
  "executiveSummary": "2-3 sentence high-level summary for quick review",
  
  "clinicalFindings": {
    "mentalStatusExam": {
      "appearance": "description",
      "behavior": "description based on biometrics",
      "mood": "inferred from emotion data",
      "affect": "description with range, congruence, reactivity",
      "speech": "based on speech patterns",
      "thoughtProcess": "organized/disorganized based on transcript",
      "cognition": "attention, memory observations"
    },
    "keyObservations": ["observation 1", "observation 2", "observation 3"]
  },
  
  "biometricInterpretation": {
    "summary": "What the biometric data tells us clinically",
    "eyeContactAnalysis": "Clinical significance of eye contact patterns",
    "emotionalTrajectory": "How emotions evolved during session and clinical meaning",
    "physiologicalFindings": "Pulse, breathing interpretations",
    "redFlags": ["any concerning biometric patterns"]
  },
  
  "diagnosticFormulation": {
    "primaryDiagnosis": {
      "diagnosis": "Most likely diagnosis",
      "dsmCode": "DSM-5 code",
      "confidence": 0.85,
      "supportingEvidence": ["evidence 1", "evidence 2"],
      "rulingOutFactors": ["what to investigate"]
    },
    "differentials": [
      {"diagnosis": "Alternative", "dsmCode": "code", "probability": 0.15, "distinguishingFeatures": "what would confirm/rule out"}
    ],
    "diagnosticGaps": ["Information still needed for definitive diagnosis"]
  },
  
  "riskAssessment": {
    "suicideRisk": {
      "level": "Low/Moderate/High/Imminent",
      "acuteFactors": ["current stressors"],
      "chronicFactors": ["ongoing vulnerabilities"],
      "protectiveFactors": ["strengths identified"],
      "planNeeded": true/false
    },
    "selfHarmRisk": "assessment",
    "violenceRisk": "assessment",
    "neglectRisk": "self-care concerns"
  },
  
  "treatmentRecommendations": {
    "immediate": [
      {"action": "specific intervention", "rationale": "why", "urgency": "high/medium/low"}
    ],
    "medications": [
      {"name": "drug", "dose": "dosing", "rationale": "evidence-based reason", "monitoring": "what to watch"}
    ],
    "psychotherapy": {
      "modality": "CBT/DBT/IPT etc",
      "focus": "specific targets",
      "frequency": "recommended schedule"
    },
    "referrals": ["specialty referrals needed"],
    "patientEducation": ["key points to discuss with patient"]
  },
  
  "followUpPlan": {
    "nextAppointment": "recommended timing",
    "urgentFollowUp": true/false,
    "assessmentsToAdminister": ["PHQ-9", "GAD-7"],
    "questionsForNextSession": ["follow-up questions"],
    "goalsForPatient": ["homework/goals"]
  },
  
  "clinicianNotes": {
    "sessionQuality": "assessment of data quality and rapport",
    "limitationsOfAssessment": ["what couldn't be assessed"],
    "supervisorFlags": ["anything requiring senior review"]
  }
}`;

    const aiResponse = await callGemini(systemPrompt, userPrompt);

    let content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Clean up markdown if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const insights = JSON.parse(content);

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Session insights error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function calculateBiometricStats(biometrics: any[]) {
  if (!biometrics.length) return {};
  
  const eyeContacts = biometrics.map(b => b.eyeContact).filter(Boolean);
  const gazeStabilities = biometrics.map(b => b.gazeStability).filter(Boolean);
  const pulses = biometrics.map(b => b.pulseEstimate).filter(Boolean);
  const blinkRates = biometrics.map(b => b.blinkRate).filter(Boolean);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const stdDev = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const mean = avg(arr)!;
    return Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / arr.length);
  };

  return {
    avgEyeContact: avg(eyeContacts),
    avgGazeStability: avg(gazeStabilities),
    avgPulse: avg(pulses),
    pulseVariability: stdDev(pulses),
    avgBlinkRate: avg(blinkRates),
  };
}

function extractEmotionTimeline(biometrics: any[]) {
  return biometrics
    .filter(b => b.emotions || b.dominantEmotion)
    .map(b => {
      if (b.dominantEmotion) {
        const intensity = b.emotions?.[b.dominantEmotion] || 0.5;
        return { dominant: b.dominantEmotion, intensity };
      }
      if (b.emotions) {
        const entries = Object.entries(b.emotions) as [string, number][];
        const [dominant, intensity] = entries.sort((a, b) => b[1] - a[1])[0] || ['neutral', 0.5];
        return { dominant, intensity };
      }
      return { dominant: 'neutral', intensity: 0.5 };
    });
}

function analyzeSpeechPatterns(transcript: string) {
  if (!transcript) return { totalWords: 0, avgSentenceLength: 0, patientQuestions: 0, hesitations: 0 };
  
  const words = transcript.split(/\s+/).filter(Boolean);
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim());
  const patientQuestions = (transcript.match(/\?/g) || []).length;
  const hesitations = (transcript.match(/\b(um|uh|hmm|like|you know|I mean)\b/gi) || []).length;

  return {
    totalWords: words.length,
    avgSentenceLength: sentences.length ? words.length / sentences.length : 0,
    patientQuestions,
    hesitations,
  };
}
