import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Heart, Eye, Wind, Brain, Activity, AlertCircle } from 'lucide-react';
import { BiometricSnapshot } from '@/hooks/useTimelineAnalysis';

interface BiometricsLivePanelProps {
  eyeContact: number;
  gazeStability: number;
  breathingRate: number;
  blinkRate: number;
  headPose: { pitch: number; yaw: number; roll: number };
  pulseEstimate: number | null;
  pulseConfidence: number;
  isCalibrating: boolean;
  isRecording: boolean;
}

export const BiometricsLivePanel = ({
  eyeContact,
  gazeStability,
  breathingRate,
  blinkRate,
  headPose,
  pulseEstimate,
  pulseConfidence,
  isCalibrating,
  isRecording
}: BiometricsLivePanelProps) => {
  // Clinical interpretation helpers
  const getEyeContactInterpretation = (value: number) => {
    if (value >= 70) return { label: 'Good', color: 'text-success' };
    if (value >= 40) return { label: 'Reduced', color: 'text-warning' };
    return { label: 'Poor', color: 'text-destructive' };
  };

  const getBreathingInterpretation = (rate: number) => {
    if (rate >= 12 && rate <= 20) return { label: 'Normal', color: 'text-success' };
    if (rate < 12) return { label: 'Slow', color: 'text-warning' };
    if (rate > 20 && rate <= 25) return { label: 'Elevated', color: 'text-warning' };
    return { label: 'Abnormal', color: 'text-destructive' };
  };

  const getPulseInterpretation = (bpm: number | null) => {
    if (bpm === null) return { label: 'Measuring...', color: 'text-muted-foreground' };
    if (bpm >= 60 && bpm <= 100) return { label: 'Normal', color: 'text-success' };
    if (bpm < 60) return { label: 'Bradycardia', color: 'text-warning' };
    if (bpm > 100 && bpm <= 120) return { label: 'Tachycardia', color: 'text-warning' };
    return { label: 'Abnormal', color: 'text-destructive' };
  };

  const getBlinkInterpretation = (rate: number) => {
    // Normal blink rate is 15-20 per minute
    if (rate >= 12 && rate <= 25) return { label: 'Normal', color: 'text-success' };
    if (rate < 12) return { label: 'Reduced', color: 'text-warning' };
    return { label: 'Elevated', color: 'text-warning' };
  };

  const eyeContactStatus = getEyeContactInterpretation(eyeContact);
  const breathingStatus = getBreathingInterpretation(breathingRate);
  const pulseStatus = getPulseInterpretation(pulseEstimate);
  const blinkStatus = getBlinkInterpretation(blinkRate);

  if (!isRecording) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground py-4">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Start recording to see live biometrics</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <h4 className="font-semibold flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Live Biometrics
      </h4>

      {/* Pulse Estimate - Featured */}
      <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            <span className="font-medium">Heart Rate (Est.)</span>
          </div>
          <div className="text-right">
            {isCalibrating ? (
              <span className="text-sm text-muted-foreground animate-pulse">
                Calibrating...
              </span>
            ) : (
              <>
                <span className="text-2xl font-bold text-destructive">
                  {pulseEstimate ?? '--'}
                </span>
                <span className="text-sm text-muted-foreground ml-1">BPM</span>
              </>
            )}
          </div>
        </div>
        {!isCalibrating && pulseEstimate && (
          <div className="flex items-center justify-between text-xs">
            <span className={pulseStatus.color}>{pulseStatus.label}</span>
            <span className="text-muted-foreground">
              Confidence: {pulseConfidence}%
            </span>
          </div>
        )}
        {isCalibrating && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Keep face still and well-lit for accurate reading
          </p>
        )}
      </div>

      {/* Eye Contact */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-sm">Eye Contact</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${eyeContactStatus.color}`}>
              {eyeContactStatus.label}
            </span>
            <span className="text-sm font-medium">{eyeContact}%</span>
          </div>
        </div>
        <Progress value={eyeContact} className="h-2" />
      </div>

      {/* Gaze Stability */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm">Gaze Stability</span>
          </div>
          <span className="text-sm font-medium">{gazeStability}%</span>
        </div>
        <Progress value={gazeStability} className="h-2" />
      </div>

      {/* Breathing Rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-primary" />
            <span className="text-sm">Breathing Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${breathingStatus.color}`}>
              {breathingStatus.label}
            </span>
            <span className="text-sm font-medium">{breathingRate} bpm</span>
          </div>
        </div>
        <Progress value={(breathingRate / 30) * 100} className="h-2" />
      </div>

      {/* Blink Rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Blink Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${blinkStatus.color}`}>
              {blinkStatus.label}
            </span>
            <span className="text-sm font-medium">{blinkRate}/min</span>
          </div>
        </div>
      </div>

      {/* Head Position */}
      <div className="pt-2 border-t">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">Head Position</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground">Pitch</div>
            <div className="font-medium">{headPose.pitch}°</div>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground">Yaw</div>
            <div className="font-medium">{headPose.yaw}°</div>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground">Roll</div>
            <div className="font-medium">{headPose.roll}°</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
