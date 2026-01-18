import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClinicalQuestion, BiometricSnapshot } from "@/hooks/useTimelineAnalysis";

type SaveSessionInput = {
  patientName: string;
  clinicianName?: string;
  chiefComplaint?: string;
  transcript: string;
  questions: ClinicalQuestion[];
  biometrics: BiometricSnapshot[];
  differential: any[];
  safetyAssessment: any;
  treatmentPlan: any;
  assessmentTools: any[];
  startedAt: number;
  endedAt: number;
  audioBlob: Blob | null;
  videoBlob: Blob | null;
  crisisKeywords?: any[];
};

function computeEmotionSummary(biometrics: BiometricSnapshot[]) {
  const withEmotions = biometrics.filter((b) => b.emotions && Object.keys(b.emotions).length > 0);
  if (withEmotions.length === 0) return null;

  const sums: Record<string, number> = {};
  for (const b of withEmotions) {
    for (const [k, v] of Object.entries(b.emotions || {})) {
      sums[k] = (sums[k] ?? 0) + (typeof v === "number" ? v : 0);
    }
  }

  const avg: Record<string, number> = {};
  for (const [k, v] of Object.entries(sums)) {
    avg[k] = v / withEmotions.length;
  }
  return avg;
}

async function createOrFindPatientId(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Patient name is required");

  const { data: existing, error: findError } = await supabase
    .from("patients")
    .select("id")
    .eq("name", trimmed)
    .limit(1);

  if (findError) throw findError;
  if (existing && existing[0]?.id) return existing[0].id;

  const { data: created, error: createError } = await supabase
    .from("patients")
    .insert({ name: trimmed })
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id;
}

async function uploadRecording(opts: {
  sessionId: string;
  kind: "audio" | "video";
  blob: Blob;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not authenticated");

  const ext = opts.kind === "audio" ? "webm" : "webm";
  const contentType = opts.kind === "audio" ? "audio/webm" : "video/webm";
  const path = `${user.id}/${opts.sessionId}/${opts.kind}.${ext}`;

  const { error } = await supabase.storage
    .from("session-recordings")
    .upload(path, opts.blob, { upsert: true, contentType });

  if (error) throw error;

  // IMPORTANT: bucket is private; persist the STORAGE PATH, not a public URL.
  return path;
}

export const useSessionPersistence = () => {
  const saveSession = useCallback(async (input: SaveSessionInput) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const sessionId = crypto.randomUUID();
    const patientId = await createOrFindPatientId(input.patientName);

    const emotionSummary = computeEmotionSummary(input.biometrics);

    const answered = input.questions
      .filter((q) => q.answered && q.answer)
      .map((q) => ({
        id: q.id,
        question: q.question,
        source: q.source,
        category: q.category,
        asked: q.asked ?? false,
        askedAt: q.askedAt ?? null,
        answeredAt: q.answeredAt ?? null,
        answer: q.answer ?? null,
        answerMethod: q.answerMethod ?? null,
        answerEvidence: q.answerEvidence ?? null,
      }));

    const durationSeconds = Math.max(0, Math.round((input.endedAt - input.startedAt) / 1000));

    let audioPath: string | null = null;
    let videoPath: string | null = null;

    if (input.audioBlob && input.audioBlob.size > 0) {
      audioPath = await uploadRecording({ sessionId, kind: "audio", blob: input.audioBlob });
    }
    if (input.videoBlob && input.videoBlob.size > 0) {
      videoPath = await uploadRecording({ sessionId, kind: "video", blob: input.videoBlob });
    }

    const { error: insertError } = await supabase.from("sessions").insert({
      id: sessionId,
      patient_id: patientId,
      session_date: new Date(input.endedAt).toISOString(),
      clinician_name: input.clinicianName?.trim() || null,
      chief_complaint: input.chiefComplaint?.trim() || null,
      full_transcript: input.transcript || null,
      differential_diagnosis: input.differential || null,
      safety_assessment: input.safetyAssessment
        ? {
            ...input.safetyAssessment,
            crisis_keywords: input.crisisKeywords || [],
          }
        : null,
      assessment_tools_recommended: (input.assessmentTools || []).map((t: any) => t.tool).filter(Boolean) || null,
      critical_questions: input.questions.map((q) => q.question) || null,
      questions_answers: answered as any,
      biometrics_data: input.biometrics as any,
      emotion_summary: emotionSummary as any,
      duration_seconds: durationSeconds,
      audio_url: audioPath,
      video_url: videoPath,
      session_status: "completed",
      updated_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    return { sessionId };
  }, []);

  return { saveSession };
};
