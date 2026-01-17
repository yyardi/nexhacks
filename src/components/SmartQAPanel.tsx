import { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, Circle, MessageSquare, Sparkles, 
  ChevronDown, ChevronUp, Edit2, Mic, Volume2
} from 'lucide-react';
import { ClinicalQuestion } from '@/hooks/useTimelineAnalysis';
import type { OrchestratorResult } from '@/hooks/useInterviewOrchestrator';

interface SmartQAPanelProps {
  questions: ClinicalQuestion[];
  onAnswerQuestion: (questionId: string, answer: string) => void;
  onMarkAsked: (questionId: string) => void;
  formatTime: (timestamp: number) => string;
  highlightedQuestionId?: string | null;
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

export const SmartQAPanel = ({ 
  questions, 
  onAnswerQuestion,
  onMarkAsked,
  formatTime,
  highlightedQuestionId,
  orchestrator,
  isThinking,
  isRecording
}: SmartQAPanelProps) => {
  const [showQueue, setShowQueue] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});
  const lastAutoFilledRef = useRef<string | null>(null);
  const [showAutoFillAnimation, setShowAutoFillAnimation] = useState(false);

  // Separate questions by status
  const { priorityQuestion, queuedQuestions, answeredQuestions, askedQuestions } = useMemo(() => {
    const unanswered = questions.filter(q => !q.answered);
    const answered = questions.filter(q => q.answered);
    
    // Safety questions ALWAYS first, then by timestamp
    const sorted = [...unanswered].sort((a, b) => {
      const aIsSafety = a.category === 'Suicidality' || a.category === 'Safety' || a.source === 'C-SSRS';
      const bIsSafety = b.category === 'Suicidality' || b.category === 'Safety' || b.source === 'C-SSRS';
      if (aIsSafety && !bIsSafety) return -1;
      if (bIsSafety && !aIsSafety) return 1;
      
      // Asked questions should come first (waiting for answer)
      if (a.asked && !b.asked) return -1;
      if (b.asked && !a.asked) return 1;
      
      return a.timestamp - b.timestamp;
    });

    // Split into asked (waiting for answer) and not-asked
    const asked = sorted.filter(q => q.asked);
    const notAsked = sorted.filter(q => !q.asked);

    return {
      priorityQuestion: asked[0] || notAsked[0] || null,
      askedQuestions: asked,
      queuedQuestions: notAsked.slice(asked[0] ? 0 : 1), // Exclude priority if it's from notAsked
      answeredQuestions: answered.sort((a, b) => (b.answeredAt || 0) - (a.answeredAt || 0)),
    };
  }, [questions]);

  // Get the ONE suggested question from orchestrator
  const suggestedQuestion = useMemo(() => {
    if (!orchestrator?.nextPrompts?.length) return null;
    return orchestrator.nextPrompts[0];
  }, [orchestrator]);

  // Auto-fill animation effect
  useEffect(() => {
    if (highlightedQuestionId && highlightedQuestionId !== lastAutoFilledRef.current) {
      lastAutoFilledRef.current = highlightedQuestionId;
      setShowAutoFillAnimation(true);
      const timer = setTimeout(() => setShowAutoFillAnimation(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedQuestionId]);

  const handleSaveAnswer = (questionId: string) => {
    const answer = answerDraft[questionId];
    if (answer?.trim()) {
      onAnswerQuestion(questionId, answer.trim());
      setAnswerDraft(prev => ({ ...prev, [questionId]: '' }));
      setEditingId(null);
    }
  };

  const handleAskQuestion = (questionId: string) => {
    onMarkAsked(questionId);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Priority Question - Always visible at top */}
      <div className="flex-shrink-0">
        {suggestedQuestion && !priorityQuestion?.asked ? (
          // AI Suggestion (show when no question is actively waiting for answer)
          <div className="p-4 rounded-lg border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/20 flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary">Ask Next</span>
                  {orchestrator?.phaseLabel && (
                    <Badge variant="secondary" className="text-[10px]">
                      {orchestrator.phaseLabel}
                    </Badge>
                  )}
                  {isThinking && (
                    <span className="text-[10px] text-muted-foreground animate-pulse">updating...</span>
                  )}
                </div>
                <p className="text-sm font-medium leading-relaxed">{suggestedQuestion.text}</p>
                {suggestedQuestion.rationale && (
                  <p className="text-xs text-muted-foreground mt-1.5 italic">
                    {suggestedQuestion.rationale}
                  </p>
                )}
              </div>
              {isRecording && (
                <div className="flex-shrink-0">
                  <div className="p-1.5 rounded-full bg-primary/20 animate-pulse">
                    <Volume2 className="h-3 w-3 text-primary" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : priorityQuestion ? (
          // Active Question (asked and waiting for answer)
          <div className={`p-4 rounded-lg border-2 transition-all ${
            priorityQuestion.asked 
              ? 'border-warning bg-warning/5' 
              : 'border-primary/30 bg-muted/30'
          } ${highlightedQuestionId === priorityQuestion.id ? 'ring-2 ring-success animate-pulse' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full flex-shrink-0 ${
                priorityQuestion.asked ? 'bg-warning/20' : 'bg-primary/10'
              }`}>
                {priorityQuestion.asked ? (
                  <Mic className="h-4 w-4 text-warning" />
                ) : (
                  <Circle className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${getToolColor(priorityQuestion.source)}`}>
                    {priorityQuestion.source}
                  </Badge>
                  {priorityQuestion.asked && (
                    <Badge variant="outline" className="text-[10px] border-warning/50 text-warning bg-warning/10">
                      Waiting for answer...
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium leading-relaxed">{priorityQuestion.question}</p>
                
                {!priorityQuestion.asked && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="mt-2 h-7 text-xs"
                    onClick={() => handleAskQuestion(priorityQuestion.id)}
                  >
                    <Mic className="h-3 w-3 mr-1" />
                    Mark as Asked
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Empty state
          <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20 text-center">
            <p className="text-sm text-muted-foreground">
              {isRecording ? 'Listening for clinical context...' : 'Start recording to get AI-suggested questions'}
            </p>
          </div>
        )}
      </div>

      {/* Queue Toggle */}
      {queuedQuestions.length > 0 && (
        <button
          onClick={() => setShowQueue(!showQueue)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {showQueue ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span>{queuedQuestions.length} more question{queuedQuestions.length !== 1 ? 's' : ''} in queue</span>
        </button>
      )}

      {/* Question Queue (collapsed by default) */}
      {showQueue && queuedQuestions.length > 0 && (
        <div className="space-y-2 pl-2 border-l-2 border-muted">
          {queuedQuestions.slice(0, 5).map((q) => (
            <div 
              key={q.id} 
              className="p-2 rounded bg-muted/20 border border-border/50 text-sm"
            >
              <div className="flex items-start gap-2">
                <Circle className="h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs line-clamp-2">{q.question}</p>
                  <Badge variant="outline" className={`text-[8px] mt-1 ${getToolColor(q.source)}`}>
                    {q.source}
                  </Badge>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={() => handleAskQuestion(q.id)}
                >
                  <Mic className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {queuedQuestions.length > 5 && (
            <p className="text-[10px] text-muted-foreground pl-5">
              +{queuedQuestions.length - 5} more
            </p>
          )}
        </div>
      )}

      {/* Answered Questions */}
      {answeredQuestions.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2 sticky top-0 bg-card py-1">
            <CheckCircle className="h-3 w-3 text-success" />
            Answered ({answeredQuestions.length})
          </h4>
          
          {answeredQuestions.map((q) => {
            const isEditing = editingId === q.id;
            const wasJustAutoFilled = highlightedQuestionId === q.id && showAutoFillAnimation;
            
            return (
              <div 
                key={q.id} 
                className={`p-3 rounded-lg border transition-all ${
                  wasJustAutoFilled 
                    ? 'border-success bg-success/10 ring-2 ring-success/50 animate-pulse' 
                    : 'border-success/30 bg-success/5'
                }`}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${getToolColor(q.source)}`}>
                        {q.source}
                      </Badge>
                      {q.answerMethod === 'auto' && (
                        <Badge variant="secondary" className="text-[10px] bg-success/20 text-success border-success/30">
                          {wasJustAutoFilled ? '✨ Auto-filled!' : 'Auto'}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs font-medium">{q.question}</p>
                    
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={answerDraft[q.id] || ''}
                          onChange={(e) => setAnswerDraft(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="min-h-[50px] text-xs"
                          placeholder="Enter answer..."
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-6 text-xs" onClick={() => handleSaveAnswer(q.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="p-2 bg-background rounded text-xs cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => {
                          setEditingId(q.id);
                          setAnswerDraft(prev => ({ ...prev, [q.id]: q.answer || '' }));
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex-1">{q.answer}</span>
                          <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                        </div>
                      </div>
                    )}
                    
                    {q.answerEvidence?.length > 0 && !isEditing && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        Evidence: "{q.answerEvidence[0]}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {questions.length === 0 && !suggestedQuestion && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Questions will appear as the conversation progresses</p>
          </div>
        </div>
      )}
    </div>
  );
};
