import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useLocalParticipant,
  useRoomContext,
  useTrackTranscription,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { Volume2, AlertTriangle, Brain, Shield, Activity, Waves, MessageCircle, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { generateLiveKitToken } from '@/lib/livekit-token';

interface CrisisAlert {
  risk_level: 'moderate' | 'high' | 'imminent';
  category: string;
  reason: string;
  recommended_action: string;
  timestamp: number;
}

interface TranscriptMessage {
  id: string;
  text: string;
  speaker: 'user' | 'agent';
  timestamp: number;
  isFinal: boolean;
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
  const { localParticipant, microphoneTrack } = useLocalParticipant();
  const lastEmotionRef = useRef<string>('');
  const transcriptProcessedRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const hasInitializedRef = useRef(false);

  const { state, audioTrack, agentTranscriptions } = voiceAssistant;

  // Log state changes for debugging
  useEffect(() => {
    console.log('[VoiceAssistant] State changed to:', state);
    
    // Initialize only once when first entering listening state
    if (state === 'listening' && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      console.log('[VoiceAssistant] Voice AI is now listening and ready');
    }
  }, [state]);

  // Reset initialization flag when room changes
  useEffect(() => {
    if (room) {
      hasInitializedRef.current = false;
      transcriptProcessedRef.current.clear();
      setTranscriptMessages([]);
      console.log('[VoiceAssistant] Room initialized, ready for new session');
    }
  }, [room]);

  // Get user transcriptions from local microphone track
  const micTrackRef = microphoneTrack?.track ? {
    participant: localParticipant,
    publication: microphoneTrack,
    source: Track.Source.Microphone,
  } : undefined;

  const { segments: userTranscriptions } = useTrackTranscription(micTrackRef);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptMessages]);

  // Process user transcriptions and add to messages
  useEffect(() => {
    if (!userTranscriptions) return;

    userTranscriptions.forEach((segment) => {
      const key = `user-${segment.id}`;

      // Update or add transcript message
      setTranscriptMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === key);
        const newMessage: TranscriptMessage = {
          id: key,
          text: segment.text,
          speaker: 'user',
          timestamp: Date.now(),
          isFinal: segment.final,
        };

        if (existingIndex >= 0) {
          // Update existing message
          const updated = [...prev];
          updated[existingIndex] = newMessage;
          return updated;
        } else {
          // Add new message
          return [...prev, newMessage];
        }
      });

      // Call callback for final transcripts
      if (segment.final && !transcriptProcessedRef.current.has(key) && onTranscript) {
        transcriptProcessedRef.current.add(key);
        onTranscript(segment.text, 'user');
      }
    });
  }, [userTranscriptions, onTranscript]);

  // Process agent transcriptions and add to messages
  useEffect(() => {
    if (!agentTranscriptions) return;

    agentTranscriptions.forEach((segment) => {
      const key = `agent-${segment.id}`;

      // Update or add transcript message
      setTranscriptMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === key);
        const newMessage: TranscriptMessage = {
          id: key,
          text: segment.text,
          speaker: 'agent',
          timestamp: Date.now(),
          isFinal: segment.final,
        };

        if (existingIndex >= 0) {
          // Update existing message
          const updated = [...prev];
          updated[existingIndex] = newMessage;
          return updated;
        } else {
          // Add new message
          return [...prev, newMessage];
        }
      });

      // Call callback for final transcripts
      if (segment.final && !transcriptProcessedRef.current.has(key) && onTranscript) {
        transcriptProcessedRef.current.add(key);
        onTranscript(segment.text, 'agent');
      }
    });
  }, [agentTranscriptions, onTranscript]);

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

      {/* Live Transcription Display */}
      <div className="border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Live Transcription</span>
          {transcriptMessages.length > 0 && (
            <Badge variant="secondary" className="text-xs ml-auto">
              {transcriptMessages.length} messages
            </Badge>
          )}
        </div>
        <ScrollArea className="h-48">
          <div ref={scrollRef} className="p-3 space-y-3">
            {transcriptMessages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Start speaking to see live transcription...
              </div>
            ) : (
              transcriptMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 items-start",
                    message.speaker === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.speaker === 'agent' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      message.speaker === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                      !message.isFinal && "opacity-70 italic"
                    )}
                  >
                    <p>{message.text}</p>
                    {!message.isFinal && (
                      <span className="text-xs opacity-70 ml-1">...</span>
                    )}
                  </div>
                  {message.speaker === 'user' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Visualizer */}
      {audioTrack && (
        <div className="w-full h-16 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg overflow-hidden border">
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
  const [connectionKey, setConnectionKey] = useState(0);
  const isGeneratingTokenRef = useRef(false);

  const serverUrl = import.meta.env.VITE_LIVEKIT_URL || '';

  // Generate a new token
  const createToken = useCallback(async () => {
    // Prevent duplicate token generation
    if (isGeneratingTokenRef.current) {
      console.log('[LiveKit] Token generation already in progress, skipping');
      return;
    }

    isGeneratingTokenRef.current = true;
    setIsConnecting(true);
    setError(null);
    setToken(null);

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
      console.log('[LiveKit] Connected to room:', uniqueRoomName);

      setToken(generatedToken);
    } catch (e) {
      console.error('[LiveKit] Token generation failed:', e);
      setError('Failed to connect to voice assistant. Please check configuration.');
    } finally {
      setIsConnecting(false);
      isGeneratingTokenRef.current = false;
    }
  }, []);

  // Complete cleanup when disabled
  const cleanup = useCallback(() => {
    console.log('[LiveKit] Cleaning up Voice AI session');
    setToken(null);
    setError(null);
    setIsConnecting(false);
    setCrisisAlerts([]);
    isGeneratingTokenRef.current = false;
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Generate token when enabled or connectionKey changes, cleanup when disabled
  useEffect(() => {
    if (!isEnabled) {
      cleanup();
      return;
    }

    // Fresh start when enabled
    console.log('[LiveKit] Voice AI enabled, initializing fresh session');
    createToken();

    // Cleanup on unmount or when disabled
    return () => {
      if (!isEnabled) {
        cleanup();
      }
    };
  }, [isEnabled, connectionKey, createToken, cleanup]);

  // Handle disconnection - regenerate token for reconnection
  const handleDisconnected = useCallback(() => {
    console.log('[LiveKit] Disconnected from room');
    onConnectionChange?.(false);
    // Set error to show reconnect option
    setError('Connection lost. Click retry to reconnect.');
    setToken(null);
    isGeneratingTokenRef.current = false;
  }, [onConnectionChange]);

  // Handle retry - regenerate token with new room
  const handleRetry = useCallback(() => {
    console.log('[LiveKit] Retrying connection');
    setError(null);
    isGeneratingTokenRef.current = false;
    setConnectionKey(prev => prev + 1);
  }, []);

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
            <Button variant="outline" size="sm" className="mt-2" onClick={handleRetry}>
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
            key={`${connectionKey}-${token.slice(0, 10)}`}
            token={token}
            serverUrl={serverUrl}
            connect={true}
            audio={true}
            video={false}
            onConnected={() => {
              console.log('[LiveKit] Successfully connected to room');
              onConnectionChange?.(true);
            }}
            onDisconnected={handleDisconnected}
            onError={(err) => {
              console.error('[LiveKit] Room error:', err);
              setError('Connection error. Click retry to reconnect.');
              setToken(null);
              isGeneratingTokenRef.current = false;
            }}
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
          <MessageCircle className="w-3 h-3" /> Live Transcription
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
