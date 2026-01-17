import { useCallback, useRef } from 'react';
import { ClinicalQuestion, TimestampedTranscript } from './useTimelineAnalysis';

// Patterns to detect when a question has been answered
const ANSWER_INDICATORS = [
  // Affirmative responses
  /\b(yes|yeah|yep|absolutely|definitely|correct|right|exactly|true|of course|certainly|i do|i am|i have|i did)\b/i,
  // Negative responses
  /\b(no|nope|never|not really|not at all|incorrect|wrong|false|hardly|i don't|i haven't|i can't|i didn't)\b/i,
  // Quantitative responses
  /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|several|many|couple)\s*(times?|days?|weeks?|months?|years?|hours?)?\b/i,
  // Descriptive responses
  /\b(i feel|i think|i believe|i've been|i have been|i was|i am|sometimes|often|always|rarely|occasionally)\b/i,
  // Duration responses
  /\b(for about|for the past|since|about|around|approximately|maybe|probably|like)\b/i,
  // Emotional content
  /\b(sad|happy|anxious|worried|scared|angry|frustrated|hopeless|tired|exhausted)\b/i,
];

// Keywords that suggest a question is being answered
const QUESTION_KEYWORDS: Record<string, string[]> = {
  sleep: ['sleep', 'insomnia', 'rest', 'tired', 'awake', 'hours', 'night'],
  mood: ['mood', 'feel', 'feeling', 'happy', 'sad', 'depressed', 'down'],
  anxiety: ['anxious', 'worried', 'nervous', 'panic', 'fear', 'scared', 'edge'],
  appetite: ['appetite', 'eating', 'food', 'weight', 'hungry'],
  energy: ['energy', 'tired', 'fatigue', 'exhausted', 'motivation'],
  concentration: ['concentrate', 'focus', 'attention', 'distracted', 'think'],
  suicidal: ['suicide', 'kill', 'die', 'death', 'end', 'life', 'hurt', 'harm'],
  substance: ['drink', 'alcohol', 'drug', 'smoke', 'use', 'substances'],
  psychosis: ['voices', 'see things', 'hear things', 'paranoid', 'watching'],
  trauma: ['trauma', 'abuse', 'assault', 'accident', 'nightmare', 'flashback'],
};

interface SmartQAResult {
  matchedQuestionId: string | null;
  confidence: number;
  extractedAnswer: string | null;
}

interface QuestionAnswerTracker {
  questionId: string;
  askedAt: number;
  keywords: string[];
}

