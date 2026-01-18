import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Volume2, AlertTriangle, Brain, Shield, Activity, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { generateLiveKitToken } from '@/lib/livekit-token';

interface CrisisAlert {
  risk_level: 'moderate' | 'high' | 'imminent';
  category: string;
  reason: string;
  recommended_action: string;
  timestamp: number;
}

interface LiveKitVoicePanelProps {
  isEnabled: boolean;
  onTranscript?: (text: string, speaker: 'user' | 'agent') => void;
  onCrisisAlert?: (alert: CrisisAlert) => void;
  onConnectionChange?: (connected: boolean) => void;
  emotions?: Record<string, number> | null;
  className?: string;
}

// Inner component that uses LiveKit hooks
function VoiceAssistantUI({
  onTranscript,
  onCrisisAlert,
  emotions,
}: {
  onTranscript?: (text: string, speaker: 'user' | 'agent') => void;
  onCrisisAlert?: (alert: CrisisAlert) => void;
  emotions?: Record<string, number> | null;
}) {
  const voiceAssistant = useVoiceAssistant();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const lastEmotionRef = useRef<string>('');
  const transcriptProcessedRef = useRef<Set<string>>(new Set());

  const { state, audioTrack, agentTranscriptions } = voiceAssistant;

  // Send emotion signals to agent when emotions change
  useEffect(() => {
    if (!emotions || !room || !localParticipant) return;

    const entries = Object.entries(emotions);
    if (entries.length === 0) return;

    entries.sort((a, b) => b[1] - a[1]);
    const [dominant, confidence] = entries[0];

    if (dominant === lastEmotionRef.current) return;
    lastEmotionRef.current = dominant;

    const sadness = emotions['sad'] || 0;
    const anxiety = (emotions['fearful'] || 0) + (emotions['surprised'] || 0) * 0.5;
    const agitation = (emotions['angry'] || 0) + (emotions['disgusted'] || 0) * 0.5;

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

  // Handle data messages from agent
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

  // Process transcriptions
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
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full transition-colors",
            state === 'listening' && "bg-green-500 animate-pulse",
            state === 'thinking' && "bg-yellow-500 animate-pulse",
            state === 'speaking' && "bg-blue-500 animate-pulse",
            state === 'idle' && "bg-gray-400",
            state === 'connecting' && "bg-orange-500 animate-pulse",
            state === 'disconnected' && "bg-red-500",
          )} />
          <span className="text-sm font-medium">
            {state === 'listening' ? 'Listening to you...' :
             state === 'thinking' ? 'Arden is thinking...' :
             state === 'speaking' ? 'Arden is speaking...' :
             state === 'connecting' ? 'Connecting to Arden...' :
             state === 'idle' ? 'Ready' : 'Disconnected'}
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          <Waves className="w-3 h-3 mr-1" />
          Voice AI Active
        </Badge>
      </div>

      {/* Visualizer */}
      {audioTrack && (
        <div className="w-full h-20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg overflow-hidden border">
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={40}
            options={{ minHeight: 4 }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center">
        <VoiceAssistantControlBar />
      </div>

      <RoomAudioRenderer />
    </div>
  );
}

export function LiveKitVoicePanel({
  isEnabled,
  onTranscript,
  onCrisisAlert,
  onConnectionChange,
  emotions,
  className,
}: LiveKitVoicePanelProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>([]);

  const serverUrl = import.meta.env.VITE_LIVEKIT_URL || '';
  const roomName = `arden-session-${Date.now()}`;

  // Generate token when enabled
  useEffect(() => {
    if (!isEnabled) {
      setToken(null);
      return;
    }

    const createToken = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        const apiKey = import.meta.env.VITE_LIVEKIT_API_KEY;
        const apiSecret = import.meta.env.VITE_LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
          throw new Error('LiveKit credentials not configured');
        }

        // Generate token locally with unique room name
        const uniqueRoomName = `arden-session-${Date.now()}`;
        const generatedToken = await generateLiveKitToken(
          apiKey,
          apiSecret,
          uniqueRoomName,
          `user-${Date.now()}`,
          'Patient'
        );
        console.log('Connecting to room:', uniqueRoomName);

        setToken(generatedToken);
      } catch (e) {
        console.error('Token generation failed:', e);
        setError('Failed to connect to voice assistant. Please check configuration.');
      } finally {
        setIsConnecting(false);
      }
    };

    createToken();
  }, [isEnabled]);

  const handleCrisisAlert = useCallback((alert: CrisisAlert) => {
    setCrisisAlerts(prev => [...prev, alert]);
    onCrisisAlert?.(alert);
  }, [onCrisisAlert]);

  const dismissAlert = useCallback((index: number) => {
    setCrisisAlerts(prev => prev.filter((_, i) => i !== index));
  }, []);

  if (!isEnabled) {
    return null;
  }

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
                    "h-5 w-5 mt-0.5 flex-shrink-0",
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
                    <p className="text-sm mt-2 font-medium text-primary">{alert.recommended_action}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => dismissAlert(index)}>
                  Dismiss
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Voice Panel */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Arden Voice Assistant</h3>
            <p className="text-xs text-muted-foreground">AI-Powered Clinical Interview</p>
          </div>
        </div>

        {error ? (
          <div className="text-center py-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
              Retry
            </Button>
          </div>
        ) : isConnecting ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Connecting to Arden...</span>
          </div>
        ) : token && serverUrl ? (
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            audio={true}
            video={false}
            onConnected={() => onConnectionChange?.(true)}
            onDisconnected={() => onConnectionChange?.(false)}
          >
            <VoiceAssistantUI
              onTranscript={onTranscript}
              onCrisisAlert={handleCrisisAlert}
              emotions={emotions}
            />
          </LiveKitRoom>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Voice assistant not configured
          </div>
        )}
      </Card>

      {/* Feature Pills */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs gap-1">
          <Volume2 className="w-3 h-3" /> Voice AI
        </Badge>
        <Badge variant="secondary" className="text-xs gap-1">
          <Shield className="w-3 h-3" /> Crisis Detection
        </Badge>
        <Badge variant="secondary" className="text-xs gap-1">
          <Brain className="w-3 h-3" /> PHQ-9 / GAD-7
        </Badge>
        <Badge variant="secondary" className="text-xs gap-1">
          <Activity className="w-3 h-3" /> Emotion-Aware
        </Badge>
      </div>
    </div>
  );
}
