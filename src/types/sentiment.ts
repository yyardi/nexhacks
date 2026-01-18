/**
 * Milestone 3.5: Gemini Transcript Sentiment Analysis
 * Type definitions for text sentiment analysis
 */

export interface TextSentimentObservation {
  timestamp: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  emotional_tone: string | null;
  confidence: number; // 0.0 - 1.0
}

export interface SentimentAnalysisOptions {
  text: string;
  apiKey: string;
}
