import { VisualObservation } from '@/types/overshoot';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Eye, Brain, Activity, Zap, AlertTriangle } from 'lucide-react';

interface BiometricTimelineProps {
  observations: VisualObservation[];
  currentObservation: VisualObservation | null;
}

export function BiometricTimeline({ observations, currentObservation }: BiometricTimelineProps) {
  // Filter out invalid/incomplete observations
  const validObservations = observations.filter(obs =>
    obs &&
    obs.emotion &&
    obs.emotion !== 'null' &&
    obs.confidence_score > 20 // Only show observations with >20% confidence
  );

  // Prepare data for charts (last 15 valid observations)
  const chartData = validObservations.slice(0, 15).reverse().map((obs, idx) => ({
    index: idx,
    eyeContact: obs.eye_contact,
    gazeStability: obs.gaze_stability,
    arousal: obs.arousal_level,
    engagement: obs.engagement_level,
    tension: Math.round((obs.jaw_tension + obs.forehead_tension) / 2),
  }));

  // Get metrics from current observation
  const current = currentObservation || validObservations[0];
  if (!current) {
    return (
      <Card className="p-12 text-center">
        <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="text-muted-foreground">Waiting for visual data...</p>
      </Card>
    );
  }

  // Calculate stress indicators
  const stressScore = Math.round(
    (current.jaw_tension + current.forehead_tension + current.restlessness + (100 - current.gaze_stability)) / 4
  );

  const getStressColor = (score: number) => {
    if (score < 30) return 'text-green-500';
    if (score < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      'calm': 'bg-green-500',
      'neutral': 'bg-blue-500',
      'anxious': 'bg-orange-500',
      'stressed': 'bg-red-500',
      'sad': 'bg-purple-500',
      'happy': 'bg-yellow-500',
      'angry': 'bg-red-600',
      'fearful': 'bg-red-700',
    };
    return colors[emotion.toLowerCase()] || 'bg-gray-500';
  };

  // Count significant alerts
  const alertCount = [
    current.distress_signal && current.distress_signal !== 'null' ? 1 : 0,
    current.micro_expressions && current.micro_expressions !== 'null' ? 1 : 0,
    current.visible_tremor && current.visible_tremor !== 'null' ? 1 : 0,
    current.self_soothing && current.self_soothing !== 'null' ? 1 : 0,
    stressScore > 70 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Current State Summary - Key Clinical Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Emotion</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getEmotionColor(current.emotion)} text-white border-0 text-xs`}>
              {current.emotion}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{current.emotional_valence}</div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground">Engagement</span>
          </div>
          <div className="text-2xl font-bold text-green-500">{current.engagement_level}%</div>
          <div className="text-xs text-muted-foreground mt-1">{current.gaze_direction}</div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-muted-foreground">Arousal</span>
          </div>
          <div className="text-2xl font-bold text-purple-500">{current.arousal_level}%</div>
          <div className="text-xs text-muted-foreground mt-1">Energy level</div>
        </Card>

        <Card className={`p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-muted-foreground">Stress</span>
          </div>
          <div className={`text-2xl font-bold ${getStressColor(stressScore)}`}>{stressScore}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {alertCount > 0 ? `${alertCount} alert${alertCount > 1 ? 's' : ''}` : 'No alerts'}
          </div>
        </Card>
      </div>

      {/* Clinical Trends - Simplified */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Engagement & Eye Contact */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Engagement Trend
          </h3>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="index" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip />
              <Area type="monotone" dataKey="engagement" stroke="#10b981" fill="url(#engagementGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="eyeContact" stroke="#3b82f6" strokeWidth={1} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Contact: {current.eye_contact}%</span>
            <span>Stability: {current.gaze_stability}%</span>
          </div>
        </Card>

        {/* Arousal & Tension */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Arousal & Tension
          </h3>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData}>
              <XAxis dataKey="index" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip />
              <Line type="monotone" dataKey="arousal" stroke="#a855f7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tension" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Arousal: {current.arousal_level}%</span>
            <span>Tension: {Math.round((current.jaw_tension + current.forehead_tension) / 2)}%</span>
          </div>
        </Card>
      </div>

      {/* Current Clinical Observations */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Current Observations</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Posture:</span>
            <Badge variant="outline" className="ml-2">{current.posture}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Breathing:</span>
            <Badge variant="outline" className="ml-2">{current.breathing_rate} BPM</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Blink Rate:</span>
            <Badge variant="outline" className="ml-2">{current.blink_rate}/min</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Gestures:</span>
            <Badge variant="outline" className="ml-2">{current.hand_gestures}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Head:</span>
            <Badge variant="outline" className="ml-2">{current.head_movement}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Confidence:</span>
            <Badge variant="outline" className="ml-2">{current.confidence_score}%</Badge>
          </div>
        </div>

        {/* Alerts Section */}
        {alertCount > 0 && (
          <div className="mt-3 space-y-2">
            {current.distress_signal && current.distress_signal !== 'null' && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Distress: {current.distress_signal}
                </span>
              </div>
            )}
            {current.micro_expressions && current.micro_expressions !== 'null' && (
              <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-md">
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Micro-expression: {current.micro_expressions}
                </span>
              </div>
            )}
            {current.self_soothing && current.self_soothing !== 'null' && (
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                  Self-soothing: {current.self_soothing}
                </span>
              </div>
            )}
            {current.visible_tremor && current.visible_tremor !== 'null' && (
              <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-md">
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Tremor: {current.visible_tremor}
                </span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Recent State Changes (Novel observations only - max 5) */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Recent State Changes ({validObservations.length})</h3>
        <ScrollArea className="h-[180px]">
          <div className="space-y-2">
            {validObservations.slice(0, 5).map((obs, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 w-12 text-muted-foreground">
                  {new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex-1">
                  <Badge className={`${getEmotionColor(obs.emotion)} text-white border-0 text-xs`}>
                    {obs.emotion}
                  </Badge>
                  <span className="ml-2 text-muted-foreground">{obs.emotional_valence}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
