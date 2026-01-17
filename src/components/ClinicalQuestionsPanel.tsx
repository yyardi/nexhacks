import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, Circle, MessageSquare, ClipboardList, 
  ChevronDown, ChevronUp, Sparkles, Lightbulb, Edit2 
} from 'lucide-react';
import { ClinicalQuestion } from '@/hooks/useTimelineAnalysis';
import type { OrchestratorResult, InterviewPhase } from '@/hooks/useInterviewOrchestrator';

interface ClinicalQuestionsPanelProps {
  questions: ClinicalQuestion[];
  onAnswerQuestion: (questionId: string, answer: string) => void;
  formatTime: (timestamp: number) => string;
  highlightedQuestionId?: string | null;
  orchestrator?: OrchestratorResult | null;
  isThinking?: boolean;
}

// Assessment tool colors and abbreviations
const toolConfig: Record<string, { color: string; abbrev: string; fullName: string }> = {
  'PHQ-9': { color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', abbrev: 'PHQ', fullName: 'Patient Health Questionnaire-9' },
  'PHQ-2': { color: 'bg-blue-400/20 text-blue-500 border-blue-400/30', abbrev: 'PHQ-2', fullName: 'Patient Health Questionnaire-2' },
  'GAD-7': { color: 'bg-purple-500/20 text-purple-600 border-purple-500/30', abbrev: 'GAD', fullName: 'Generalized Anxiety Disorder-7' },
  'C-SSRS': { color: 'bg-red-500/20 text-red-600 border-red-500/30', abbrev: 'SSRS', fullName: 'Columbia-Suicide Severity Rating Scale' },
  'MMSE': { color: 'bg-green-500/20 text-green-600 border-green-500/30', abbrev: 'MMSE', fullName: 'Mini-Mental State Examination' },
  'MoCA': { color: 'bg-green-400/20 text-green-500 border-green-400/30', abbrev: 'MoCA', fullName: 'Montreal Cognitive Assessment' },
  'AUDIT': { color: 'bg-orange-500/20 text-orange-600 border-orange-500/30', abbrev: 'AUDIT', fullName: 'Alcohol Use Disorders Identification Test' },
  'DAST': { color: 'bg-orange-400/20 text-orange-500 border-orange-400/30', abbrev: 'DAST', fullName: 'Drug Abuse Screening Test' },
  'PCL-5': { color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', abbrev: 'PCL', fullName: 'PTSD Checklist for DSM-5' },
  'MDQ': { color: 'bg-pink-500/20 text-pink-600 border-pink-500/30', abbrev: 'MDQ', fullName: 'Mood Disorder Questionnaire' },
  'YMRS': { color: 'bg-pink-400/20 text-pink-500 border-pink-400/30', abbrev: 'YMRS', fullName: 'Young Mania Rating Scale' },
  'Clinical Interview': { color: 'bg-gray-500/20 text-gray-600 border-gray-500/30', abbrev: 'CI', fullName: 'Clinical Interview' },
  'MSE': { color: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30', abbrev: 'MSE', fullName: 'Mental Status Examination' },
};

// Phase priority for sorting
const phasePriority: Record<InterviewPhase, number> = {
  'safety': 1,
  'chief_complaint': 2,
  'history_present_illness': 3,
  'mood_anxiety': 4,
  'substances': 5,
  'psychosis_mania': 6,
  'trauma': 7,
  'mse': 8,
  'opening': 9,
  'wrap_up': 10,
};

const categoryToPhase: Record<string, InterviewPhase> = {
  'Suicidality': 'safety',
  'Safety': 'safety',
  'Depression': 'mood_anxiety',
  'Anxiety': 'mood_anxiety',
  'Mood': 'mood_anxiety',
  'Substance': 'substances',
  'Alcohol': 'substances',
  'Drug': 'substances',
  'Psychosis': 'psychosis_mania',
  'Mania': 'psychosis_mania',
  'Trauma': 'trauma',
  'PTSD': 'trauma',
  'Cognition': 'mse',
  'Mental Status': 'mse',
  'Chief Complaint': 'chief_complaint',
  'History': 'history_present_illness',
  'General': 'opening',
};

const getToolConfig = (source: string) => {
  return toolConfig[source] || { 
    color: 'bg-muted text-muted-foreground border-border', 
    abbrev: source.slice(0, 4), 
    fullName: source 
  };
};

export const ClinicalQuestionsPanel = ({ 
  questions, 
  onAnswerQuestion,
  formatTime,
  highlightedQuestionId,
  orchestrator,
  isThinking
}: ClinicalQuestionsPanelProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  const handleSaveAnswer = (questionId: string) => {
    const answer = answerDraft[questionId];
    if (answer?.trim()) {
      onAnswerQuestion(questionId, answer.trim());
      setAnswerDraft(prev => ({ ...prev, [questionId]: '' }));
      setEditingId(null);
    }
  };

  // Sort questions by phase priority (urgent first) then by timestamp
  const sortedQuestions = useMemo(() => {
    const currentPhase = orchestrator?.phase || 'opening';
    
    return [...questions].sort((a, b) => {
      // Answered questions always go to bottom
      if (a.answered !== b.answered) return a.answered ? 1 : -1;
      
      // Get phase priority for each question
      const aPhase = categoryToPhase[a.category] || 'opening';
      const bPhase = categoryToPhase[b.category] || 'opening';
      
      // Safety always first
      if (aPhase === 'safety' && bPhase !== 'safety') return -1;
      if (bPhase === 'safety' && aPhase !== 'safety') return 1;
      
      // Questions matching current phase come next
      if (aPhase === currentPhase && bPhase !== currentPhase) return -1;
      if (bPhase === currentPhase && aPhase !== currentPhase) return 1;
      
      // Then by phase priority
      const aPriority = phasePriority[aPhase] || 10;
      const bPriority = phasePriority[bPhase] || 10;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Finally by timestamp (newer first for unanswered)
      return b.timestamp - a.timestamp;
    });
  }, [questions, orchestrator?.phase]);

  const unansweredQuestions = sortedQuestions.filter(q => !q.answered);
  const answeredQuestions = sortedQuestions.filter(q => q.answered);

  return (
    <div className="space-y-4">
      {/* AI Suggestions at top */}
      {orchestrator && orchestrator.nextPrompts.length > 0 && (
        <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-full bg-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm">Suggested Next Questions</h4>
            {orchestrator.phaseLabel && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {orchestrator.phaseLabel}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            {orchestrator.nextPrompts.map((prompt, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-lg bg-background border border-border/60 hover:border-primary/40 transition-colors"
              >
                <p className="text-sm font-medium">{prompt.text}</p>
                {prompt.rationale && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    {prompt.rationale}
                  </p>
                )}
              </div>
            ))}
          </div>
          
          {isThinking && (
            <p className="text-xs text-muted-foreground mt-2 animate-pulse">
              Updating suggestions...
            </p>
          )}
        </div>
      )}

      {/* Unanswered Questions */}
      {unansweredQuestions.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <ClipboardList className="h-4 w-4" />
            Questions to Ask
            <Badge variant="secondary" className="text-xs">{unansweredQuestions.length}</Badge>
          </h4>
          
          <div className="space-y-2">
            {unansweredQuestions.map((question) => {
              const config = getToolConfig(question.source);
              const isHighlighted = question.id === highlightedQuestionId;
              
              return (
                <div 
                  key={question.id} 
                  className={
                    "p-3 rounded-lg border transition-all " +
                    (isHighlighted
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30 animate-pulse"
                      : "bg-muted/30 border-border/50 hover:border-primary/30")
                  }
                >
                  <div className="flex items-start gap-3">
                    <Circle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{question.question}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <Badge variant="outline" className={`${config.color} text-xs`}>
                          {question.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(question.timestamp)}
                        </span>
                        {question.asked && (
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                            Asked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Answered Questions */}
      {answeredQuestions.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-muted-foreground text-sm">
            <MessageSquare className="h-4 w-4" />
            Completed
            <Badge variant="outline" className="text-xs">{answeredQuestions.length}</Badge>
          </h4>
          
          <div className="space-y-2">
            {answeredQuestions.map((question) => {
              const config = getToolConfig(question.source);
              const isEditing = editingId === question.id;
              
              return (
                <div 
                  key={question.id} 
                  className="p-3 bg-success/5 border border-success/20 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="outline" className={`${config.color} text-xs`}>
                              {question.source}
                            </Badge>
                            {question.answerMethod === 'auto' && (
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                Auto-filled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">{question.question}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            if (isEditing) {
                              setEditingId(null);
                            } else {
                              setEditingId(question.id);
                              setAnswerDraft(prev => ({ ...prev, [question.id]: question.answer || '' }));
                            }
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={answerDraft[question.id] || ''}
                            onChange={(e) => setAnswerDraft(prev => ({ 
                              ...prev, 
                              [question.id]: e.target.value 
                            }))}
                            className="min-h-[60px] text-sm"
                          />
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveAnswer(question.id)}
                              disabled={!answerDraft[question.id]?.trim()}
                            >
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-background rounded border text-sm">
                          {question.answer}
                        </div>
                      )}
                      
                      {question.answerEvidence?.length > 0 && !isEditing && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Evidence:</span> {question.answerEvidence[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {questions.length === 0 && !orchestrator?.nextPrompts?.length && (
        <p className="text-center text-muted-foreground py-8 text-sm">
          Start speaking to get AI-suggested questions
        </p>
      )}
    </div>
  );
};