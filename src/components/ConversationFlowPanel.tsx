import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, MessageSquare, User, Stethoscope, ArrowRight, Sparkles } from 'lucide-react';
import { ClinicalQuestion, TimestampedTranscript } from '@/hooks/useTimelineAnalysis';
import type { OrchestratorResult } from '@/hooks/useInterviewOrchestrator';

interface ConversationFlowPanelProps {
  transcripts: TimestampedTranscript[];
  questions: ClinicalQuestion[];
  formatTime: (timestamp: number) => string;
  orchestrator?: OrchestratorResult | null;
  isThinking?: boolean;
  isRecording?: boolean;
}

// Assessment tool colors
const toolColors: Record<string, string> = {
  'PHQ-9': 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  'PHQ-2': 'bg-blue-400/20 text-blue-500 border-blue-400/30',
  'GAD-7': 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  'C-SSRS': 'bg-red-500/20 text-red-600 border-red-500/30',
  'Clinical Interview': 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};

const getToolColor = (source: string) =>
  toolColors[source] || 'bg-muted text-muted-foreground border-border';

interface QAExchange {
  clinicianTurn: TimestampedTranscript;
  patientTurn?: TimestampedTranscript;
  matchedQuestion?: ClinicalQuestion;
}

export const ConversationFlowPanel = ({
  transcripts,
  questions,
  formatTime,
  orchestrator,
  isThinking,
  isRecording,
}: ConversationFlowPanelProps) => {
  // Build Q&A exchanges from transcript automatically
  const exchanges = useMemo<QAExchange[]>(() => {
    const result: QAExchange[] = [];
    
    for (let i = 0; i < transcripts.length; i++) {
      const t = transcripts[i];
      if (t.speaker === 'clinician') {
        const exchange: QAExchange = { clinicianTurn: t };
        
        // Look for patient response(s) following this clinician turn
        if (i + 1 < transcripts.length && transcripts[i + 1].speaker === 'patient') {
          exchange.patientTurn = transcripts[i + 1];
        }
        
        // Try to find a matching question from the questions list
        const matched = questions.find(q => 
          q.asked && 
          q.askedAt && 
          Math.abs(q.askedAt - t.timestamp) < 5000 // within 5 seconds
        );
        if (matched) {
          exchange.matchedQuestion = matched;
        }
        
        result.push(exchange);
      }
    }
    
    return result.slice(-10); // Last 10 exchanges
  }, [transcripts, questions]);

  // Count answered questions
  const answeredCount = questions.filter(q => q.answered).length;
  const askedCount = questions.filter(q => q.asked).length;
  const totalCount = questions.length;

  // Get next suggested question
  const suggestedQuestion = orchestrator?.nextPrompts?.[0];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Phase & Progress Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          {orchestrator?.phaseLabel && (
            <Badge variant="outline" className="bg-primary/10 border-primary/30">
              {orchestrator.phaseLabel}
            </Badge>
          )}
          {isThinking && (
            <span className="text-[10px] text-muted-foreground animate-pulse">analyzing...</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Circle className="h-3 w-3 text-warning" />
            {askedCount - answeredCount} pending
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-success" />
            {answeredCount}/{totalCount} answered
          </span>
        </div>
      </div>

      {/* Suggested Next Question */}
      {suggestedQuestion && isRecording && (
        <Card className="flex-shrink-0 p-4 border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/20 flex-shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-medium text-primary">Suggested Next</span>
              <p className="text-sm font-medium mt-1">{suggestedQuestion.text}</p>
              {suggestedQuestion.rationale && (
                <p className="text-xs text-muted-foreground mt-1 italic">{suggestedQuestion.rationale}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Conversation Flow */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground sticky top-0 bg-card py-1 flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Conversation Flow ({exchanges.length} exchanges)
        </h4>

        {exchanges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {isRecording ? 'Listening for conversation...' : 'Start recording to track exchanges'}
            </p>
          </div>
        ) : (
          exchanges.map((exchange, i) => (
            <Card key={exchange.clinicianTurn.id} className="p-3 space-y-2">
              {/* Clinician Question */}
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-full bg-primary/10 flex-shrink-0">
                  <Stethoscope className="h-3 w-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-primary">Clinician</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(exchange.clinicianTurn.timestamp)}</span>
                    {exchange.matchedQuestion && (
                      <Badge variant="outline" className={`text-[8px] ${getToolColor(exchange.matchedQuestion.source)}`}>
                        {exchange.matchedQuestion.source}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{exchange.clinicianTurn.text}</p>
                </div>
              </div>

              {/* Patient Response */}
              {exchange.patientTurn ? (
                <div className="flex items-start gap-2 ml-4 pl-3 border-l-2 border-success/30">
                  <div className="p-1.5 rounded-full bg-success/10 flex-shrink-0">
                    <User className="h-3 w-3 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium text-success">Patient</span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(exchange.patientTurn.timestamp)}</span>
                      {exchange.matchedQuestion?.answered && (
                        <Badge variant="secondary" className="text-[8px] bg-success/20 text-success border-success/30">
                          ✓ Recorded
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{exchange.patientTurn.text}</p>
                  </div>
                </div>
              ) : (
                <div className="ml-4 pl-3 border-l-2 border-warning/30 py-2">
                  <span className="text-xs text-warning animate-pulse">⏳ Awaiting response...</span>
                </div>
              )}

              {/* Link to Formal Q */}
              {exchange.matchedQuestion && (
                <div className="flex items-center gap-2 ml-4 mt-1 p-2 bg-muted/30 rounded text-xs">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Maps to:</span>
                  <span className="font-medium truncate">{exchange.matchedQuestion.question}</span>
                  {exchange.matchedQuestion.answered && (
                    <CheckCircle className="h-3 w-3 text-success flex-shrink-0" />
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Answered Questions Summary (collapsed) */}
      {answeredCount > 0 && (
        <div className="flex-shrink-0 p-3 bg-success/5 border border-success/20 rounded-lg">
          <h4 className="text-xs font-medium text-success flex items-center gap-2 mb-2">
            <CheckCircle className="h-3 w-3" />
            Auto-Captured Answers ({answeredCount})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {questions.filter(q => q.answered).slice(-5).map(q => (
              <div key={q.id} className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className={`text-[8px] flex-shrink-0 ${getToolColor(q.source)}`}>
                  {q.source}
                </Badge>
                <span className="text-muted-foreground line-clamp-1">{q.question}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
