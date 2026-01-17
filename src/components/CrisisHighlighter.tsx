import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

// Crisis words and phrases commonly associated with mental health concerns
const CRISIS_PATTERNS = [
  // Suicidal ideation
  { pattern: /\b(kill myself|end my life|suicide|suicidal|want to die|better off dead|no reason to live|can't go on|don't want to live)\b/gi, category: 'Suicidal Ideation', severity: 'high' },
  // Self-harm
  { pattern: /\b(hurt myself|cut myself|self-harm|cutting|burning myself|punish myself)\b/gi, category: 'Self-Harm', severity: 'high' },
  // Homicidal
  { pattern: /\b(kill (him|her|them|someone)|hurt (him|her|them|someone)|murder|want them dead)\b/gi, category: 'Homicidal Ideation', severity: 'high' },
  // Hopelessness
  { pattern: /\b(hopeless|no hope|never get better|nothing will help|pointless|worthless|useless|burden)\b/gi, category: 'Hopelessness', severity: 'medium' },
  // Severe distress
  { pattern: /\b(can't take it|can't cope|overwhelmed|breaking down|falling apart|at my limit)\b/gi, category: 'Severe Distress', severity: 'medium' },
  // Substance abuse crisis
  { pattern: /\b(overdose|OD|relapse|binge drinking|blackout drunk|using again|can't stop)\b/gi, category: 'Substance Crisis', severity: 'high' },
  // Psychotic symptoms
  { pattern: /\b(voices (told|telling|tell) me|hearing voices|seeing things|paranoid|they're watching|they're following)\b/gi, category: 'Psychotic Symptoms', severity: 'medium' },
  // Trauma indicators
  { pattern: /\b(flashback|nightmare|panic attack|triggered|trauma|abuse|assault)\b/gi, category: 'Trauma', severity: 'medium' },
];

export interface CrisisWord {
  word: string;
  category: string;
  severity?: string;
  startIndex: number;
  endIndex: number;
}

interface CrisisHighlighterProps {
  text: string;
  timestamp?: number;
  onWordClick?: (word: CrisisWord, timestamp: number) => void;
  formatTime?: (timestamp: number) => string;
}

export const useCrisisDetection = (text: string): CrisisWord[] => {
  return useMemo(() => {
    const crisisWords: CrisisWord[] = [];
    
    for (const { pattern, category, severity } of CRISIS_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        crisisWords.push({
          word: match[0],
          category,
          severity,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }
    
    // Sort by position
    return crisisWords.sort((a, b) => a.startIndex - b.startIndex);
  }, [text]);
};

export const CrisisHighlighter = ({ 
  text, 
  timestamp = 0, 
  onWordClick,
  formatTime = (t) => `${Math.floor(t / 60000)}:${Math.floor((t % 60000) / 1000).toString().padStart(2, '0')}`
}: CrisisHighlighterProps) => {
  const crisisWords = useCrisisDetection(text);

  // Group by category for summary
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { count: number; severity: string }> = {};
    crisisWords.forEach(cw => {
      if (!counts[cw.category]) {
        counts[cw.category] = { count: 0, severity: cw.severity || 'medium' };
      }
      counts[cw.category].count++;
    });
    return counts;
  }, [crisisWords]);

  if (crisisWords.length === 0) {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed">{text}</div>;
  }

  // Build highlighted text
  const parts: JSX.Element[] = [];
  let lastIndex = 0;

  crisisWords.forEach((cw, i) => {
    // Add text before this crisis word
    if (cw.startIndex > lastIndex) {
      parts.push(<span key={`text-${i}`}>{text.slice(lastIndex, cw.startIndex)}</span>);
    }

    // Add highlighted crisis word
    const bgClass = cw.severity === 'high' 
      ? 'bg-destructive/20 text-destructive border-b-2 border-destructive/50' 
      : 'bg-warning/20 text-warning-foreground border-b-2 border-warning/50';
    
    parts.push(
      <span
        key={`crisis-${i}`}
        className={`${bgClass} font-medium px-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => onWordClick?.(cw, timestamp)}
        title={`${cw.category} - Click to review at ${formatTime(timestamp)}`}
      >
        {cw.word}
      </span>
    );

    lastIndex = cw.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return (
    <div className="space-y-4">
      {/* Summary of flagged content */}
      {crisisWords.length > 0 && (
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-semibold text-destructive">
              {crisisWords.length} Crisis Indicator{crisisWords.length !== 1 ? 's' : ''} Detected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryCounts).map(([category, { count, severity }]) => (
              <Badge 
                key={category}
                variant={severity === 'high' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {category}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Highlighted text */}
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {parts}
      </div>
    </div>
  );
};

// Extract all crisis phrases from transcript for summary
export const extractAllCrisisPhrases = (
  transcripts: Array<{ text: string; timestamp: number }>
): Array<{ phrase: CrisisWord; timestamp: number }> => {
  const allPhrases: Array<{ phrase: CrisisWord; timestamp: number }> = [];
  
  for (const t of transcripts) {
    for (const { pattern, category, severity } of CRISIS_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(t.text)) !== null) {
        allPhrases.push({ 
          phrase: {
            word: match[0],
            category,
            severity,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          }, 
          timestamp: t.timestamp 
        });
      }
    }
  }
  
  return allPhrases;
};
