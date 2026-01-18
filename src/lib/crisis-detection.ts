// Crisis keyword detection for mental health monitoring
// These patterns are designed to identify potential crisis indicators in speech

export interface CrisisKeyword {
  pattern: RegExp;
  category: 'suicidal_ideation' | 'self_harm' | 'hopelessness' | 'severe_depression' | 'anxiety_crisis' | 'substance_crisis';
  severity: 'moderate' | 'high' | 'imminent';
  displayText: string;
}

export interface DetectedKeyword {
  keyword: string;
  category: CrisisKeyword['category'];
  severity: CrisisKeyword['severity'];
  startIndex: number;
  endIndex: number;
}

export interface CrisisDetectionResult {
  hasKeywords: boolean;
  detectedKeywords: DetectedKeyword[];
  highestSeverity: 'none' | 'moderate' | 'high' | 'imminent';
  categories: Set<CrisisKeyword['category']>;
}

// Crisis keyword patterns organized by category and severity
const CRISIS_KEYWORDS: CrisisKeyword[] = [
  // IMMINENT - Requires immediate attention
  { pattern: /\b(kill myself|end my life|suicide|suicidal)\b/gi, category: 'suicidal_ideation', severity: 'imminent', displayText: 'suicidal thoughts' },
  { pattern: /\b(want to die|wanna die|ready to die|planning to die)\b/gi, category: 'suicidal_ideation', severity: 'imminent', displayText: 'death wish' },
  { pattern: /\b(end it all|no point living|better off dead)\b/gi, category: 'suicidal_ideation', severity: 'imminent', displayText: 'suicidal ideation' },
  { pattern: /\b(cut myself|cutting|self.?harm|hurt myself)\b/gi, category: 'self_harm', severity: 'imminent', displayText: 'self-harm' },
  { pattern: /\b(overdose|take all my pills|swallow pills)\b/gi, category: 'suicidal_ideation', severity: 'imminent', displayText: 'overdose intent' },

  // HIGH - Serious concern requiring prompt attention
  { pattern: /\b(don'?t want to be here|can'?t go on|can'?t take it anymore)\b/gi, category: 'hopelessness', severity: 'high', displayText: 'severe distress' },
  { pattern: /\b(no reason to live|nothing to live for|life is pointless)\b/gi, category: 'hopelessness', severity: 'high', displayText: 'hopelessness' },
  { pattern: /\b(everyone would be better|burden to everyone|nobody cares)\b/gi, category: 'hopelessness', severity: 'high', displayText: 'feeling like a burden' },
  { pattern: /\b(give up|giving up|given up on life)\b/gi, category: 'hopelessness', severity: 'high', displayText: 'giving up' },
  { pattern: /\b(hate myself|worthless|useless|waste of space)\b/gi, category: 'severe_depression', severity: 'high', displayText: 'severe self-criticism' },
  { pattern: /\b(can'?t stop crying|crying all the time|constant tears)\b/gi, category: 'severe_depression', severity: 'high', displayText: 'persistent crying' },
  { pattern: /\b(panic attack|can'?t breathe|heart racing|going to die)\b/gi, category: 'anxiety_crisis', severity: 'high', displayText: 'panic symptoms' },
  { pattern: /\b(drinking too much|can'?t stop drinking|need drugs|using again)\b/gi, category: 'substance_crisis', severity: 'high', displayText: 'substance use' },

  // MODERATE - Notable indicators requiring monitoring
  { pattern: /\b(so depressed|deeply depressed|severely depressed)\b/gi, category: 'severe_depression', severity: 'moderate', displayText: 'depression' },
  { pattern: /\b(hopeless|no hope|lost hope|feeling hopeless)\b/gi, category: 'hopelessness', severity: 'moderate', displayText: 'hopelessness' },
  { pattern: /\b(can'?t sleep|insomnia|not sleeping|haven'?t slept)\b/gi, category: 'severe_depression', severity: 'moderate', displayText: 'sleep issues' },
  { pattern: /\b(not eating|can'?t eat|no appetite|stopped eating)\b/gi, category: 'severe_depression', severity: 'moderate', displayText: 'appetite issues' },
  { pattern: /\b(so anxious|anxiety is bad|really anxious|constant anxiety)\b/gi, category: 'anxiety_crisis', severity: 'moderate', displayText: 'anxiety' },
  { pattern: /\b(scared all the time|terrified|overwhelming fear)\b/gi, category: 'anxiety_crisis', severity: 'moderate', displayText: 'fear' },
  { pattern: /\b(empty inside|feel nothing|numb|disconnected)\b/gi, category: 'severe_depression', severity: 'moderate', displayText: 'emotional numbness' },
  { pattern: /\b(lonely|all alone|no one understands|isolated)\b/gi, category: 'severe_depression', severity: 'moderate', displayText: 'isolation' },
  { pattern: /\b(exhausted|no energy|can'?t get out of bed)\b/gi, category: 'severe_depression', severity: 'moderate', displayText: 'fatigue' },
  { pattern: /\b(failed|failure|can'?t do anything right)\b/gi, category: 'severe_depression', severity: 'moderate', displayText: 'failure feelings' },
];

/**
 * Detect crisis keywords in text
 */
export function detectCrisisKeywords(text: string): CrisisDetectionResult {
  const detectedKeywords: DetectedKeyword[] = [];
  const categories = new Set<CrisisKeyword['category']>();
  let highestSeverity: 'none' | 'moderate' | 'high' | 'imminent' = 'none';

  const severityOrder = { none: 0, moderate: 1, high: 2, imminent: 3 };

  for (const keyword of CRISIS_KEYWORDS) {
    let match;
    // Reset regex lastIndex for global patterns
    keyword.pattern.lastIndex = 0;

    while ((match = keyword.pattern.exec(text)) !== null) {
      detectedKeywords.push({
        keyword: match[0],
        category: keyword.category,
        severity: keyword.severity,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });

      categories.add(keyword.category);

      if (severityOrder[keyword.severity] > severityOrder[highestSeverity]) {
        highestSeverity = keyword.severity;
      }
    }
  }

  // Sort by position in text
  detectedKeywords.sort((a, b) => a.startIndex - b.startIndex);

  return {
    hasKeywords: detectedKeywords.length > 0,
    detectedKeywords,
    highestSeverity,
    categories,
  };
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: CrisisKeyword['category']): string {
  const names: Record<CrisisKeyword['category'], string> = {
    suicidal_ideation: 'Suicidal Ideation',
    self_harm: 'Self-Harm',
    hopelessness: 'Hopelessness',
    severe_depression: 'Severe Depression',
    anxiety_crisis: 'Anxiety Crisis',
    substance_crisis: 'Substance Use',
  };
  return names[category];
}

/**
 * Get recommended action based on severity
 */
export function getRecommendedAction(severity: 'moderate' | 'high' | 'imminent'): string {
  switch (severity) {
    case 'imminent':
      return 'Immediate crisis intervention required. Consider emergency services or crisis hotline.';
    case 'high':
      return 'Prompt clinical assessment needed. Evaluate safety and provide appropriate support.';
    case 'moderate':
      return 'Continue monitoring and explore concerns with empathy. Consider follow-up assessment.';
  }
}

/**
 * Highlight keywords in text by returning segments
 */
export interface TextSegment {
  text: string;
  isHighlighted: boolean;
  severity?: 'moderate' | 'high' | 'imminent';
  category?: CrisisKeyword['category'];
}

export function highlightKeywordsInText(text: string, detectedKeywords: DetectedKeyword[]): TextSegment[] {
  if (detectedKeywords.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  // Merge overlapping keywords
  const mergedKeywords = mergeOverlappingKeywords(detectedKeywords);

  for (const keyword of mergedKeywords) {
    // Add non-highlighted text before this keyword
    if (keyword.startIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, keyword.startIndex),
        isHighlighted: false,
      });
    }

    // Add highlighted keyword
    segments.push({
      text: text.slice(keyword.startIndex, keyword.endIndex),
      isHighlighted: true,
      severity: keyword.severity,
      category: keyword.category,
    });

    lastIndex = keyword.endIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isHighlighted: false,
    });
  }

  return segments;
}

function mergeOverlappingKeywords(keywords: DetectedKeyword[]): DetectedKeyword[] {
  if (keywords.length <= 1) return keywords;

  const sorted = [...keywords].sort((a, b) => a.startIndex - b.startIndex);
  const merged: DetectedKeyword[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.startIndex <= last.endIndex) {
      // Overlapping - merge and keep higher severity
      const severityOrder = { moderate: 1, high: 2, imminent: 3 };
      last.endIndex = Math.max(last.endIndex, current.endIndex);
      if (severityOrder[current.severity] > severityOrder[last.severity]) {
        last.severity = current.severity;
        last.category = current.category;
      }
    } else {
      merged.push(current);
    }
  }

  return merged;
}
