/**
 * Milestone 3.5: Gemini Transcript Sentiment Analysis
 * Extracts lightweight emotional sentiment from spoken words
 *
 * SECURITY: Uses Supabase Edge Function to keep API key secure
 */

import { TextSentimentObservation } from '@/types/sentiment';
import { supabase } from '@/integrations/supabase/client';

/**
 * Analyzes transcript sentiment using Supabase Edge Function
 * @param text The transcript text to analyze
 * @returns Sentiment observation
 */
export async function analyzeTranscriptSentiment(
  text: string
): Promise<TextSentimentObservation> {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text provided');
    }

    if (text.length > 5000) {
      throw new Error('Text too long (max 5000 characters)');
    }

    console.log('Calling sentiment analysis edge function...');

    const { data, error } = await supabase.functions.invoke('analyze-sentiment', {
      body: { text },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No response from sentiment analysis');
    }

    // Edge function already returns the correct format
    return {
      timestamp: data.timestamp || Date.now(),
      sentiment: data.sentiment || 'neutral',
      emotional_tone: data.emotional_tone || null,
      confidence: data.confidence || 0.5,
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
 * @returns Array of sentiment observations
 */
export async function batchAnalyzeSentiment(
  chunks: string[]
): Promise<TextSentimentObservation[]> {
  const results = await Promise.all(
    chunks.map((chunk) => analyzeTranscriptSentiment(chunk))
  );
  return results;
}
