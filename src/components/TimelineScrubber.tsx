import { useCallback, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Clock } from 'lucide-react';
import { BiometricSnapshot, AnalysisSnapshot } from '@/hooks/useTimelineAnalysis';

interface TimelineScrubberProps {
  sessionStartTime: number;
  currentTime: number | null;
  biometrics: BiometricSnapshot[];
  analysisSnapshots: AnalysisSnapshot[];
  onSeek: (timestamp: number) => void;
  onReset: () => void;
  formatTime: (timestamp: number) => string;
}

export const TimelineScrubber = ({
  sessionStartTime,
  currentTime,
  biometrics,
  analysisSnapshots,
  onSeek,
  onReset,
  formatTime
}: TimelineScrubberProps) => {
  const now = Date.now();
  const sessionDuration = now - sessionStartTime;
  
  // Calculate slider value (0-100)
  const sliderValue = useMemo(() => {
    if (currentTime === null) return 100; // Live
    const elapsed = currentTime - sessionStartTime;
    return Math.min(100, Math.max(0, (elapsed / sessionDuration) * 100));
  }, [currentTime, sessionStartTime, sessionDuration]);

  // Handle slider change
  const handleSliderChange = useCallback((value: number[]) => {
    const percentage = value[0];
    if (percentage >= 99) {
      onReset(); // Go to live
    } else {
      const targetTime = sessionStartTime + (sessionDuration * percentage / 100);
      onSeek(targetTime);
    }
  }, [sessionStartTime, sessionDuration, onSeek, onReset]);

  // Get markers for analysis snapshots
  const analysisMarkers = useMemo(() => {
    return analysisSnapshots.map(snapshot => ({
      position: ((snapshot.timestamp - sessionStartTime) / sessionDuration) * 100,
      timestamp: snapshot.timestamp
    }));
  }, [analysisSnapshots, sessionStartTime, sessionDuration]);

  // Format duration - handle edge cases
  const formatDuration = (ms: number) => {
    if (!isFinite(ms) || isNaN(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (sessionDuration < 5000) {
    return null; // Don't show if session is too short
  }

  return (
    <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Session Timeline</span>
        </div>
        <div className="flex items-center gap-2">
          {currentTime !== null && (
            <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
              <Play className="h-3 w-3" />
              Live
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {currentTime !== null 
              ? formatTime(currentTime)
              : formatDuration(sessionDuration)
            }
            {currentTime === null && ' (Live)'}
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Analysis markers */}
        <div className="absolute inset-x-0 top-0 h-full pointer-events-none">
          {analysisMarkers.map((marker, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-full bg-primary/50"
              style={{ left: `${marker.position}%` }}
              title={`Analysis at ${formatTime(marker.timestamp)}`}
            />
          ))}
        </div>

        <Slider
          value={[sliderValue]}
          onValueChange={handleSliderChange}
          max={100}
          step={0.1}
          className="cursor-pointer"
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0:00</span>
        <span>{formatDuration(sessionDuration)}</span>
      </div>

      {/* Mini biometrics graph + emotion strip */}
      {biometrics.length > 10 && (
        <div className="space-y-2">
          <div className="h-12 bg-background rounded border overflow-hidden">
            <svg className="w-full h-full" preserveAspectRatio="none">
              {/* Heart rate line */}
              <polyline
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                points={biometrics
                  .filter(b => b.pulseEstimate)
                  .map((b) => {
                    const x = ((b.timestamp - sessionStartTime) / sessionDuration) * 100;
                    const y = 100 - (((b.pulseEstimate || 70) - 40) / 140) * 100;
                    return `${x}%,${Math.max(5, Math.min(95, y))}%`;
                  })
                  .join(' ')}
              />

              {/* Eye contact line */}
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                points={biometrics
                  .map((b) => {
                    const x = ((b.timestamp - sessionStartTime) / sessionDuration) * 100;
                    const y = 100 - b.eyeContact;
                    return `${x}%,${Math.max(5, Math.min(95, y))}%`;
                  })
                  .join(' ')}
              />
            </svg>
          </div>

          {/* Emotion timeline (dominant emotion per snapshot) */}
          <div className="h-2 rounded border bg-background overflow-hidden flex">
            {biometrics.map((b, i) => {
              const nextTs = biometrics[i + 1]?.timestamp ?? (sessionStartTime + sessionDuration);
              const widthPct = ((nextTs - b.timestamp) / sessionDuration) * 100;

              const emotion = (b.dominantEmotion || 'neutral').toLowerCase();
              const emotionClass =
                emotion === 'happy'
                  ? 'bg-success/60'
                  : emotion === 'sad'
                    ? 'bg-primary/50'
                    : emotion === 'angry'
                      ? 'bg-destructive/60'
                      : emotion === 'fearful'
                        ? 'bg-warning/60'
                        : emotion === 'surprised'
                          ? 'bg-accent/60'
                          : emotion === 'disgusted'
                            ? 'bg-muted-foreground/40'
                            : 'bg-muted/60';

              return (
                <div
                  key={b.timestamp}
                  className={emotionClass}
                  style={{ width: `${Math.max(0.25, widthPct)}%` }}
                  title={`${emotion} @ ${formatTime(b.timestamp)}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
