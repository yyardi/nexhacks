import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BiometricsChart } from '@/components/BiometricsChart';
import { Download, FileText, Printer, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface SessionReportProps {
  patientName: string;
  sessionDate?: string | Date | null;
  clinicianName?: string | null;
  chiefComplaint?: string | null;
  transcript?: string | null;
  differential?: any[];
  safetyAssessment?: any;
  treatmentPlan?: any;
  biometricsHistory?: any[];
  emotionSummary?: any;
  speechMetrics?: any;
  duration?: number | null;
  // Legacy props for compatibility
  biometrics?: any[];
  questions?: any[];
  analysis?: any;
  crisisPhrases?: any[];
  formatTime?: (timestamp: number) => string;
}

export const SessionReport = ({
  patientName,
  sessionDate,
  clinicianName,
  chiefComplaint,
  transcript,
  differential = [],
  safetyAssessment,
  treatmentPlan,
  biometricsHistory = [],
  emotionSummary,
  speechMetrics,
  duration,
  // Legacy props
  biometrics,
  questions,
  analysis,
  crisisPhrases,
  formatTime
}: SessionReportProps) => {
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  // Use biometricsHistory or biometrics
  const bioData = biometricsHistory?.length ? biometricsHistory : biometrics || [];

  const formattedDate = sessionDate 
    ? typeof sessionDate === 'string' 
      ? format(new Date(sessionDate), 'PPPp')
      : format(sessionDate, 'PPPp')
    : 'Not specified';
  
  const formattedDuration = duration 
    ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` 
    : 'N/A';

  // Get dominant emotion
  const dominantEmotion = useMemo(() => {
    if (emotionSummary) {
      return Object.entries(emotionSummary).reduce((a, b) => 
        (a[1] as number) > (b[1] as number) ? a : b
      )[0];
    }
    if (!bioData?.length) return 'Unknown';
    
    const emotions = bioData.filter((b: any) => b.emotions).map((b: any) => b.emotions);
    if (!emotions.length) return 'Unknown';

    const avg: Record<string, number> = {};
    const keys = Object.keys(emotions[0] || {});
    keys.forEach(key => {
      avg[key] = emotions.reduce((sum: number, e: any) => sum + (e[key] || 0), 0) / emotions.length;
    });

    return Object.entries(avg).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }, [emotionSummary, bioData]);

  // Use differential or analysis.differential
  const diagnoses = differential?.length ? differential : analysis?.differential || [];
  const safety = safetyAssessment || analysis?.safetyAssessment;
  const treatment = treatmentPlan || analysis?.treatmentPlan;

  const fullReport = useMemo(() => `
================================================================================
                    PSYCHIATRIC CLINICAL ASSESSMENT REPORT
================================================================================

Patient: ${patientName}
Date: ${formattedDate}
Clinician: ${clinicianName || 'Not specified'}
Duration: ${formattedDuration}

--------------------------------------------------------------------------------
SUBJECTIVE
--------------------------------------------------------------------------------
Chief Complaint: ${chiefComplaint || 'Not documented'}

${transcript ? `Patient Statement (excerpt):
${transcript.slice(0, 1000)}${transcript.length > 1000 ? '...' : ''}` : 'No transcript available'}

--------------------------------------------------------------------------------
OBJECTIVE
--------------------------------------------------------------------------------
Session Duration: ${formattedDuration}
${speechMetrics?.rate ? `Speech Rate: ${speechMetrics.rate} WPM` : ''}
${dominantEmotion !== 'Unknown' ? `Dominant Affect: ${dominantEmotion}` : ''}
${bioData?.length ? `
Behavioral Observations:
  - Eye Contact: ${Math.round(bioData.reduce((s: number, b: any) => s + (b.eyeContact || 0), 0) / bioData.length)}% average
  - Gaze Stability: ${Math.round(bioData.reduce((s: number, b: any) => s + (b.gazeStability || 0), 0) / bioData.length)}%
  - Biometric Readings: ${bioData.length}
` : ''}

--------------------------------------------------------------------------------
ASSESSMENT
--------------------------------------------------------------------------------
${safety ? `
Safety Assessment:
  - Suicide Risk Level: ${safety.suicide_risk_level}
  - Risk Factors: ${safety.risk_factors?.join(', ') || 'None identified'}
  - Protective Factors: ${safety.protective_factors?.join(', ') || 'None identified'}
  - Recommendation: ${safety.recommended_action || 'N/A'}
` : 'No safety assessment available'}

${diagnoses?.length ? `
Differential Diagnosis:
${diagnoses.map((dx: any, i: number) => `  ${i + 1}. ${dx.diagnosis} (${dx.dsm5_code}) - ${(dx.probability * 100).toFixed(0)}% probability
     ${dx.severity ? `Severity: ${dx.severity}` : ''}`).join('\n')}
` : 'No differential diagnosis available'}

--------------------------------------------------------------------------------
PLAN
--------------------------------------------------------------------------------
${treatment ? `
${treatment.immediate_interventions?.length ? `
Immediate Interventions:
${treatment.immediate_interventions.map((i: string) => `  - ${i}`).join('\n')}` : ''}

${treatment.medication_recommendations?.length ? `
Medications:
${treatment.medication_recommendations.map((m: any) => `  - ${m.medication} ${m.dose}`).join('\n')}` : ''}

${treatment.psychotherapy?.length ? `
Psychotherapy:
${treatment.psychotherapy.map((p: string) => `  - ${p}`).join('\n')}` : ''}

${treatment.follow_up_schedule?.length ? `
Follow-up:
${treatment.follow_up_schedule.map((f: string) => `  - ${f}`).join('\n')}` : ''}
` : 'Treatment plan pending further assessment.'}

================================================================================
Generated by Charcot Clinical Decision Support System
This report is for clinical use only and should be reviewed by a licensed professional.
================================================================================
  `.trim(), [patientName, formattedDate, clinicianName, formattedDuration, chiefComplaint, transcript, speechMetrics, dominantEmotion, bioData, safety, diagnoses, treatment]);

  const handleDownload = () => {
    const blob = new Blob([fullReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-report-${patientName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Report Downloaded' });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullReport);
    toast({ title: 'Report Copied to Clipboard' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Clinical Progress Note
              </CardTitle>
              <CardDescription className="mt-2">
                SOAP Format Report for {patientName}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6 print:break-inside-avoid">
        {/* Header Info */}
        <Card className="print:shadow-none print:border-2">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p className="font-semibold">{patientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-semibold">{formattedDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Clinician</p>
                <p className="font-semibold">{clinicianName || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-semibold">{formattedDuration}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SOAP Sections */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Subjective</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Chief Complaint</p>
                  <p className="text-sm">{chiefComplaint || 'Not documented'}</p>
                </div>
                {transcript && (
                  <div>
                    <p className="text-xs text-muted-foreground">Patient Statement</p>
                    <p className="text-sm line-clamp-4">{transcript.slice(0, 300)}...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Objective</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {speechMetrics?.rate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Speech Rate</span>
                    <span>{speechMetrics.rate} WPM</span>
                  </div>
                )}
                {dominantEmotion !== 'Unknown' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dominant Affect</span>
                    <Badge variant="secondary" className="capitalize">{dominantEmotion}</Badge>
                  </div>
                )}
                {bioData?.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eye Contact</span>
                      <span>{Math.round(bioData.reduce((s: number, b: any) => s + (b.eyeContact || 0), 0) / bioData.length)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Biometric Readings</span>
                      <span>{bioData.length}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {safety && (
              <div className={`p-4 rounded-lg border-2 ${
                safety.suicide_risk_level === 'High' || 
                safety.suicide_risk_level === 'Imminent'
                  ? 'border-destructive bg-destructive/5'
                  : safety.suicide_risk_level === 'Moderate'
                  ? 'border-warning bg-warning/5'
                  : 'border-success bg-success/5'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={
                    safety.suicide_risk_level === 'High' || 
                    safety.suicide_risk_level === 'Imminent' 
                      ? 'destructive' 
                      : 'secondary'
                  }>
                    {safety.suicide_risk_level} Risk
                  </Badge>
                </div>
                <p className="text-sm">{safety.recommended_action}</p>
              </div>
            )}

            {diagnoses?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Differential Diagnosis</h4>
                <div className="space-y-2">
                  {diagnoses.slice(0, 3).map((dx: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div>
                        <span className="font-medium">{dx.diagnosis}</span>
                        <span className="text-xs text-muted-foreground ml-2">{dx.dsm5_code}</span>
                      </div>
                      <Badge>{(dx.probability * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan */}
        {treatment && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {treatment.immediate_interventions?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Immediate Interventions</h4>
                  <ul className="text-sm space-y-1">
                    {treatment.immediate_interventions.map((i: string, idx: number) => (
                      <li key={idx}>• {i}</li>
                    ))}
                  </ul>
                </div>
              )}

              {treatment.medication_recommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Medications</h4>
                  <div className="space-y-1">
                    {treatment.medication_recommendations.map((m: any, idx: number) => (
                      <div key={idx} className="text-sm p-2 bg-muted/30 rounded">
                        <span className="font-medium">{m.medication}</span>
                        <span className="text-primary ml-2">{m.dose}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {treatment.follow_up_schedule?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Follow-up</h4>
                  <ul className="text-sm space-y-1">
                    {treatment.follow_up_schedule.map((f: string, idx: number) => (
                      <li key={idx}>• {f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Biometrics Chart */}
        {bioData?.length > 10 && (
          <Card className="print:break-before-page">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Biometric Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <BiometricsChart data={bioData} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
