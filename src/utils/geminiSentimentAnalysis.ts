/**
 * Milestone 3.5: Gemini Transcript Sentiment Analysis
 * Extracts lightweight emotional sentiment from spoken words
 */

import { TextSentimentObservation } from '@/types/sentiment';

const SENTIMENT_ANALYSIS_PROMPT = `
Analyze the sentiment of the following text from a patient speaking to an AI mental health companion.

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
`;

/**
 * Analyzes transcript sentiment using Gemini API
 * @param text The transcript text to analyze
 * @param apiKey Gemini API key
 * @returns Sentiment observation
 */
export async function analyzeTranscriptSentiment(
  text: string,
  apiKey: string
): Promise<TextSentimentObservation> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: SENTIMENT_ANALYSIS_PROMPT + text,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 100,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error('No response from Gemini');
    }

    // Parse JSON from response
    const parsed = JSON.parse(resultText.trim());

    return {
      timestamp: Date.now(),
      sentiment: parsed.sentiment || 'neutral',
      emotional_tone: parsed.emotional_tone || null,
      confidence: parsed.confidence || 0.5,
    };
  } catch (error) {
    console.error('Failed to analyze sentiment:', error);
    // Return neutral sentiment on error
    return {
      timestamp: Date.now(),
      sentiment: 'neutral',
      emotional_tone: null,
      confidence: 0,
    };
  }
}

/**
 * Batch analyzes multiple transcript chunks
 * @param chunks Array of text chunks to analyze
 * @param apiKey Gemini API key
 * @returns Array of sentiment observations
 */
export async function batchAnalyzeSentiment(
  chunks: string[],
  apiKey: string
): Promise<TextSentimentObservation[]> {
  const results = await Promise.all(
    chunks.map((chunk) => analyzeTranscriptSentiment(chunk, apiKey))
  );
  return results;
}
