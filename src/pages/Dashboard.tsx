import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Shield, AlertTriangle, FileText, Mic, MicOff, Clock, Pill, LogOut, FolderOpen, Search, Heart, MoreHorizontal, Phone, PhoneOff, Waves, Eye, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder } from '@/utils/audioRecorder';
import { TranscriptionWebSocket, TranscriptionMessage } from '@/utils/transcriptionWebSocket';
import { VideoCapture } from '@/components/VideoCapture';
import { TranscriptUpload } from '@/components/TranscriptUpload';
import { AudioUpload } from '@/components/AudioUpload';
import { TimelineScrubber } from '@/components/TimelineScrubber';
import { ConversationFlowPanel } from '@/components/ConversationFlowPanel';
import { BiometricsLivePanel } from '@/components/BiometricsLivePanel';
import { TranscriptWithCrisis } from '@/components/TranscriptWithCrisis';
import { useBiometrics } from '@/hooks/useBiometrics';
import { usePulseEstimation } from '@/hooks/usePulseEstimation';
import { useTimelineAnalysis } from '@/hooks/useTimelineAnalysis';
import { useSmartQA } from '@/hooks/useSmartQA';
import { useInterviewOrchestrator } from '@/hooks/useInterviewOrchestrator';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';

// Lazy load LiveKit component to avoid issues if not used
const LiveKitVoicePanel = lazy(() => import('@/components/LiveKitVoicePanel').then(m => ({ default: m.LiveKitVoicePanel })));
import { useOvershotVision } from '@/hooks/useOvershotVision';
import { VisualObservation } from '@/types/overshoot';
import { BiometricTimeline } from '@/components/BiometricTimeline';
import { getMemorySize } from '@/utils/temporalEmotionMemory';

const OVERSHOOT_API_KEY = import.meta.env.VITE_OVERSHOOT_API_KEY || '';

interface Diagnosis {
  diagnosis: string;
  dsm5_code: string;
  severity?: string;
  probability: number;
  supporting_criteria: string[];
  missing_criteria: string[];
  severity_rationale: string;
}

interface SafetyAssessment {
  suicide_risk_level: 'Low' | 'Moderate' | 'High' | 'Imminent';
  risk_factors: string[];
  protective_factors: string[];
  immediate_actions?: string[];
  recommended_action: string;
}

interface AssessmentTool {
  tool: string;
  reason: string;
  priority?: string;
  expected_score_range?: string;
}

interface Medication {
  medication: string;
  dose: string;
  rationale: string;
  monitoring: string;
}

