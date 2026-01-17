import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TimestampedTranscript {
  id: string;
  /** The display/working text (English if translation is enabled) */
  text: string;
  /** Original raw transcript as received */
  rawText?: string;
  /** Detected language label (best-effort) */
  language?: string;
  timestamp: number;
  speaker?: 'clinician' | 'patient';
}

export interface ClinicalQuestion {
  id: string;
  question: string;
  source: string; // e.g., "PHQ-9", "C-SSRS", "GAD-7", "MMSE", "Clinical Interview"
  category: string; // e.g., "Depression", "Suicidality", "Anxiety", "Cognition"
  timestamp: number;

  // Conversation-state
  asked?: boolean;
  askedAt?: number;

  // Answer capture
  answer?: string; // Summarized/concise answer from patient
  answerEvidence?: string[]; // short transcript snippets supporting the answer
  answerMethod?: 'manual' | 'auto';
  answeredAt?: number;

  answered: boolean;
}

export interface BiometricSnapshot {
  timestamp: number;
  eyeContact: number;
  gazeStability: number;
  breathingRate: number;
  blinkRate: number;
  headPose: { pitch: number; yaw: number; roll: number };
  pulseEstimate?: number;

  // Face/affect
  emotions?: Record<string, number> | null;
  dominantEmotion?: string;
}

export interface AnalysisSnapshot {
  timestamp: number;
  differential: any[];
  safetyAssessment: any;
  criticalQuestions: ClinicalQuestion[];
  assessmentTools: any[];
  treatmentPlan: any;
}

export interface TimelineData {
  transcripts: TimestampedTranscript[];
  questions: ClinicalQuestion[];
  biometrics: BiometricSnapshot[];
  analysisSnapshots: AnalysisSnapshot[];
  sessionStartTime: number;
}

