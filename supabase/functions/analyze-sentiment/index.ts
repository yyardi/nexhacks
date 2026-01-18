import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const callGemini = async (text: string) => {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  console.log('Calling Gemini for sentiment analysis...');

  const model = "gemini-2.0-flash-exp";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Analyze the sentiment of the following text from a patient speaking to an AI mental health companion.

Rules:
- Output coarse sentiment only: positive, neutral, or negative
- Optionally provide a brief emotional tone (1-2 words like "hopeful", "overwhelmed", "calm")
- NO intent detection
- NO crisis keyword detection
- NO diagnosis inference
- NO safety escalation triggers
- Just sentiment, not meaning

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "emotional_tone": string | null,
  "confidence": number
}

Text to analyze:
${text}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 100,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);

    if (response.status === 429) {
      throw new Error('AI rate limit exceeded. Please wait a moment and try again.');
    }
    if (response.status === 403) {
      throw new Error('Invalid API key or permissions.');
    }
    throw new Error(`Sentiment analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(content);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Sentiment analysis request received');
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      throw new Error('No text provided');
    }

    if (text.length > 5000) {
      throw new Error('Text too long (max 5000 characters)');
    }

    console.log('Analyzing sentiment...');

    const result = await callGemini(text);

    // Ensure valid response format
    const response = {
      timestamp: Date.now(),
      sentiment: result.sentiment || 'neutral',
      emotional_tone: result.emotional_tone || null,
      confidence: result.confidence || 0.5,
    };

    console.log('Sentiment analysis completed successfully');

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        // Return neutral sentiment on error
        timestamp: Date.now(),
        sentiment: 'neutral',
        emotional_tone: null,
        confidence: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
