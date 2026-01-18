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
  // Prepare data for charts (last 20 observations)
  const chartData = observations.slice(0, 20).reverse().map((obs, idx) => ({
    index: idx,
    eyeContact: obs.eye_contact,
    gazeStability: obs.gaze_stability,
    blinkRate: obs.blink_rate,
    breathingRate: obs.breathing_rate,
    arousal: obs.arousal_level,
    engagement: obs.engagement_level,
    fidgeting: obs.fidgeting,
    jawTension: obs.jaw_tension,
    foreheadTension: obs.forehead_tension,
    restlessness: obs.restlessness,
  }));

  // Get metrics from current observation
  const current = currentObservation || observations[0];
  if (!current) return null;

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

  return (
    <div className="space-y-4">
      {/* Current State Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Emotion</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getEmotionColor(current.emotion)} text-white border-0`}>
              {current.emotion}
            </Badge>
            <span className="text-xs text-muted-foreground">{current.emotional_valence}</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-muted-foreground">Arousal</span>
          </div>
          <div className="text-2xl font-bold text-purple-500">{current.arousal_level}%</div>
          <div className="text-xs text-muted-foreground mt-1">Energy level</div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground">Engagement</span>
          </div>
          <div className="text-2xl font-bold text-green-500">{current.engagement_level}%</div>
          <div className="text-xs text-muted-foreground mt-1">{current.gaze_direction}</div>
        </Card>

        <Card className={`p-4 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground">Stress</span>
          </div>
          <div className={`text-2xl font-bold ${getStressColor(stressScore)}`}>{stressScore}%</div>
          <div className="text-xs text-muted-foreground mt-1">Tension indicators</div>
        </Card>
      </div>

      {/* Eye Behavior Chart */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4 text-blue-500" />
          <h3 className="font-semibold text-sm">Eye Behavior</h3>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="eyeContactGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gazeStabilityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="index" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip />
            <Area type="monotone" dataKey="eyeContact" stroke="#3b82f6" fill="url(#eyeContactGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="gazeStability" stroke="#10b981" fill="url(#gazeStabilityGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-muted-foreground">Eye Contact: {current.eye_contact}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Gaze Stability: {current.gaze_stability}%</span>
          </div>
        </div>
      </Card>

      {/* Physiological Signals Chart */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-red-500" />
          <h3 className="font-semibold text-sm">Physiological Signals</h3>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData}>
            <XAxis dataKey="index" hide />
            <YAxis hide />
            <Tooltip />
            <Line type="monotone" dataKey="breathingRate" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="blinkRate" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground">Breathing: {current.breathing_rate} BPM ({current.breathing_pattern})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-muted-foreground">Blink Rate: {current.blink_rate}/min</span>
          </div>
        </div>
      </Card>

      {/* Tension & Stress Indicators */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-sm">Tension & Stress Indicators</h3>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="tensionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="index" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip />
            <Area type="monotone" dataKey="jawTension" stroke="#ef4444" fill="url(#tensionGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="foreheadTension" stroke="#f59e0b" fill="none" strokeWidth={2} />
            <Area type="monotone" dataKey="restlessness" stroke="#ec4899" fill="none" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
          <div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-muted-foreground">Jaw</span>
            </div>
            <div className="font-semibold">{current.jaw_tension}%</div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-muted-foreground">Forehead</span>
            </div>
            <div className="font-semibold">{current.forehead_tension}%</div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <span className="text-muted-foreground">Restless</span>
            </div>
            <div className="font-semibold">{current.restlessness}%</div>
          </div>
        </div>
      </Card>

      {/* Behavioral Observations */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Behavioral Observations</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Posture:</span>
            <Badge variant="outline" className="ml-2">{current.posture}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Head Position:</span>
            <Badge variant="outline" className="ml-2">{current.head_tilt}°</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Head Movement:</span>
            <Badge variant="outline" className="ml-2">{current.head_movement}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Hand Gestures:</span>
            <Badge variant="outline" className="ml-2">{current.hand_gestures}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Fidgeting:</span>
            <Badge variant="outline" className="ml-2">{current.fidgeting}%</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Eyebrow:</span>
            <Badge variant="outline" className="ml-2">{current.eyebrow_position}</Badge>
          </div>
        </div>

        {current.self_soothing && (
          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
              Self-soothing detected: {current.self_soothing}
            </span>
          </div>
        )}

        {current.micro_expressions && (
          <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-md">
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              Micro-expression: {current.micro_expressions}
            </span>
          </div>
        )}

        {current.visible_tremor && (
          <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-md">
            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              Tremor detected: {current.visible_tremor}
            </span>
          </div>
        )}

        {current.skin_changes && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              Skin changes: {current.skin_changes}
            </span>
          </div>
        )}
      </Card>

      {/* Observation History */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Recent Observations ({observations.length})</h3>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {observations.slice(0, 10).map((obs, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 w-16 text-muted-foreground">
                  {new Date(obs.timestamp).toLocaleTimeString()}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getEmotionColor(obs.emotion)} text-white border-0 text-xs`}>
                      {obs.emotion}
                    </Badge>
                    <span className="text-muted-foreground">{obs.emotional_valence}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {obs.gaze_direction} • {obs.posture} • {obs.hand_gestures}
                  </div>
                  {obs.distress_signal && (
                    <div className="text-red-500 font-medium">
                      Distress: {obs.distress_signal}
                    </div>
                  )}
                </div>
                <div className="text-muted-foreground text-xs">
                  {obs.confidence_score}% conf.
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