export const useTimelineAnalysis = () => {
  const [timelineData, setTimelineData] = useState<TimelineData>({
    transcripts: [],
    questions: [],
    biometrics: [],
    analysisSnapshots: [],
    sessionStartTime: Date.now()
  });
  
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number | null>(null);
  const sessionStartRef = useRef(Date.now());

  const startNewSession = useCallback(() => {
    const now = Date.now();
    sessionStartRef.current = now;
    setTimelineData({
      transcripts: [],
      questions: [],
      biometrics: [],
      analysisSnapshots: [],
      sessionStartTime: now
    });
    setCurrentPlaybackTime(null);
  }, []);

  const addTranscript = useCallback((text: string, speaker?: 'clinician' | 'patient', meta?: { rawText?: string; language?: string }) => {
    const newTranscript: TimestampedTranscript = {
      id: crypto.randomUUID(),
      text,
      rawText: meta?.rawText,
      language: meta?.language,
      timestamp: Date.now(),
      speaker,
    };

    setTimelineData((prev) => ({
      ...prev,
      transcripts: [...prev.transcripts, newTranscript],
    }));

    return newTranscript;
  }, []);

  const addQuestion = useCallback((question: Omit<ClinicalQuestion, 'id' | 'timestamp' | 'answered'>) => {
    const newQuestion: ClinicalQuestion = {
      ...question,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      asked: question.asked ?? false,
      askedAt: question.askedAt,
      answer: question.answer,
      answerEvidence: question.answerEvidence,
      answerMethod: question.answerMethod,
      answeredAt: question.answeredAt,
      answered: false,
    };
    
    setTimelineData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    
    return newQuestion;
  }, []);

  const markQuestionAsked = useCallback((questionId: string) => {
    const now = Date.now();
    setTimelineData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? { ...q, asked: true, askedAt: q.askedAt ?? now }
          : q
      )
    }));
  }, []);

  const answerQuestion = useCallback((
    questionId: string,
    answer: string,
    meta?: { method?: 'manual' | 'auto'; evidence?: string[] }
  ) => {
    const now = Date.now();
    setTimelineData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? {
              ...q,
              answer,
              answered: true,
              answeredAt: now,
              answerMethod: meta?.method ?? q.answerMethod ?? 'manual',
              answerEvidence: meta?.evidence ?? q.answerEvidence,
            }
          : q
      )
    }));
  }, []);

  const addBiometricSnapshot = useCallback((snapshot: Omit<BiometricSnapshot, 'timestamp'>) => {
    const newSnapshot: BiometricSnapshot = {
      ...snapshot,
      timestamp: Date.now()
    };
    
    setTimelineData(prev => ({
      ...prev,
      biometrics: [...prev.biometrics, newSnapshot]
    }));
  }, []);

  const addAnalysisSnapshot = useCallback((analysis: Omit<AnalysisSnapshot, 'timestamp'>) => {
    const newSnapshot: AnalysisSnapshot = {
      ...analysis,
      timestamp: Date.now()
    };
    
    setTimelineData(prev => ({
      ...prev,
      analysisSnapshots: [...prev.analysisSnapshots, newSnapshot]
    }));
  }, []);

  // Get data at a specific point in time
  const getDataAtTime = useCallback((timestamp: number) => {
    const { transcripts, questions, biometrics, analysisSnapshots } = timelineData;
    
    // Get transcripts up to this time
    const transcriptsAtTime = transcripts.filter(t => t.timestamp <= timestamp);
    
    // Get questions up to this time
    const questionsAtTime = questions.filter(q => q.timestamp <= timestamp);
    
    // Get most recent biometric snapshot
    const biometricsAtTime = biometrics
      .filter(b => b.timestamp <= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
    
    // Get most recent analysis snapshot
    const analysisAtTime = analysisSnapshots
      .filter(a => a.timestamp <= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
    
    return {
      transcripts: transcriptsAtTime,
      questions: questionsAtTime,
      biometrics: biometricsAtTime,
      analysis: analysisAtTime
    };
  }, [timelineData]);

  // Seek to a specific time in the timeline
  const seekToTime = useCallback((timestamp: number) => {
    setCurrentPlaybackTime(timestamp);
  }, []);

  // Clear playback (show current/live data)
  const clearPlayback = useCallback(() => {
    setCurrentPlaybackTime(null);
  }, []);

  // Import uploaded transcript and analyze
  const importTranscript = useCallback(async (transcriptText: string) => {
    // Split into lines/sentences and add with sequential timestamps
    const lines = transcriptText
      .split(/\n+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const now = Date.now();
    const newTranscripts: TimestampedTranscript[] = lines.map((line, index) => ({
      id: crypto.randomUUID(),
      text: line,
      timestamp: now + (index * 1000), // Space them 1 second apart for timeline
      speaker: undefined
    }));
    
    setTimelineData(prev => ({
      ...prev,
      transcripts: [...prev.transcripts, ...newTranscripts],
      sessionStartTime: now
    }));
    
    return newTranscripts;
  }, []);

  // Get elapsed time in session
  const getElapsedTime = useCallback(() => {
    return Date.now() - sessionStartRef.current;
  }, []);

  // Format timestamp relative to session start
  const formatSessionTime = useCallback((timestamp: number) => {
    const elapsed = timestamp - timelineData.sessionStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timelineData.sessionStartTime]);

  const updateTranscript = useCallback((id: string, patch: Partial<TimestampedTranscript>) => {
    setTimelineData((prev) => ({
      ...prev,
      transcripts: prev.transcripts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  return {
    timelineData,
    currentPlaybackTime,
    startNewSession,
    addTranscript,
    updateTranscript,
    addQuestion,
    markQuestionAsked,
    answerQuestion,
    addBiometricSnapshot,
    addAnalysisSnapshot,
    getDataAtTime,
    seekToTime,
    clearPlayback,
    importTranscript,
    getElapsedTime,
    formatSessionTime
  };
};
