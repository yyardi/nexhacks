import { useMemo } from 'react';
import { BiometricSnapshot } from '@/hooks/useTimelineAnalysis';

interface EmotionTimelineStripsProps {
  biometrics: BiometricSnapshot[];
  sessionStartTime: number;
  duration: number; // in seconds
  formatTime: (timestamp: number) => string;
  onSeek?: (timestamp: number) => void;
}

const EMOTIONS = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted', 'neutral'] as const;

const EMOTION_COLORS: Record<string, string> = {
  happy: 'bg-success',
  sad: 'bg-blue-500',
  angry: 'bg-destructive',
  fearful: 'bg-warning',
  surprised: 'bg-accent',
  disgusted: 'bg-purple-500',
  neutral: 'bg-muted-foreground/30',
};

const EMOTION_LABELS: Record<string, string> = {
  happy: '😊 Happy',
  sad: '😢 Sad',
  angry: '😠 Angry',
  fearful: '😨 Fearful',
  surprised: '😲 Surprised',
  disgusted: '🤢 Disgusted',
  neutral: '😐 Neutral',
};

interface EmotionSegment {
  startPct: number;
  widthPct: number;
  startTime: number;
  endTime: number;
}

export const EmotionTimelineStrips = ({
  biometrics,
  sessionStartTime,
  duration,
  formatTime,
  onSeek,
}: EmotionTimelineStripsProps) => {
  const durationMs = duration * 1000;

  // Build segments for each emotion
  const emotionSegments = useMemo(() => {
    const segments: Record<string, EmotionSegment[]> = {};
    EMOTIONS.forEach(e => { segments[e] = []; });

    if (biometrics.length === 0 || durationMs <= 0) return segments;

    // Group consecutive snapshots by dominant emotion
    let currentEmotion: string | null = null;
    let segmentStart: number | null = null;

    biometrics.forEach((b, i) => {
      const emotion = (b.dominantEmotion || 'neutral').toLowerCase();
      const nextB = biometrics[i + 1];

      if (emotion !== currentEmotion) {
        // Close previous segment
        if (currentEmotion && segmentStart !== null) {
          const endTs = b.timestamp;
          const startPct = ((segmentStart - sessionStartTime) / durationMs) * 100;
          const widthPct = ((endTs - segmentStart) / durationMs) * 100;
          if (segments[currentEmotion]) {
            segments[currentEmotion].push({
              startPct: Math.max(0, startPct),
              widthPct: Math.max(0.5, Math.min(100 - startPct, widthPct)),
              startTime: segmentStart,
              endTime: endTs,
            });
          }
        }
        // Start new segment
        currentEmotion = emotion;
        segmentStart = b.timestamp;
      }

      // Close final segment
      if (!nextB && currentEmotion && segmentStart !== null) {
        const endTs = sessionStartTime + durationMs;
        const startPct = ((segmentStart - sessionStartTime) / durationMs) * 100;
        const widthPct = ((endTs - segmentStart) / durationMs) * 100;
        if (segments[currentEmotion]) {
          segments[currentEmotion].push({
            startPct: Math.max(0, startPct),
            widthPct: Math.max(0.5, Math.min(100 - startPct, widthPct)),
            startTime: segmentStart,
            endTime: endTs,
          });
        }
      }
    });

    return segments;
  }, [biometrics, sessionStartTime, durationMs]);

  // Check if any emotion has segments
  const hasAnySegments = EMOTIONS.some(e => emotionSegments[e].length > 0);

  if (!hasAnySegments) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No emotion data recorded
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">Emotion Timeline</h4>
      {EMOTIONS.map(emotion => {
        const segs = emotionSegments[emotion];
        if (segs.length === 0) return null;

        return (
          <div key={emotion} className="flex items-center gap-2">
            <span className="text-xs w-24 truncate" title={EMOTION_LABELS[emotion]}>
              {EMOTION_LABELS[emotion]}
            </span>
            <div className="flex-1 h-3 bg-muted/30 rounded relative overflow-hidden">
              {segs.map((seg, i) => (
                <div
                  key={i}
                  className={`absolute h-full ${EMOTION_COLORS[emotion]} opacity-80 hover:opacity-100 cursor-pointer transition-opacity rounded-sm`}
                  style={{
                    left: `${seg.startPct}%`,
                    width: `${seg.widthPct}%`,
                  }}
                  title={`${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}`}
                  onClick={() => onSeek?.(seg.startTime)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
