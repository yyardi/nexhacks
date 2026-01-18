import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

// Crisis phrase patterns for detection
const CRISIS_PATTERNS = [
  /\b(kill myself|end my life|suicide|suicidal|want to die|better off dead)\b/gi,
  /\b(hurt myself|cut myself|self-harm|cutting)\b/gi,
  /\b(hopeless|no hope|worthless|burden)\b/gi,
  /\b(overdose|relapse|using again)\b/gi,
  /\b(voices told|hearing voices|they're watching)\b/gi,
];

const extractCrisisPhrases = (text: string): string[] => {
  if (!text) return [];
  const phrases: string[] = [];
  CRISIS_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) phrases.push(...matches);
  });
  return [...new Set(phrases)];
};

const calculateEmotionSummary = (biometrics: any[]): Record<string, number> => {
  if (!biometrics || biometrics.length === 0) return {};
  
  const emotions = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];
  const emotionCounts: Record<string, number> = {};
  emotions.forEach(e => emotionCounts[e] = 0);
  
  biometrics.forEach(b => {
    if (b.emotions) {
      let maxEmotion = 'neutral';
      let maxValue = 0;
      Object.entries(b.emotions).forEach(([emotion, value]) => {
        if ((value as number) > maxValue) {
          maxValue = value as number;
          maxEmotion = emotion;
        }
      });
      emotionCounts[maxEmotion] = (emotionCounts[maxEmotion] || 0) + 1;
    }
  });
  
  const total = biometrics.length || 1;
  const summary: Record<string, number> = {};
  Object.entries(emotionCounts).forEach(([emotion, count]) => {
    if (count > 0) {
      summary[emotion] = count / total;
    }
  });
  
  return summary;
};

interface SessionExportProps {
  transcript: string;
  differential: any[];
  safetyAssessment: any;
  criticalQuestions: string[];
  assessmentTools: any[];
  treatmentPlan: any;
  speechMetrics: { rate: number | null; longPauses: number };
  biometricsHistory: any[];
  audioBlob?: Blob | null;
  videoBlob?: Blob | null;
  onSave: () => void;
}