export const useSmartQA = () => {
  // Track which questions have been asked recently
  const recentlyAskedRef = useRef<QuestionAnswerTracker[]>([]);
  
  // Track last clinician utterance to detect question patterns
  const lastClinicianRef = useRef<{ text: string; time: number } | null>(null);

  // Detect when clinician asks a question (to prepare for patient answer)
  const detectClinicianQuestion = useCallback((
    transcript: TimestampedTranscript,
    questions: ClinicalQuestion[]
  ): string | null => {
    if (transcript.speaker !== 'clinician') return null;
    
    const text = transcript.text.toLowerCase();
    lastClinicianRef.current = { text, time: Date.now() };
    
    // Find if this matches any pending question
    for (const q of questions) {
      if (q.answered) continue;
      
      const questionLower = q.question.toLowerCase();
      
      // Check for substantial overlap in keywords
      const qWords = questionLower.split(/\s+/).filter(w => w.length > 3);
      const tWords = text.split(/\s+/).filter(w => w.length > 3);
      
      const overlap = qWords.filter(w => tWords.some(tw => tw.includes(w) || w.includes(tw)));
      
      if (overlap.length >= 2 || (overlap.length >= 1 && text.includes('?'))) {
        // Mark as recently asked
        const keywords = extractKeywords(questionLower);
        recentlyAskedRef.current = [
          { questionId: q.id, askedAt: Date.now(), keywords },
          ...recentlyAskedRef.current.filter(r => r.questionId !== q.id).slice(0, 4)
        ];
        return q.id;
      }
    }
    
    return null;
  }, []);

  // Check if a transcript segment (from patient) answers a pending question
  const detectAnswer = useCallback((
    transcript: TimestampedTranscript,
    questions: ClinicalQuestion[]
  ): SmartQAResult => {
    // Only analyze patient responses
    if (transcript.speaker === 'clinician') {
      detectClinicianQuestion(transcript, questions);
      return { matchedQuestionId: null, confidence: 0, extractedAnswer: null };
    }
    
    const text = transcript.text.toLowerCase();
    
    // Check if text contains answer indicators
    const hasAnswerIndicator = ANSWER_INDICATORS.some(pattern => pattern.test(text));
    
    // First, check recently asked questions (highest priority)
    const now = Date.now();
    const recentWindow = 60000; // 1 minute window
    
    for (const recent of recentlyAskedRef.current) {
      if (now - recent.askedAt > recentWindow) continue;
      
      const question = questions.find(q => q.id === recent.questionId && !q.answered);
      if (!question) continue;
      
      // Check if response contains relevant keywords
      const matchedKeywords = recent.keywords.filter(kw => text.includes(kw));
      
      if (matchedKeywords.length > 0 || hasAnswerIndicator) {
        const confidence = calculateConfidence(text, question, matchedKeywords.length, true);
        
        if (confidence >= 60) {
          const extractedAnswer = extractSummary(transcript.text);
          
          // Remove from recently asked since it's answered
          recentlyAskedRef.current = recentlyAskedRef.current.filter(r => r.questionId !== recent.questionId);
          
          return {
            matchedQuestionId: question.id,
            confidence,
            extractedAnswer
          };
        }
      }
    }
    
    // If not matching recently asked, try to match by content
    // (This is the common case today because we don't reliably capture clinician audio as a distinct speaker.)
    if (hasAnswerIndicator) {
      const unansweredQuestions = questions
        .filter(q => !q.answered)
        .sort((a, b) => b.timestamp - a.timestamp);

      for (const question of unansweredQuestions) {
        const questionLower = question.question.toLowerCase();
        const categoryKeywords = Object.entries(QUESTION_KEYWORDS)
          .filter(([cat]) => questionLower.includes(cat) || question.category?.toLowerCase().includes(cat))
          .flatMap(([, keywords]) => keywords);

        const matchedKeywords = categoryKeywords.filter(kw => text.includes(kw));

        // Also check for question word overlap
        const qWords = questionLower.split(/\s+/).filter(w => w.length > 4);
        const directMatches = qWords.filter(w => text.includes(w));

        const totalMatches = matchedKeywords.length + directMatches.length;

        if (totalMatches >= 1) {
          const confidence = calculateConfidence(text, question, totalMatches, false);

          // IMPORTANT: accept lower confidence here because we often don't have explicit
          // clinician-question transcripts; the patient answer itself is the best signal.
          if (confidence >= 60) {
            return {
              matchedQuestionId: question.id,
              confidence,
              extractedAnswer: extractSummary(transcript.text)
            };
          }
        }
      }
    }

    return { matchedQuestionId: null, confidence: 0, extractedAnswer: null };
  }, [detectClinicianQuestion]);

  // Find questions that could be asked based on transcript content
  const suggestQuestions = useCallback((
    transcripts: TimestampedTranscript[],
    existingQuestions: ClinicalQuestion[]
  ): Partial<ClinicalQuestion>[] => {
    const suggestions: Partial<ClinicalQuestion>[] = [];
    const allText = transcripts.map(t => t.text).join(' ').toLowerCase();
    const existingQuestionTexts = existingQuestions.map(q => q.question.toLowerCase());

    const FOLLOW_UP_TRIGGERS: Record<string, { pattern: RegExp; questions: string[]; source: string }> = {
      'sleep_issues': {
        pattern: /\b(can't sleep|insomnia|trouble sleeping|not sleeping|sleep problems|tired all the time)\b/i,
        questions: [
          'How many hours of sleep are you getting on average?',
          'When did your sleep problems start?',
          'Do you have difficulty falling asleep or staying asleep?'
        ],
        source: 'Clinical Interview'
      },
      'suicidal_mention': {
        pattern: /\b(die|death|suicide|kill myself|end it|not worth living|better off dead)\b/i,
        questions: [
          'Are you having thoughts of ending your life right now?',
          'Do you have a specific plan?',
          'Have you ever attempted suicide before?'
        ],
        source: 'C-SSRS'
      },
      'substance_mention': {
        pattern: /\b(drinking|drugs|alcohol|high|drunk|smoke|using|marijuana|pills)\b/i,
        questions: [
          'How often do you use this substance?',
          'When was the last time you used?',
          'Have you tried to cut down or stop?'
        ],
        source: 'AUDIT'
      },
      'mood_symptoms': {
        pattern: /\b(depressed|sad|hopeless|empty|worthless|no motivation)\b/i,
        questions: [
          'On a scale of 0-10, how would you rate your mood today?',
          'Are you still able to enjoy activities you usually like?',
          'Have you had changes in appetite or weight?'
        ],
        source: 'PHQ-9'
      },
      'anxiety_symptoms': {
        pattern: /\b(anxious|worried|panic|nervous|on edge|can't relax)\b/i,
        questions: [
          'How often do you feel this way?',
          'Do you have physical symptoms like racing heart or sweating?',
          'What triggers your anxiety?'
        ],
        source: 'GAD-7'
      }
    };

    Object.entries(FOLLOW_UP_TRIGGERS).forEach(([key, { pattern, questions, source }]) => {
      if (pattern.test(allText)) {
        questions.forEach(q => {
          if (!existingQuestionTexts.some(eq => eq.includes(q.toLowerCase().slice(0, 20)))) {
            suggestions.push({
              question: q,
              source,
              category: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
            });
          }
        });
      }
    });

    return suggestions.slice(0, 3);
  }, []);

  return {
    detectAnswer,
    detectClinicianQuestion,
    suggestQuestions
  };
};

// Extract keywords from a question for matching
function extractKeywords(question: string): string[] {
  const keywords: string[] = [];
  
  for (const [category, words] of Object.entries(QUESTION_KEYWORDS)) {
    if (words.some(w => question.includes(w))) {
      keywords.push(...words.filter(w => question.includes(w)));
    }
  }
  
  // Also extract significant words from the question
  const significantWords = question
    .split(/\s+/)
    .filter(w => w.length > 4)
    .filter(w => !['about', 'would', 'could', 'should', 'there', 'their', 'which', 'where', 'when'].includes(w));
  
  keywords.push(...significantWords.slice(0, 5));
  
  return [...new Set(keywords)];
}

// Calculate confidence score
function calculateConfidence(
  text: string, 
  question: ClinicalQuestion, 
  keywordMatches: number,
  wasRecentlyAsked: boolean
): number {
  let confidence = 40;
  
  // Boost for recently asked questions
  if (wasRecentlyAsked) confidence += 25;
  
  // Boost for keyword matches
  confidence += Math.min(keywordMatches * 10, 30);
  
  // Boost for answer indicators
  const hasStrongIndicator = /\b(yes|no|i do|i don't|i have|i haven't|definitely|never|always)\b/i.test(text);
  if (hasStrongIndicator) confidence += 15;
  
  // Boost for quantitative answers
  if (/\d+/.test(text) || /\b(every day|daily|weekly|monthly|sometimes|often|rarely)\b/i.test(text)) {
    confidence += 10;
  }
  
  return Math.min(confidence, 100);
}

// Helper to extract a summary from an answer
function extractSummary(text: string): string {
  if (text.length < 100) return text;
  
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, 2).join(' ').trim();
}