import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClinicalQuestion, TimestampedTranscript } from "@/hooks/useTimelineAnalysis";

export type InterviewPhase =
  | "opening"
  | "chief_complaint"
  | "history_present_illness"
  | "safety"
  | "mood_anxiety"
  | "substances"
  | "psychosis_mania"
  | "trauma"
  | "mse"
  | "wrap_up";

export interface NextPromptOption {
  text: string;
  rationale?: string;
}

export interface OrchestratorResult {
  phase: InterviewPhase;
  phaseLabel: string;
  nextPrompts: NextPromptOption[];
  newQuestions: Array<{
    question: string;
    source: string;
    category: string;
  }>;
}

function normalize(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function useInterviewOrchestrator({
  enabled,
  transcripts,
  questions,
}: {
  enabled: boolean;
  transcripts: TimestampedTranscript[];
  questions: ClinicalQuestion[];
}) {
  const [result, setResult] = useState<OrchestratorResult | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const lastHashRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);

  const transcriptContext = useMemo(() => {
    // Keep it small to avoid latency/cost; last ~12 turns is enough for orchestration.
    return transcripts.slice(-12).map(t => ({
      text: t.text,
      speaker: t.speaker ?? "unknown",
      timestamp: t.timestamp,
    }));
  }, [transcripts]);

  const existingQuestionSet = useMemo(() => {
    return new Set(questions.filter(q => q?.question).map(q => normalize(q.question)));
  }, [questions]);

  const invoke = useCallback(async () => {
    if (!enabled) return;
    const hash = JSON.stringify({ transcriptContext, q: questions.map(q => q.question).slice(-20) });
    if (hash === lastHashRef.current) return;
    lastHashRef.current = hash;

    setIsThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("interview-orchestrator", {
        body: {
          transcriptTurns: transcriptContext,
          existingQuestions: questions.map(q => ({
            id: q.id,
            question: q.question,
            source: q.source,
            category: q.category,
            answered: q.answered,
            asked: q.asked ?? false,
          })),
        },
      });
      if (error) throw error;

      const safe: OrchestratorResult = {
        phase: data?.phase ?? "opening",
        phaseLabel: data?.phaseLabel ?? "Opening",
        nextPrompts: Array.isArray(data?.nextPrompts) ? data.nextPrompts.slice(0, 3) : [],
        newQuestions: Array.isArray(data?.newQuestions) ? data.newQuestions : [],
      };

      // Client-side dedupe as a final guard.
      safe.newQuestions = safe.newQuestions.filter(nq => nq?.question && !existingQuestionSet.has(normalize(nq.question)));

      setResult(safe);
    } catch (e) {
      // Non-fatal: orchestration is assistive; avoid noisy errors.
      console.warn("interview-orchestrator failed", e);
    } finally {
      setIsThinking(false);
    }
  }, [enabled, transcriptContext, questions, existingQuestionSet]);

  useEffect(() => {
    if (!enabled) return;
    // Debounce: think shortly after each new finalized turn.
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      invoke();
    }, 800);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, transcripts.length, invoke]);

  return {
    result,
    isThinking,
    refresh: invoke,
  };
}