interface TreatmentPlan {
  immediate_interventions: string[];
  medication_recommendations: Medication[];
  psychotherapy: string[];
  follow_up_schedule: string[];
  patient_education: string[];
}

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [speechRate, setSpeechRate] = useState<number | null>(null);
  const [longPauses, setLongPauses] = useState<number>(0);

  // Voice AI Mode (LiveKit)
  const [useVoiceAI, setUseVoiceAI] = useState(false);
  const [voiceAIConnected, setVoiceAIConnected] = useState(false);

  // Overshoot visual emotion observation
  const [visualObservations, setVisualObservations] = useState<VisualObservation[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  const [currentOvershotData, setCurrentOvershotData] = useState<VisualObservation | null>(null);
  const [emotionMemorySize, setEmotionMemorySize] = useState(0);

  // Save session (persist transcript + biometrics + media)
  const { saveSession } = useSessionPersistence();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [clinicianName, setClinicianName] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const sessionEndedAtRef = useRef<number | null>(null);

  const videoStreamRef = useRef<MediaStream | null>(null);
  const translationChainRef = useRef<Promise<void>>(Promise.resolve());

  const [differential, setDifferential] = useState<Diagnosis[]>([]);
  const [safetyAssessment, setSafetyAssessment] = useState<SafetyAssessment | null>(null);
  const [assessmentTools, setAssessmentTools] = useState<AssessmentTool[]>([]);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const wsRef = useRef<TranscriptionWebSocket | null>(null);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef<string>('');
  const lastAnalysisTimeRef = useRef<number>(0);
  const isAnalyzingRef = useRef<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Local media capture for archival
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  // Timeline and biometrics hooks
  const timeline = useTimelineAnalysis();
  const biometrics = useBiometrics(videoRef, isRecording);
  const pulse = usePulseEstimation(videoRef, isRecording);

  // Overshoot vision for enhanced emotion and biometric detection
  const overshoot = useOvershotVision({
    apiKey: OVERSHOOT_API_KEY,
    onNovelObservation: useCallback((obs: VisualObservation) => {
      setVisualObservations(prev => [obs, ...prev].slice(0, 20));
      setCurrentEmotion(obs.emotion);
      setCurrentOvershotData(obs);

      // Only show toast for REAL distress signals (filter out "null", "none", empty)
      if (obs.distress_signal &&
          obs.distress_signal !== 'null' &&
          obs.distress_signal.toLowerCase() !== 'none' &&
          obs.distress_signal.trim().length > 0) {
        toast({
          title: 'Distress Signal',
          description: obs.distress_signal,
          variant: 'destructive',
        });
      }
    }, [toast]),
    onRawObservation: useCallback((obs: VisualObservation) => {
      // Update current observation data for live biometrics
      setCurrentOvershotData(obs);
      if (obs.emotion) {
        setCurrentEmotion(obs.emotion);
      }
    }, []),
  });

  // Smart Q&A: auto-detect asked/answered
  const { detectAnswer, detectClinicianQuestion } = useSmartQA();
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);

  // Orchestrator: question suggestions based on conversation phase
  const orchestrator = useInterviewOrchestrator({
    enabled: isRecording,
    transcripts: timeline.timelineData.transcripts,
    questions: timeline.timelineData.questions,
  });

  // Update Overshoot memory size periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setEmotionMemorySize(getMemorySize());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Snapshot biometrics (incl. emotion) every second
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      // Determine dominant emotion from current biometrics.emotions
      let dominantEmotion = 'neutral';
      if (biometrics.emotions) {
        const entries = Object.entries(biometrics.emotions);
        if (entries.length > 0) {
          entries.sort((a, b) => (b[1] as number) - (a[1] as number));
          dominantEmotion = entries[0][0];
        }
      }

      // Prefer Overshoot emotion if available (more accurate)
      if (currentEmotion) {
        dominantEmotion = currentEmotion;
      }

      // Use Overshoot biometrics if available, otherwise fall back to face-api.js
      timeline.addBiometricSnapshot({
        eyeContact: currentOvershotData?.eye_contact ?? biometrics.eyeContact,
        gazeStability: currentOvershotData?.gaze_stability ?? biometrics.gazeStability,
        breathingRate: currentOvershotData?.breathing_rate ?? biometrics.breathingRate,
        blinkRate: currentOvershotData?.blink_rate ?? biometrics.blinkRate,
        headPose: biometrics.headPose,
        pulseEstimate: pulse.currentBPM ?? undefined,
        emotions: biometrics.emotions ? { ...biometrics.emotions } as Record<string, number> : null,
        dominantEmotion,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, biometrics, pulse.currentBPM, timeline, currentEmotion, currentOvershotData]);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/auth');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate('/auth');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const performAnalysis = async (textToAnalyze: string) => {
    if (isAnalyzingRef.current || textToAnalyze.trim().length < 50) return;

    isAnalyzingRef.current = true;
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-psychiatric', {
        body: { transcript: textToAnalyze }
      });

      if (error) throw error;

      if (data) {
        if (data.differential_diagnoses) setDifferential(data.differential_diagnoses);
        if (data.safety_assessment) setSafetyAssessment(data.safety_assessment);
        if (data.assessment_tools_to_administer) setAssessmentTools(data.assessment_tools_to_administer);
        if (data.treatment_plan) setTreatmentPlan(data.treatment_plan);

        // Add questions with sources to timeline
        if (data.critical_questions_to_ask) {
          const questions = data.critical_questions_to_ask;
          questions.forEach((q: any) => {
            if (typeof q === 'object' && q.question) {
              timeline.addQuestion({
                question: q.question,
                source: q.source || 'Clinical Interview',
                category: q.category || 'General'
              });
            } else if (typeof q === 'string') {
              timeline.addQuestion({
                question: q,
                source: 'Clinical Interview',
                category: 'General'
              });
            }
          });
        }

        // Snapshot analysis
        timeline.addAnalysisSnapshot({
          differential: data.differential_diagnoses || [],
          safetyAssessment: data.safety_assessment,
          criticalQuestions: timeline.timelineData.questions,
          assessmentTools: data.assessment_tools_to_administer || [],
          treatmentPlan: data.treatment_plan
        });

        if (data.safety_assessment?.suicide_risk_level === 'High' || 
            data.safety_assessment?.suicide_risk_level === 'Imminent') {
          toast({
            variant: "destructive",
            title: "⚠️ High Risk Alert",
            description: "Immediate safety assessment recommended",
          });
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      isAnalyzingRef.current = false;
      setIsProcessing(false);
      lastAnalysisTimeRef.current = Date.now();
    }
  };

  const handleTranscriptUpload = async (transcriptText: string) => {
    await timeline.importTranscript(transcriptText);
    accumulatedTextRef.current = transcriptText;
    await performAnalysis(transcriptText);
  };

  // Handle voice AI transcript from LiveKit
  const handleVoiceAITranscript = useCallback((text: string, speaker: 'user' | 'agent') => {
    const mappedSpeaker = speaker === 'user' ? 'patient' : 'clinician';
    timeline.addTranscript(text, mappedSpeaker as 'clinician' | 'patient', { rawText: text });
    accumulatedTextRef.current += (accumulatedTextRef.current ? ' ' : '') + text;

    // Trigger analysis periodically
    const now = Date.now();
    if (now - lastAnalysisTimeRef.current >= 15000 && accumulatedTextRef.current.length > 50) {
      performAnalysis(accumulatedTextRef.current);
    }
  }, [timeline]);

  // Handle crisis alerts from voice AI
  const handleVoiceAICrisisAlert = useCallback((alert: any) => {
    // Map to our safety assessment format
    const riskLevel = alert.risk_level === 'imminent' ? 'Imminent'
      : alert.risk_level === 'high' ? 'High'
      : alert.risk_level === 'moderate' ? 'Moderate' : 'Low';

    setSafetyAssessment(prev => ({
      suicide_risk_level: riskLevel as any,
      risk_factors: prev?.risk_factors || [],
      protective_factors: prev?.protective_factors || [],
      immediate_actions: [alert.recommended_action],
      recommended_action: alert.recommended_action,
    }));

    toast({
      variant: "destructive",
      title: `⚠️ ${riskLevel} Risk Alert`,
      description: `${alert.category}: ${alert.reason}`,
    });
  }, [toast]);

  const classifySpeakerHeuristic = useCallback((text: string): 'clinician' | 'patient' => {
    const t = text.trim();
    const lower = t.toLowerCase();

    const looksLikeQuestion =
      t.endsWith('?') ||
      /^(do you|did you|have you|are you|can you|could you|would you|when|where|why|what|how|tell me|have there been|has there been)\b/i.test(lower);

    return looksLikeQuestion ? 'clinician' : 'patient';
  }, []);

  const translateToEnglish = useCallback(async (raw: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('translate-to-english', {
        body: { text: raw },
      });
      if (error) throw error;
      if (data?.english && typeof data.english === 'string') {
        return { english: data.english as string, language: (data.detected_language as string) || undefined };
      }
    } catch (e) {
      console.warn('Translation failed, using raw text:', e);
    }
    return { english: raw, language: undefined };
  }, []);

  const startRecording = async () => {
    try {
      timeline.startNewSession();
      audioChunksRef.current = [];
      videoChunksRef.current = [];
      setRecordedAudioBlob(null);
      setRecordedVideoBlob(null);
      sessionStartedAtRef.current = Date.now();
      sessionEndedAtRef.current = null;

      // Enable both systems together
      setIsRecording(true);
      setUseVoiceAI(true);

      const backendUrl = import.meta.env.VITE_SUPABASE_URL;

      const ws = new TranscriptionWebSocket(
        backendUrl,
        (message: TranscriptionMessage) => {
          if (message.type === 'Turn' && message.transcript) {
            const rawText = message.transcript.trim();

            if (message.turn_is_formatted && rawText) {
              // Serialize translation + downstream logic to keep ordering stable.
              translationChainRef.current = translationChainRef.current.then(async () => {
                const speaker = classifySpeakerHeuristic(rawText);
                const placeholder = timeline.addTranscript(rawText, speaker, { rawText });
                setPartialTranscript('');

                const { english, language } = await translateToEnglish(rawText);
                timeline.updateTranscript(placeholder.id, { text: english, language });

                // Keep analysis text in English
                accumulatedTextRef.current += (accumulatedTextRef.current ? ' ' : '') + english;

                // If this was a clinician question, mark it as asked
                if (speaker === 'clinician') {
                  const askedId = detectClinicianQuestion({ ...placeholder, text: english, speaker }, timeline.timelineData.questions);
                  if (askedId) timeline.markQuestionAsked(askedId);
                }

                // Auto-answer detection for patient answers
                if (speaker === 'patient') {
                  const qa = detectAnswer({ ...placeholder, text: english, speaker }, timeline.timelineData.questions);
                  if (qa.matchedQuestionId && qa.confidence >= 60 && qa.extractedAnswer) {
                    timeline.answerQuestion(qa.matchedQuestionId, qa.extractedAnswer, {
                      method: 'auto',
                      evidence: [english],
                    });
                    setHighlightedQuestionId(qa.matchedQuestionId);
                    window.setTimeout(() => setHighlightedQuestionId(null), 2000);
                  }

                  const now = Date.now();
                  if (now - lastAnalysisTimeRef.current >= 15000) {
                    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
                    performAnalysis(accumulatedTextRef.current);
                  } else {
                    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
                    analysisTimerRef.current = setTimeout(() => {
                      performAnalysis(accumulatedTextRef.current);
                    }, 15000 - (now - lastAnalysisTimeRef.current));
                  }
                }
              });
            } else {
              setPartialTranscript(rawText);
            }
          }
          if (message.speech_rate !== undefined) setSpeechRate(message.speech_rate);
        },
        (error) => toast({ variant: 'destructive', title: 'Connection Error', description: error.message }),
        () => {
          setConnectionStatus('connected');
          toast({ title: 'Connected', description: 'Ready to record' });
        },
        () => setConnectionStatus('disconnected')
      );

      wsRef.current = ws;
      setConnectionStatus('connecting');
      ws.connect();

      // Audio stream for transcription + archival recording
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = audioStream;

      // Start streaming PCM to transcription
      audioRecorderRef.current = new AudioRecorder(
        (audioData) => ws.sendAudio(audioData),
        () => toast({ variant: 'destructive', title: 'Microphone Error', description: 'Failed to access microphone' })
      );

      // Start audio capture for saving - use a separate stream to avoid interference
      try {
        const audioRecordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioRecorder = new MediaRecorder(audioRecordStream, { mimeType: 'audio/webm;codecs=opus' });
        audioRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        mediaRecorderRef.current = audioRecorder;
        audioRecorder.start(1000);
        console.log('[Recording] Audio archival started');
      } catch (err) {
        console.warn('Audio archival recording not supported:', err);
      }

      await audioRecorderRef.current.start();

      // Start Overshoot visual emotion detection
      if (OVERSHOOT_API_KEY) {
        try {
          await overshoot.startVision();
          console.log('[Overshoot] Visual emotion detection started');
        } catch (err) {
          console.warn('[Overshoot] Failed to start:', err);
          // Continue even if Overshoot fails
        }
      }

      toast({ title: 'Recording Started', description: 'Session active with AI emotion detection' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Recording Error', description: 'Failed to start recording' });
      setIsRecording(false);
      setConnectionStatus('disconnected');
    }
  };

  const stopRecording = async () => {
    sessionEndedAtRef.current = Date.now();

    // Stop Overshoot visual emotion detection
    if (overshoot.isActive) {
      try {
        await overshoot.stopVision();
        console.log('[Overshoot] Visual emotion detection stopped');
      } catch (err) {
        console.warn('[Overshoot] Failed to stop:', err);
      }
    }

    // Stop realtime transcription stream
    audioRecorderRef.current?.stop();
    wsRef.current?.disconnect();
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);

    // Wait for translation queue to finish before final analysis/save prompt
    await translationChainRef.current;

    if (accumulatedTextRef.current.trim().length > 0) {
      await performAnalysis(accumulatedTextRef.current);
    }

    const stopRecorderToBlob = async (recorder: MediaRecorder | null, chunks: Blob[], mime: string) => {
      if (!recorder || recorder.state === 'inactive') {
        console.log(`[Recording] Recorder inactive, chunks: ${chunks.length}`);
        // Still return blob from collected chunks if any
        if (chunks.length > 0) {
          return new Blob(chunks, { type: mime });
        }
        return null;
      }

      return await new Promise<Blob | null>((resolve) => {
        recorder.onstop = () => {
          console.log(`[Recording] Recorder stopped, chunks: ${chunks.length}`);
          const blob = chunks.length > 0 ? new Blob(chunks, { type: mime }) : null;
          resolve(blob);
        };
        try {
          recorder.stop();
        } catch (e) {
          console.warn('[Recording] Error stopping recorder:', e);
          // Still try to return chunks
          if (chunks.length > 0) {
            resolve(new Blob(chunks, { type: mime }));
          } else {
            resolve(null);
          }
        }
      });
    };

    // Stop recorders and await final blobs
    const [audioBlob, videoBlob] = await Promise.all([
      stopRecorderToBlob(mediaRecorderRef.current, audioChunksRef.current, 'audio/webm'),
      stopRecorderToBlob(videoRecorderRef.current, videoChunksRef.current, 'video/webm'),
    ]);

    // Clear chunks
    audioChunksRef.current = [];
    videoChunksRef.current = [];

    // Stop audio stream tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }

    // Stop camera stream tracks (VideoCapture will also stop, but we ensure recorder stops cleanly)
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }

    // Persist blobs in state for saving
    setRecordedAudioBlob(audioBlob);
    setRecordedVideoBlob(videoBlob);

    // Disable both systems
    setIsRecording(false);
    setUseVoiceAI(false);
    setVoiceAIConnected(false);
    setConnectionStatus('disconnected');

    // Prompt to save
    setShowSaveDialog(true);

    toast({ title: 'Recording Stopped', description: 'Session ended' });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-success border-success/30 bg-success/5';
      case 'Moderate': return 'text-warning border-warning/30 bg-warning/5';
      case 'High': return 'text-destructive border-destructive/30 bg-destructive/5';
      case 'Imminent': return 'text-destructive border-destructive bg-destructive/10 font-bold';
      default: return 'text-muted-foreground border-border';
    }
  };

  // Get filtered data based on timeline playback position
  const currentPlaybackTime = timeline.currentPlaybackTime;
  const isPlaybackMode = currentPlaybackTime !== null;
  
  // Filter transcripts based on playback time
  const transcripts = useMemo(() => {
    const allTranscripts = timeline.timelineData.transcripts;
    if (!isPlaybackMode) return allTranscripts;
    return allTranscripts.filter(t => t.timestamp <= currentPlaybackTime);
  }, [timeline.timelineData.transcripts, currentPlaybackTime, isPlaybackMode]);

  // Get analysis snapshot at current playback time
  const currentAnalysis = useMemo(() => {
    if (!isPlaybackMode) return null;
    const snapshots = timeline.timelineData.analysisSnapshots;
    const relevantSnapshots = snapshots.filter(s => s.timestamp <= currentPlaybackTime);
    return relevantSnapshots.length > 0 
      ? relevantSnapshots[relevantSnapshots.length - 1] 
      : null;
  }, [timeline.timelineData.analysisSnapshots, currentPlaybackTime, isPlaybackMode]);

  // Get questions at current playback time
  const currentQuestions = useMemo(() => {
    const allQuestions = timeline.timelineData.questions;
    if (!isPlaybackMode) return allQuestions;
    return allQuestions.filter(q => q.timestamp <= currentPlaybackTime);
  }, [timeline.timelineData.questions, currentPlaybackTime, isPlaybackMode]);

  // Use playback analysis or live analysis
  const displayDifferential = isPlaybackMode && currentAnalysis 
    ? currentAnalysis.differential 
    : differential;
  const displaySafetyAssessment = isPlaybackMode && currentAnalysis 
    ? currentAnalysis.safetyAssessment 
    : safetyAssessment;
  const displayTreatmentPlan = isPlaybackMode && currentAnalysis 
    ? currentAnalysis.treatmentPlan 
    : treatmentPlan;
  const displayAssessmentTools = isPlaybackMode && currentAnalysis 
    ? currentAnalysis.assessmentTools 
    : assessmentTools;

  const handleVideoStream = useCallback((stream: MediaStream | null) => {
    videoStreamRef.current = stream;

    // Start video archival recorder when stream is available during recording
    if (isRecording && stream) {
      try {
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) videoChunksRef.current.push(e.data);
        };
        videoRecorderRef.current = recorder;
        recorder.start(1000);
      } catch {
        try {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (ev) => {
            if (ev.data.size > 0) videoChunksRef.current.push(ev.data);
          };
          videoRecorderRef.current = recorder;
          recorder.start(1000);
        } catch (err) {
          console.warn('Video archival recording not supported:', err);
        }
      }
    }
  }, [isRecording]);

  const handleSaveSession = useCallback(async () => {
    try {
      setIsSavingSession(true);

      const startedAt = sessionStartedAtRef.current ?? timeline.timelineData.sessionStartTime;
      const endedAt = sessionEndedAtRef.current ?? Date.now();

      const { sessionId } = await saveSession({
        patientName,
        clinicianName,
        chiefComplaint,
        transcript: accumulatedTextRef.current,
        questions: timeline.timelineData.questions,
        biometrics: timeline.timelineData.biometrics,
        differential,
        safetyAssessment,
        treatmentPlan,
        assessmentTools,
        startedAt,
        endedAt,
        audioBlob: recordedAudioBlob,
        videoBlob: recordedVideoBlob,
      });

      toast({ title: 'Saved', description: 'Session stored successfully' });
      setShowSaveDialog(false);
      navigate(`/session/${sessionId}`);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e?.message || 'Could not save session' });
    } finally {
      setIsSavingSession(false);
    }
  }, [assessmentTools, clinicianName, differential, navigate, patientName, chiefComplaint, recordedAudioBlob, recordedVideoBlob, safetyAssessment, saveSession, timeline.timelineData.biometrics, timeline.timelineData.questions, toast, treatmentPlan]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/arden-logo.png" alt="Arden" className="h-8" />
            <div className="border-l pl-4 hidden sm:block">
              <h1 className="text-lg font-semibold">Clinical Dashboard</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Psychiatric Assessment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/sessions')}>
              <FolderOpen className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sessions</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Save Session Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Session</DialogTitle>
            <DialogDescription>
              Stores transcript, Q&A, biometrics (with per-second emotion), and audio/video recordings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient name *</Label>
              <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g., Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label>Clinician name (optional)</Label>
              <Input value={clinicianName} onChange={(e) => setClinicianName(e.target.value)} placeholder="e.g., Dr. Smith" />
            </div>
            <div className="space-y-2">
              <Label>Chief complaint (optional)</Label>
              <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="e.g., Anxiety" />
            </div>

            <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
              <span>Audio {recordedAudioBlob ? '✓' : '—'}</span>
              <span>Video {recordedVideoBlob ? '✓' : '—'}</span>
              <span>Biometrics: {timeline.timelineData.biometrics.length} pts</span>
              <span>Transcript: {timeline.timelineData.transcripts.length} turns</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} disabled={isSavingSession}>
              Cancel
            </Button>
            <Button onClick={handleSaveSession} disabled={isSavingSession || !patientName.trim()}>
              {isSavingSession ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Recording Controls */}
        <Card className="shadow-lg">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left: Controls */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Session Recording</h2>
                    <p className="text-sm text-muted-foreground">
                      {isRecording
                        ? (voiceAIConnected ? 'Voice AI & Overshoot active' : 'Recording with AI analysis...')
                        : 'Ready to start new session'}
                    </p>
                  </div>
                </div>

                {/* Recording Controls */}
                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <Button onClick={startRecording} size="lg" className="gap-2">
                      <Mic className="h-5 w-5" />
                      Start Session
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                      <MicOff className="h-5 w-5" />
                      End Session
                    </Button>
                  )}

                  {/* Compact menu for upload options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem asChild>
                        <TranscriptUpload onUpload={handleTranscriptUpload} isProcessing={isProcessing} />
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <AudioUpload onTranscriptReady={handleTranscriptUpload} isProcessing={isProcessing} />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isRecording && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                      <span>{connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}</span>
                    </div>
                    {speechRate !== null && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{speechRate.toFixed(1)} wpm</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Voice AI Panel */}
                {useVoiceAI && (
                  <Suspense fallback={
                    <Card className="p-4">
                      <div className="flex items-center justify-center py-8 gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading Voice AI...</span>
                      </div>
                    </Card>
                  }>
                    <LiveKitVoicePanel
                      isEnabled={useVoiceAI}
                      onTranscript={handleVoiceAITranscript}
                      onCrisisAlert={handleVoiceAICrisisAlert}
                      onConnectionChange={setVoiceAIConnected}
                      emotions={biometrics.emotions ? { ...biometrics.emotions } as Record<string, number> : null}
                    />
                  </Suspense>
                )}
              </div>

              {/* Right: Video + Biometrics */}
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <VideoCapture videoRef={videoRef} isRecording={isRecording || useVoiceAI} onStream={handleVideoStream} />
                  {/* Overshoot Emotion Overlay */}
                  {isRecording && currentEmotion && (
                    <div className="absolute bottom-4 left-4">
                      <Badge className="bg-primary/90 text-white text-sm px-3 py-1 backdrop-blur-sm">
                        <Eye className="h-3 w-3 mr-1 inline" />
                        {currentEmotion}
                      </Badge>
                    </div>
                  )}
                </div>
                {(isRecording || useVoiceAI) && (
                  <div className="flex flex-col gap-2">
                    <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Heart className="h-3 w-3 text-destructive" />
                      {pulse.isCalibrating ? 'Calibrating pulse...' : `${pulse.currentBPM ?? '--'} BPM (${pulse.confidence}% conf)`}
                    </div>
                    {overshoot.isActive && (
                      <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Activity className="h-3 w-3 text-primary" />
                        AI Vision Active ({visualObservations.length} observations, {emotionMemorySize} in memory)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Timeline Scrubber */}
        {(transcripts.length > 0 || timeline.timelineData.biometrics.length > 0) && (
          <TimelineScrubber
            sessionStartTime={timeline.timelineData.sessionStartTime}
            currentTime={timeline.currentPlaybackTime}
            biometrics={timeline.timelineData.biometrics}
            analysisSnapshots={timeline.timelineData.analysisSnapshots}
            onSeek={timeline.seekToTime}
            onReset={timeline.clearPlayback}
            formatTime={timeline.formatSessionTime}
          />
        )}

        {/* Main Content: Transcript Left, Analysis Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Transcript + Biometrics */}
          <div className="space-y-4">
            <Card className="h-[calc(100vh-32rem)]">
              <div className="p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Session Transcript
                  {transcripts.length > 0 && (
                    <span className="text-xs text-muted-foreground">({transcripts.length} entries)</span>
                  )}
                </h3>
                
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 bg-muted/30 rounded-lg">
                  {transcripts.length === 0 && !partialTranscript ? (
                    <p className="text-muted-foreground text-center py-8">
                      {isRecording ? 'Listening...' : 'Start a session or upload a transcript'}
                    </p>
                  ) : (
                    <>
                      <TranscriptWithCrisis
                        transcripts={transcripts}
                        formatTime={timeline.formatSessionTime}
                        searchQuery={searchQuery}
                        onCrisisClick={(timestamp, category) => {
                          timeline.seekToTime(timestamp);
                        }}
                      />
                      {partialTranscript && !searchQuery && (
                        <div className="mt-3 p-3 bg-primary/5 border-l-4 border-primary rounded-r-lg">
                          <p className="text-sm italic opacity-60">{partialTranscript}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>

            <BiometricsLivePanel
              eyeContact={currentOvershotData?.eye_contact ?? biometrics.eyeContact}
              gazeStability={currentOvershotData?.gaze_stability ?? biometrics.gazeStability}
              breathingRate={currentOvershotData?.breathing_rate ?? biometrics.breathingRate}
              blinkRate={currentOvershotData?.blink_rate ?? biometrics.blinkRate}
              headPose={biometrics.headPose}
              pulseEstimate={pulse.currentBPM}
              pulseConfidence={pulse.confidence}
              isCalibrating={pulse.isCalibrating}
              isRecording={isRecording}
            />
          </div>

          {/* Right: Analysis Tabs */}
          <Tabs defaultValue="assessment" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="vision"><Eye className="h-4 w-4 mr-1" />Vision</TabsTrigger>
              <TabsTrigger value="safety"><Shield className="h-4 w-4 mr-1" />Safety</TabsTrigger>
              <TabsTrigger value="diagnosis"><Brain className="h-4 w-4 mr-1" />Dx</TabsTrigger>
              <TabsTrigger value="assessment"><FileText className="h-4 w-4 mr-1" />Q&A</TabsTrigger>
              <TabsTrigger value="treatment"><Pill className="h-4 w-4 mr-1" />Tx</TabsTrigger>
            </TabsList>

            {/* Vision Tab - Comprehensive Biometric Timeline */}
            <TabsContent value="vision" className="h-[calc(100vh-28rem)] overflow-y-auto">
              {visualObservations.length === 0 ? (
                <Card className="p-12 text-center">
                  <Eye className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-semibold mb-2">No Visual Data Yet</h3>
                  <p className="text-muted-foreground">
                    Start recording to see comprehensive facial, behavioral, and physiological analysis
                  </p>
                </Card>
              ) : (
                <BiometricTimeline
                  observations={visualObservations}
                  currentObservation={currentOvershotData}
                />
              )}
            </TabsContent>

            <TabsContent value="safety" className="h-[calc(100vh-28rem)] overflow-y-auto">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5" />Safety Assessment
                </h3>
                {displaySafetyAssessment ? (
                  <div className="space-y-6">
                    <div className={`p-4 rounded-lg border-2 ${getRiskColor(displaySafetyAssessment.suicide_risk_level)}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold text-lg">Risk Level: {displaySafetyAssessment.suicide_risk_level}</span>
                      </div>
                      <p className="text-sm mt-2">{displaySafetyAssessment.recommended_action}</p>
                    </div>
                    {displaySafetyAssessment.immediate_actions?.length > 0 && (
                      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-4 w-4" />Immediate Actions
                        </h4>
                        <ul className="space-y-1">
                          {displaySafetyAssessment.immediate_actions.map((a: string, i: number) => (
                            <li key={i} className="text-sm flex gap-2"><span className="text-destructive">•</span>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <h4 className="font-semibold mb-2 text-destructive">Risk Factors</h4>
                        <ul className="space-y-1">{displaySafetyAssessment.risk_factors?.map((f: string, i: number) => <li key={i} className="text-sm">• {f}</li>)}</ul>
                      </div>
                      <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
                        <h4 className="font-semibold mb-2 text-success">Protective Factors</h4>
                        <ul className="space-y-1">{displaySafetyAssessment.protective_factors?.map((f: string, i: number) => <li key={i} className="text-sm">• {f}</li>)}</ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">{isProcessing ? 'Analyzing...' : 'No data yet'}</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="diagnosis" className="h-[calc(100vh-28rem)] overflow-y-auto">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5" />Differential Diagnosis
                </h3>
                {displayDifferential.length > 0 ? (
                  <div className="space-y-4">
                    {displayDifferential.map((dx: any, i: number) => (
                      <div key={i} className="p-4 border rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-lg">{dx.diagnosis}</h4>
                            <p className="text-sm text-muted-foreground">{dx.dsm5_code}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{(dx.probability * 100).toFixed(0)}%</div>
                            {dx.severity && <p className="text-xs text-muted-foreground">{dx.severity}</p>}
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 pt-3 border-t">
                          <div>
                            <h5 className="font-medium text-sm mb-2 text-success">Supporting</h5>
                            <ul className="space-y-1">{dx.supporting_criteria?.map((c: string, j: number) => <li key={j} className="text-sm">✓ {c}</li>)}</ul>
                          </div>
                          <div>
                            <h5 className="font-medium text-sm mb-2 text-muted-foreground">Missing</h5>
                            <ul className="space-y-1">{dx.missing_criteria?.map((c: string, j: number) => <li key={j} className="text-sm">○ {c}</li>)}</ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">{isProcessing ? 'Analyzing...' : 'No data yet'}</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="assessment" className="h-[calc(100vh-28rem)] overflow-y-auto">
              <Card className="p-6">
                <ConversationFlowPanel
                  transcripts={transcripts}
                  questions={currentQuestions}
                  formatTime={timeline.formatSessionTime}
                  orchestrator={orchestrator.result}
                  isThinking={orchestrator.isThinking}
                  isRecording={isRecording}
                />
                
                {displayAssessmentTools.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold mb-3">Recommended Assessment Tools</h4>
                    <div className="space-y-2">
                      {displayAssessmentTools.map((tool: any, i: number) => (
                        <div key={i} className="p-3 border rounded-lg flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{tool.tool}</h5>
                            <p className="text-sm text-muted-foreground">{tool.reason}</p>
                          </div>
                          {tool.priority && <span className="text-xs px-2 py-1 bg-primary/10 rounded">{tool.priority}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="treatment" className="h-[calc(100vh-28rem)] overflow-y-auto">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Pill className="h-5 w-5" />Treatment Plan
                </h3>
                {displayTreatmentPlan ? (
                  <div className="space-y-6">
                    {displayTreatmentPlan.immediate_interventions?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Immediate Interventions</h4>
                        <ul className="space-y-1">
                          {displayTreatmentPlan.immediate_interventions.map((item: string, i: number) => (
                            <li key={i} className="text-sm flex gap-2"><span className="text-primary">→</span>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {displayTreatmentPlan.medication_recommendations?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Medication Recommendations</h4>
                        <div className="space-y-3">
                          {displayTreatmentPlan.medication_recommendations.map((med: Medication, i: number) => (
                            <div key={i} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium">{med.medication}</h5>
                                <span className="text-sm text-primary">{med.dose}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{med.rationale}</p>
                              <p className="text-xs text-muted-foreground mt-1">Monitor: {med.monitoring}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {displayTreatmentPlan.psychotherapy?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Psychotherapy</h4>
                        <ul className="space-y-1">
                          {displayTreatmentPlan.psychotherapy.map((item: string, i: number) => (
                            <li key={i} className="text-sm">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {displayTreatmentPlan.follow_up_schedule?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Follow-up Schedule</h4>
                        <ul className="space-y-1">
                          {displayTreatmentPlan.follow_up_schedule.map((item: string, i: number) => (
                            <li key={i} className="text-sm">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">{isProcessing ? 'Analyzing...' : 'No data yet'}</p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;