export const SessionExport = ({
  transcript,
  differential,
  safetyAssessment,
  criticalQuestions,
  assessmentTools,
  treatmentPlan,
  speechMetrics,
  biometricsHistory,
  audioBlob,
  videoBlob,
  onSave
}: SessionExportProps) => {
  const { toast } = useToast();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [patientName, setPatientName] = useState('');
  const [clinicianName, setClinicianName] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  const generateReport = () => {
    const date = new Date().toLocaleString();
    const emotionalSummary = biometricsHistory.length > 0
      ? `Most common emotion: ${getMostCommonEmotion()}`
      : 'No biometric data collected';

    return `
===========================================
PSYCHIATRIC CLINICAL ASSESSMENT REPORT
===========================================
Date: ${date}
Patient: ${patientName || 'Not specified'}
Clinician: ${clinicianName || 'Not specified'}
Chief Complaint: ${chiefComplaint || 'Not specified'}

-------------------------------------------
SAFETY ASSESSMENT
-------------------------------------------
${safetyAssessment ? `
Risk Level: ${safetyAssessment.suicide_risk_level}

Risk Factors:
${safetyAssessment.risk_factors?.map((f: string) => `• ${f}`).join('\n') || 'None identified'}

Protective Factors:
${safetyAssessment.protective_factors?.map((f: string) => `• ${f}`).join('\n') || 'None identified'}

Recommended Action:
${safetyAssessment.recommended_action || 'Not specified'}
${safetyAssessment.immediate_actions?.length > 0 ? `
⚠️ IMMEDIATE ACTIONS REQUIRED:
${safetyAssessment.immediate_actions.map((a: string) => `• ${a}`).join('\n')}
` : ''}
` : 'Not available'}

-------------------------------------------
DIFFERENTIAL DIAGNOSIS
-------------------------------------------
${differential.length > 0 ? differential.map((dx, i) => `
${i + 1}. ${dx.diagnosis} (${dx.dsm5_code})
   Probability: ${(dx.probability * 100).toFixed(0)}%
   ${dx.severity ? `Severity: ${dx.severity}` : ''}
   
   Supporting Criteria:
   ${dx.supporting_criteria?.map((c: string) => `   • ${c}`).join('\n') || '   None'}
   
   Missing Criteria:
   ${dx.missing_criteria?.map((c: string) => `   • ${c}`).join('\n') || '   None'}
`).join('\n') : 'Not available'}

-------------------------------------------
CRITICAL QUESTIONS TO ASK
-------------------------------------------
${criticalQuestions.length > 0 ? criticalQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None'}

-------------------------------------------
RECOMMENDED ASSESSMENT TOOLS
-------------------------------------------
${assessmentTools.length > 0 ? assessmentTools.map((tool, i) => `
${i + 1}. ${tool.tool}
   Reason: ${tool.reason}
   ${tool.priority ? `Priority: ${tool.priority}` : ''}
`).join('\n') : 'Not available'}

-------------------------------------------
TREATMENT PLAN
-------------------------------------------
${treatmentPlan ? `
Immediate Interventions:
${treatmentPlan.immediate_interventions?.map((i: string) => `• ${i}`).join('\n') || 'None'}

Medication Recommendations:
${treatmentPlan.medication_recommendations?.map((med: any) => `
• ${med.medication} - ${med.dose}
  Rationale: ${med.rationale}
`).join('\n') || 'None'}

Psychotherapy:
${treatmentPlan.psychotherapy?.map((p: string) => `• ${p}`).join('\n') || 'None'}
` : 'Not available'}

-------------------------------------------
SPEECH METRICS
-------------------------------------------
${speechMetrics.rate ? `Speech Rate: ${speechMetrics.rate.toFixed(1)} WPM` : 'Not available'}
${speechMetrics.longPauses > 0 ? `Long Pauses: ${speechMetrics.longPauses}` : ''}

-------------------------------------------
BIOMETRIC DATA SUMMARY
-------------------------------------------
${emotionalSummary}
Total Readings: ${biometricsHistory.length}

-------------------------------------------
FULL TRANSCRIPT
-------------------------------------------
${transcript || 'No transcript available'}

===========================================
END OF REPORT
===========================================
Generated by Arden AI Mental Health Companion
`.trim();
  };

  const getMostCommonEmotion = () => {
    if (biometricsHistory.length === 0) return 'N/A';
    const summary = calculateEmotionSummary(biometricsHistory);
    const sorted = Object.entries(summary).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'neutral';
  };

  const downloadReport = () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psychiatric-assessment-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report Downloaded", description: "Clinical assessment report saved" });
  };

  const saveSession = async () => {
    if (!patientName.trim()) {
      toast({ title: "Error", description: "Patient name is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);
    setSaveStatus('Initializing...');

    try {
      // Step 1: Authenticate (10%)
      setSaveStatus('Authenticating...');
      setSaveProgress(10);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 2: Find or create patient (20%)
      setSaveStatus('Finding patient record...');
      setSaveProgress(20);
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('name', patientName.trim())
        .single();

      let patientId = existingPatient?.id;

      if (!patientId) {
        setSaveStatus('Creating patient record...');
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({ name: patientName.trim() })
          .select('id')
          .single();

        if (patientError) throw patientError;
        patientId = newPatient.id;
      }

      // Step 3: Prepare session data (30%)
      setSaveStatus('Preparing session data...');
      setSaveProgress(30);
      const emotionSummary = calculateEmotionSummary(biometricsHistory);
      const crisisPhrases = extractCrisisPhrases(transcript);
      const sessionDuration = biometricsHistory.length > 1
        ? Math.floor((biometricsHistory[biometricsHistory.length - 1]?.timestamp - biometricsHistory[0]?.timestamp) / 1000)
        : 0;

      // Step 4: Create session record (40%)
      setSaveStatus('Saving session record...');
      setSaveProgress(40);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          patient_id: patientId,
          clinician_name: clinicianName.trim() || null,
          chief_complaint: chiefComplaint.trim() || null,
          full_transcript: transcript,
          differential_diagnosis: differential,
          safety_assessment: safetyAssessment,
          critical_questions: criticalQuestions,
          assessment_tools_recommended: assessmentTools.map(t => t.tool),
          session_notes: treatmentPlan,
          speech_metrics: speechMetrics.rate ? { rate: speechMetrics.rate, longPauses: speechMetrics.longPauses } : null,
          biometrics_data: biometricsHistory.length > 0 ? { snapshots: biometricsHistory } : null,
          emotion_summary: Object.keys(emotionSummary).length > 0 ? emotionSummary : null,
          crisis_phrases: crisisPhrases.length > 0 ? crisisPhrases : null,
          duration_seconds: sessionDuration,
          session_date: new Date().toISOString(),
          session_status: 'completed'
        })
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      const sessionId = sessionData.id;

      // Step 5: Upload audio if available (50-70%)
      let audioUrl: string | null = null;
      if (audioBlob && audioBlob.size > 0) {
        setSaveStatus(`Uploading audio (${(audioBlob.size / 1024 / 1024).toFixed(1)} MB)...`);
        setSaveProgress(50);

        const audioPath = `${user.id}/${sessionId}/audio.webm`;
        const { error: audioError } = await supabase.storage
          .from('session-recordings')
          .upload(audioPath, audioBlob, {
            contentType: 'audio/webm',
            upsert: true
          });

        if (audioError) {
          console.error('Audio upload error:', audioError);
          setSaveStatus('Audio upload failed, continuing...');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('session-recordings')
            .getPublicUrl(audioPath);
          audioUrl = publicUrl;
          setSaveProgress(70);
        }
      } else {
        setSaveProgress(70);
      }

      // Step 6: Upload video if available (70-90%)
      let videoUrl: string | null = null;
      if (videoBlob && videoBlob.size > 0) {
        setSaveStatus(`Uploading video (${(videoBlob.size / 1024 / 1024).toFixed(1)} MB)...`);
        setSaveProgress(70);

        const videoPath = `${user.id}/${sessionId}/video.webm`;
        const { error: videoError } = await supabase.storage
          .from('session-recordings')
          .upload(videoPath, videoBlob, {
            contentType: 'video/webm',
            upsert: true
          });

        if (videoError) {
          console.error('Video upload error:', videoError);
          setSaveStatus('Video upload failed, continuing...');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('session-recordings')
            .getPublicUrl(videoPath);
          videoUrl = publicUrl;
          setSaveProgress(90);
        }
      } else {
        setSaveProgress(90);
      }

      // Step 7: Update session with media URLs (95%)
      if (audioUrl || videoUrl) {
        setSaveStatus('Finalizing...');
        setSaveProgress(95);
        await supabase
          .from('sessions')
          .update({
            audio_url: audioUrl,
            video_url: videoUrl
          })
          .eq('id', sessionId);
      }

      // Step 8: Complete (100%)
      setSaveStatus('Complete!');
      setSaveProgress(100);

      toast({
        title: "Session Saved Successfully",
        description: `Clinical session saved${audioUrl ? ' with audio' : ''}${videoUrl ? ' and video' : ''}`
      });

      setTimeout(() => {
        setShowSaveDialog(false);
        setSaveProgress(0);
        setSaveStatus('');
        onSave();
      }, 500);
    } catch (error: any) {
      console.error('Error saving session:', error);
      setSaveStatus('Save failed');
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasData = transcript || differential.length > 0 || safetyAssessment;

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={downloadReport} disabled={!hasData} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button onClick={() => setShowSaveDialog(true)} disabled={!hasData} size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save Session
        </Button>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Session</DialogTitle>
            <DialogDescription>
              Stores transcript, Q&A, biometrics (with per-second emotion), and audio/video recordings.
            </DialogDescription>
          </DialogHeader>

          {/* Show progress bar only when saving */}
          {isSaving ? (
            <div className="py-12 px-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{saveStatus}</span>
                  <span className="font-medium">{saveProgress}%</span>
                </div>
                <Progress value={saveProgress} className="h-3" />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient">Patient name *</Label>
                  <Input
                    id="patient"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Yash"
                  />
                </div>
                <div>
                  <Label htmlFor="clinician">Clinician name (optional)</Label>
                  <Input
                    id="clinician"
                    value={clinicianName}
                    onChange={(e) => setClinicianName(e.target.value)}
                    placeholder="e.g., Dr. Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="complaint">Chief complaint (optional)</Label>
                  <Input
                    id="complaint"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="e.g., Anxiety"
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  Audio ✓ Video ✓ Biometrics: {biometricsHistory.length} pts  Transcript: {transcript.split(' ').filter(w => w).length} turns
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveSession}>
                  Save Session
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
