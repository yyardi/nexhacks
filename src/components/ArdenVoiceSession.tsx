import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useTrackTranscription,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Mic, MicOff, Phone, PhoneOff, Volume2, AlertTriangle, Brain, Shield, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CrisisAlert {
  risk_level: 'moderate' | 'high' | 'imminent';
  category: string;
  reason: string;
  recommended_action: string;
  timestamp: number;
}

interface ArdenVoiceSessionProps {
  token: string;
  serverUrl: string;
  roomName: string;
  onTranscript?: (text: string, speaker: 'user' | 'agent') => void;
  onCrisisAlert?: (alert: CrisisAlert) => void;
  onEmotionUpdate?: (emotion: { dominant: string; confidence: number }) => void;
  emotions?: Record<string, number> | null;
  className?: string;
}

// Inner component that uses LiveKit hooks (must be inside LiveKitRoom)
function VoiceSessionInner({
  onTranscript,
  onCrisisAlert,
  emotions,
}: {
  onTranscript?: (text: string, speaker: 'user' | 'agent') => void;
  onCrisisAlert?: (alert: CrisisAlert) => void;
  emotions?: Record<string, number> | null;
}) {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const lastEmotionRef = useRef<string>('');
  const transcriptProcessedRef = useRef<Set<string>>(new Set());

  // Send emotion signals to agent when emotions change
  useEffect(() => {
    if (!emotions || !room) return;

    // Find dominant emotion
    const entries = Object.entries(emotions);
    if (entries.length === 0) return;

    entries.sort((a, b) => b[1] - a[1]);
    const [dominant, confidence] = entries[0];

    // Only send if emotion changed significantly
    if (dominant === lastEmotionRef.current) return;
    lastEmotionRef.current = dominant;

    // Calculate emotion metrics
    const sadness = emotions['sad'] || 0;
    const anxiety = (emotions['fearful'] || 0) + (emotions['surprised'] || 0) * 0.5;
    const agitation = (emotions['angry'] || 0) + (emotions['disgusted'] || 0) * 0.5;

    // Send via data channel
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      type: 'emotion_signal',
      dominant_emotion: dominant,
      confidence: confidence,
      sadness_level: sadness,
      anxiety_indicators: anxiety,
      agitation_level: agitation,
      timestamp: Date.now(),
    }));

    localParticipant.publishData(data, { reliable: true }).catch(console.error);
  }, [emotions, room, localParticipant]);

  // Handle data messages from agent (crisis alerts)
  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));

        if (message.type === 'crisis_alert' && onCrisisAlert) {
          onCrisisAlert(message);
        }
      } catch (e) {
        console.error('Failed to parse agent data:', e);
      }
    };

    room.on('dataReceived', handleData);
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room, onCrisisAlert]);

  // Process agent transcriptions
  useEffect(() => {
    if (!agentTranscriptions || !onTranscript) return;

    agentTranscriptions.forEach((segment) => {
      const key = `agent-${segment.id}`;
      if (!transcriptProcessedRef.current.has(key) && segment.final) {
        transcriptProcessedRef.current.add(key);
        onTranscript(segment.text, 'agent');
      }
    });
  }, [agentTranscriptions, onTranscript]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Agent State Indicator */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-3 h-3 rounded-full",
          state === 'listening' && "bg-green-500 animate-pulse",
          state === 'thinking' && "bg-yellow-500 animate-pulse",
          state === 'speaking' && "bg-blue-500 animate-pulse",
          state === 'idle' && "bg-gray-400",
          state === 'connecting' && "bg-orange-500 animate-pulse",
          state === 'disconnected' && "bg-red-500",
        )} />
        <span className="text-sm font-medium capitalize">
          {state === 'listening' ? 'Listening...' :
           state === 'thinking' ? 'Thinking...' :
           state === 'speaking' ? 'Speaking...' :
           state === 'connecting' ? 'Connecting...' :
           state === 'idle' ? 'Ready' : 'Disconnected'}
        </span>
      </div>

      {/* Audio Visualizer */}
      {audioTrack && (
        <div className="w-full h-16 bg-muted/30 rounded-lg overflow-hidden">
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={32}
            options={{
              minHeight: 4,
            }}
          />
        </div>
      )}

      {/* Control Bar */}
      <VoiceAssistantControlBar />

      {/* Audio Renderer */}
      <RoomAudioRenderer />
    </div>
  );
}

