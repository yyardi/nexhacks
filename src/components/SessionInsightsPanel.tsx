import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, Shield, Pill, FileText, Activity, Target, 
  AlertTriangle, CheckCircle, Clock, Sparkles, TrendingUp,
  Heart, Eye, Mic, ArrowRight, Loader2
} from 'lucide-react';

interface SessionInsightsPanelProps {
  sessionData: {
    transcript: string;
    biometrics: any[];
    questionsAnswers: Record<string, string>;
    differential: any[];
    safetyAssessment: any;
    emotionSummary: Record<string, number>;
    duration: number;
    patientName?: string;
  };
}

export const SessionInsightsPanel = ({ sessionData }: SessionInsightsPanelProps) => {
  const { toast } = useToast();
  const [insights, setInsights] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateInsights = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-session-insights', {
        body: { sessionData },
      });

      if (error) throw error;
      setInsights(data.insights);
      toast({ title: 'Analysis Complete', description: 'Comprehensive insights generated' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!insights) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Generate AI Analysis</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a comprehensive clinical report analyzing biometrics, speech patterns, and emotional data
            </p>
          </div>
          <Button onClick={generateInsights} disabled={isGenerating} size="lg">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Session...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  const riskColors: Record<string, string> = {
    'Low': 'text-success border-success/30 bg-success/10',
    'Moderate': 'text-warning border-warning/30 bg-warning/10',
    'High': 'text-destructive border-destructive/30 bg-destructive/10',
    'Imminent': 'text-destructive border-destructive bg-destructive/20 font-bold',
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{insights.executiveSummary}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="mse" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="mse" className="text-xs"><Brain className="h-3 w-3 mr-1" />MSE</TabsTrigger>
          <TabsTrigger value="biometrics" className="text-xs"><Activity className="h-3 w-3 mr-1" />Bio</TabsTrigger>
          <TabsTrigger value="diagnosis" className="text-xs"><Target className="h-3 w-3 mr-1" />Dx</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs"><Shield className="h-3 w-3 mr-1" />Risk</TabsTrigger>
          <TabsTrigger value="plan" className="text-xs"><Pill className="h-3 w-3 mr-1" />Plan</TabsTrigger>
        </TabsList>

        {/* Mental Status Exam */}
        <TabsContent value="mse" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mental Status Examination</CardTitle>
              <CardDescription>AI-generated from session data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.clinicalFindings?.mentalStatusExam && (
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(insights.clinicalFindings.mentalStatusExam).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg bg-muted/30 border">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <p className="text-sm">{value as string}</p>
                    </div>
                  ))}
                </div>
              )}

              {insights.clinicalFindings?.keyObservations?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Key Observations</h4>
                  <ul className="space-y-2">
                    {insights.clinicalFindings.keyObservations.map((obs: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        {obs}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Biometric Interpretation */}
        <TabsContent value="biometrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Biometric Interpretation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.biometricInterpretation && (
                <>
                  <p className="text-sm p-3 bg-muted/30 rounded-lg">
                    {insights.biometricInterpretation.summary}
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-primary" />
                        <h4 className="font-medium text-sm">Eye Contact</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {insights.biometricInterpretation.eyeContactAnalysis}
                      </p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="h-4 w-4 text-destructive" />
                        <h4 className="font-medium text-sm">Physiological</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {insights.biometricInterpretation.physiologicalFindings}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h4 className="font-medium text-sm">Emotional Trajectory</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {insights.biometricInterpretation.emotionalTrajectory}
                    </p>
                  </div>

                  {insights.biometricInterpretation.redFlags?.length > 0 && (
                    <div className="p-3 border-2 border-destructive/30 rounded-lg bg-destructive/5">
                      <h4 className="font-medium text-sm text-destructive mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Red Flags
                      </h4>
                      <ul className="space-y-1">
                        {insights.biometricInterpretation.redFlags.map((flag: string, i: number) => (
                          <li key={i} className="text-xs">• {flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostic Formulation */}
        <TabsContent value="diagnosis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diagnostic Formulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.diagnosticFormulation?.primaryDiagnosis && (
                <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">
                        {insights.diagnosticFormulation.primaryDiagnosis.diagnosis}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {insights.diagnosticFormulation.primaryDiagnosis.dsmCode}
                      </p>
                    </div>
                    <Badge variant="default" className="text-lg px-3">
                      {((insights.diagnosticFormulation.primaryDiagnosis.confidence || 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-success mb-2">Supporting Evidence</h5>
                      <ul className="space-y-1">
                        {insights.diagnosticFormulation.primaryDiagnosis.supportingEvidence?.map((e: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-1">
                            <CheckCircle className="h-3 w-3 text-success flex-shrink-0 mt-0.5" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">To Investigate</h5>
                      <ul className="space-y-1">
                        {insights.diagnosticFormulation.primaryDiagnosis.rulingOutFactors?.map((e: string, i: number) => (
                          <li key={i} className="text-xs">• {e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {insights.diagnosticFormulation?.differentials?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Differential Diagnoses</h4>
                  <div className="space-y-2">
                    {insights.diagnosticFormulation.differentials.map((dx: any, i: number) => (
                      <div key={i} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{dx.diagnosis}</span>
                          <span className="text-xs text-muted-foreground ml-2">{dx.dsmCode}</span>
                        </div>
                        <Badge variant="outline">{((dx.probability || 0) * 100).toFixed(0)}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.diagnosticFormulation?.diagnosticGaps?.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Diagnostic Gaps</h4>
                  <ul className="space-y-1">
                    {insights.diagnosticFormulation.diagnosticGaps.map((gap: string, i: number) => (
                      <li key={i} className="text-xs flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Assessment */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.riskAssessment?.suicideRisk && (
                <div className={`p-4 rounded-lg border-2 ${riskColors[insights.riskAssessment.suicideRisk.level] || ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold text-lg">
                      Suicide Risk: {insights.riskAssessment.suicideRisk.level}
                    </span>
                    {insights.riskAssessment.suicideRisk.planNeeded && (
                      <Badge variant="destructive">Safety Plan Needed</Badge>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-destructive mb-1">Acute Factors</h5>
                      <ul className="space-y-1">
                        {insights.riskAssessment.suicideRisk.acuteFactors?.map((f: string, i: number) => (
                          <li key={i} className="text-xs">• {f}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Chronic Factors</h5>
                      <ul className="space-y-1">
                        {insights.riskAssessment.suicideRisk.chronicFactors?.map((f: string, i: number) => (
                          <li key={i} className="text-xs">• {f}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-success mb-1">Protective Factors</h5>
                      <ul className="space-y-1">
                        {insights.riskAssessment.suicideRisk.protectiveFactors?.map((f: string, i: number) => (
                          <li key={i} className="text-xs">• {f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-4">
                {insights.riskAssessment?.selfHarmRisk && (
                  <div className="p-3 border rounded-lg">
                    <h5 className="text-xs font-semibold mb-1">Self-Harm Risk</h5>
                    <p className="text-xs text-muted-foreground">{insights.riskAssessment.selfHarmRisk}</p>
                  </div>
                )}
                {insights.riskAssessment?.violenceRisk && (
                  <div className="p-3 border rounded-lg">
                    <h5 className="text-xs font-semibold mb-1">Violence Risk</h5>
                    <p className="text-xs text-muted-foreground">{insights.riskAssessment.violenceRisk}</p>
                  </div>
                )}
                {insights.riskAssessment?.neglectRisk && (
                  <div className="p-3 border rounded-lg">
                    <h5 className="text-xs font-semibold mb-1">Self-Neglect Risk</h5>
                    <p className="text-xs text-muted-foreground">{insights.riskAssessment.neglectRisk}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatment Plan */}
        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Treatment Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.treatmentRecommendations?.immediate?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Immediate Actions
                  </h4>
                  <div className="space-y-2">
                    {insights.treatmentRecommendations.immediate.map((action: any, i: number) => (
                      <div key={i} className="p-3 border rounded-lg flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{action.action}</p>
                          <p className="text-xs text-muted-foreground">{action.rationale}</p>
                        </div>
                        <Badge variant={action.urgency === 'high' ? 'destructive' : 'secondary'}>
                          {action.urgency}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.treatmentRecommendations?.medications?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Medication Recommendations
                  </h4>
                  <div className="space-y-2">
                    {insights.treatmentRecommendations.medications.map((med: any, i: number) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{med.name}</span>
                          <Badge variant="outline">{med.dose}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{med.rationale}</p>
                        <p className="text-xs text-primary mt-1">Monitor: {med.monitoring}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.treatmentRecommendations?.psychotherapy && (
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Psychotherapy</h4>
                  <p className="text-sm">
                    <span className="font-medium">{insights.treatmentRecommendations.psychotherapy.modality}</span>
                    {' - '}{insights.treatmentRecommendations.psychotherapy.frequency}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Focus: {insights.treatmentRecommendations.psychotherapy.focus}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow-up Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Follow-up Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.followUpPlan && (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Next Appointment</span>
                    <Badge variant={insights.followUpPlan.urgentFollowUp ? 'destructive' : 'secondary'}>
                      {insights.followUpPlan.nextAppointment}
                    </Badge>
                  </div>

                  {insights.followUpPlan.assessmentsToAdminister?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold mb-2">Assessments to Administer</h5>
                      <div className="flex flex-wrap gap-2">
                        {insights.followUpPlan.assessmentsToAdminister.map((a: string, i: number) => (
                          <Badge key={i} variant="outline">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.followUpPlan.questionsForNextSession?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold mb-2">Questions for Next Session</h5>
                      <ul className="space-y-1">
                        {insights.followUpPlan.questionsForNextSession.map((q: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-2">
                            <ArrowRight className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.followUpPlan.goalsForPatient?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold mb-2">Patient Goals/Homework</h5>
                      <ul className="space-y-1">
                        {insights.followUpPlan.goalsForPatient.map((g: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-2">
                            <Target className="h-3 w-3 text-success flex-shrink-0 mt-0.5" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clinician Notes */}
      {insights.clinicianNotes && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Clinician Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p><strong>Session Quality:</strong> {insights.clinicianNotes.sessionQuality}</p>
            {insights.clinicianNotes.limitationsOfAssessment?.length > 0 && (
              <p><strong>Limitations:</strong> {insights.clinicianNotes.limitationsOfAssessment.join(', ')}</p>
            )}
            {insights.clinicianNotes.supervisorFlags?.length > 0 && (
              <p className="text-destructive"><strong>Supervisor Review:</strong> {insights.clinicianNotes.supervisorFlags.join(', ')}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={generateInsights} className="w-full">
        <Sparkles className="h-4 w-4 mr-2" />
        Regenerate Analysis
      </Button>
    </div>
  );
};
