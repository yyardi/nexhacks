import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { TimestampedTranscript } from '@/hooks/useTimelineAnalysis';

// Crisis patterns for detection
const CRISIS_PATTERNS = [
  { pattern: /\b(kill myself|end my life|suicide|suicidal|want to die|better off dead|no reason to live|can't go on|don't want to live)\b/gi, category: 'Suicidal', severity: 'high' },
  { pattern: /\b(hurt myself|cut myself|self-harm|cutting|burning myself)\b/gi, category: 'Self-Harm', severity: 'high' },
  { pattern: /\b(kill (him|her|them|someone)|hurt (him|her|them|someone))\b/gi, category: 'Homicidal', severity: 'high' },
  { pattern: /\b(hopeless|no hope|never get better|worthless|useless|burden)\b/gi, category: 'Hopelessness', severity: 'medium' },
  { pattern: /\b(can't take it|can't cope|overwhelmed|breaking down|falling apart)\b/gi, category: 'Distress', severity: 'medium' },
  { pattern: /\b(overdose|relapse|binge drinking|blackout|using again)\b/gi, category: 'Substance', severity: 'high' },
  { pattern: /\b(voices (told|telling)|hearing voices|seeing things|paranoid)\b/gi, category: 'Psychotic', severity: 'medium' },
];

interface TranscriptWithCrisisProps {
  transcripts: TimestampedTranscript[];
  formatTime: (timestamp: number) => string;
  searchQuery?: string;
  onCrisisClick?: (timestamp: number, category: string) => void;
}

export const TranscriptWithCrisis = ({ 
  transcripts, 
  formatTime, 
  searchQuery = '',
  onCrisisClick 
}: TranscriptWithCrisisProps) => {
  // Detect crisis words in each transcript - ONLY for patient speaker
  const transcriptsWithCrisis = useMemo(() => {
    return transcripts.map(t => {
      const crisisMatches: Array<{ word: string; category: string; severity: string }> = [];
      
      // Only detect crisis words for patient utterances, not clinician
      if (t.speaker === 'patient' || !t.speaker) {
        CRISIS_PATTERNS.forEach(({ pattern, category, severity }) => {
          const matches = t.text.match(pattern);
          if (matches) {
            matches.forEach(word => {
              crisisMatches.push({ word, category, severity });
            });
          }
        });
      }

      return { ...t, crisisMatches };
    });
  }, [transcripts]);

  // Filter by search query
  const filteredTranscripts = useMemo(() => {
    if (!searchQuery) return transcriptsWithCrisis;
    const query = searchQuery.toLowerCase();
    return transcriptsWithCrisis.filter(t => 
      t.text.toLowerCase().includes(query)
    );
  }, [transcriptsWithCrisis, searchQuery]);

  // Count total crisis indicators
  const totalCrisis = transcriptsWithCrisis.reduce((sum, t) => sum + t.crisisMatches.length, 0);

  // Highlight crisis words in text
  const highlightCrisisWords = (text: string, crisisMatches: Array<{ word: string; category: string; severity: string }>, timestamp: number) => {
    if (crisisMatches.length === 0) return text;

    let lastIndex = 0;
    const parts: JSX.Element[] = [];
    
    // Create a combined regex from all matched words
    const escapedWords = crisisMatches.map(m => m.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const combinedPattern = new RegExp(`(${escapedWords.join('|')})`, 'gi');
    
    let match;
    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
      }
      
      // Find the matching crisis info
      const crisisInfo = crisisMatches.find(m => 
        m.word.toLowerCase() === match[0].toLowerCase()
      );
      const severity = crisisInfo?.severity || 'medium';
      const category = crisisInfo?.category || 'Unknown';
      
      parts.push(
        <span
          key={`crisis-${match.index}`}
          className={`px-0.5 rounded cursor-pointer font-medium ${
            severity === 'high' 
              ? 'bg-destructive/20 text-destructive' 
              : 'bg-warning/20 text-warning-foreground'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onCrisisClick?.(timestamp, category);
          }}
          title={`${category} indicator - Click to flag`}
        >
          {match[0]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
    }
    
    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-3">
      {/* Crisis Summary Banner */}
      {totalCrisis > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            {totalCrisis} crisis indicator{totalCrisis !== 1 ? 's' : ''} detected
          </span>
          <div className="flex gap-1 ml-2">
            {[...new Set(transcriptsWithCrisis.flatMap(t => t.crisisMatches.map(m => m.category)))].map(cat => (
              <Badge key={cat} variant="outline" className="text-xs bg-destructive/5">
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Transcripts */}
      {filteredTranscripts.map((t) => (
        <div 
          key={t.id} 
          className={`p-3 rounded-lg shadow-sm border transition-colors ${
            t.crisisMatches.length > 0 
              ? 'bg-destructive/5 border-destructive/20' 
              : 'bg-background border-border'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                t.speaker === 'clinician' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-success/10 text-success'
              }`}>
                {t.speaker === 'clinician' ? '🩺 Clinician' : '👤 Patient'}
              </span>
              <span className="text-xs text-muted-foreground">{formatTime(t.timestamp)}</span>
            </div>
            {t.crisisMatches.length > 0 && (
              <div className="flex gap-1">
                {[...new Set(t.crisisMatches.map(m => m.category))].map(cat => (
                  <Badge 
                    key={cat} 
                    variant="outline" 
                    className="text-xs bg-destructive/10 text-destructive border-destructive/30"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <p className="text-sm leading-relaxed">
            {highlightCrisisWords(t.text, t.crisisMatches, t.timestamp)}
          </p>
        </div>
      ))}

      {filteredTranscripts.length === 0 && (
        <p className="text-center text-muted-foreground py-4">
          {searchQuery ? 'No matching transcripts' : 'No transcripts yet'}
        </p>
      )}
    </div>
  );
};