export function ArdenVoiceSession({
  token,
  serverUrl,
  roomName,
  onTranscript,
  onCrisisAlert,
  onEmotionUpdate,
  emotions,
  className,
}: ArdenVoiceSessionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>([]);

  const handleCrisisAlert = useCallback((alert: CrisisAlert) => {
    setCrisisAlerts(prev => [...prev, alert]);
    onCrisisAlert?.(alert);
  }, [onCrisisAlert]);

  const dismissAlert = useCallback((index: number) => {
    setCrisisAlerts(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Crisis Alerts */}
      {crisisAlerts.length > 0 && (
        <div className="space-y-2">
          {crisisAlerts.map((alert, index) => (
            <Card
              key={index}
              className={cn(
                "p-4 border-2",
                alert.risk_level === 'imminent' && "border-red-500 bg-red-500/10 animate-pulse",
                alert.risk_level === 'high' && "border-orange-500 bg-orange-500/10",
                alert.risk_level === 'moderate' && "border-yellow-500 bg-yellow-500/10",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={cn(
                    "h-5 w-5 mt-0.5",
                    alert.risk_level === 'imminent' && "text-red-500",
                    alert.risk_level === 'high' && "text-orange-500",
                    alert.risk_level === 'moderate' && "text-yellow-500",
                  )} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={alert.risk_level === 'imminent' ? 'destructive' : 'outline'}>
                        {alert.risk_level.toUpperCase()} RISK
                      </Badge>
                      <span className="text-sm font-medium capitalize">{alert.category}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.reason}</p>
                    <p className="text-sm mt-2 font-medium">{alert.recommended_action}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(index)}
                >
                  Dismiss
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* LiveKit Room */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Arden Voice Assistant</h3>
            <p className="text-xs text-muted-foreground">AI-Powered Psychiatric Interview</p>
          </div>
        </div>

        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onConnected={() => setIsConnected(true)}
          onDisconnected={() => setIsConnected(false)}
          className="w-full"
        >
          <VoiceSessionInner
            onTranscript={onTranscript}
            onCrisisAlert={handleCrisisAlert}
            emotions={emotions}
          />
        </LiveKitRoom>
      </Card>

      {/* Feature Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-medium">Voice AI</p>
            <p className="text-[10px] text-muted-foreground">GPT-4.1 + Cartesia</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-orange-500" />
          <div>
            <p className="text-xs font-medium">Crisis Detection</p>
            <p className="text-[10px] text-muted-foreground">Real-time monitoring</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" />
          <div>
            <p className="text-xs font-medium">Assessments</p>
            <p className="text-[10px] text-muted-foreground">PHQ-9, GAD-7, C-SSRS</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500" />
          <div>
            <p className="text-xs font-medium">Emotion-Aware</p>
            <p className="text-[10px] text-muted-foreground">Adaptive responses</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Standalone connect button component
export function ArdenConnectButton({
  onConnect,
  isConnecting,
  isConnected,
  className,
}: {
  onConnect: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  className?: string;
}) {
  return (
    <Button
      onClick={onConnect}
      disabled={isConnecting || isConnected}
      className={cn("gap-2", className)}
      variant={isConnected ? "secondary" : "default"}
    >
      {isConnecting ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Connecting...
        </>
      ) : isConnected ? (
        <>
          <Phone className="h-4 w-4" />
          Connected
        </>
      ) : (
        <>
          <Phone className="h-4 w-4" />
          Start Voice Session
        </>
      )}
    </Button>
  );
}
