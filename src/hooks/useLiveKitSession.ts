import { useState, useCallback, useRef, useEffect } from 'react';
import { Room, RoomEvent, DataPacket_Kind, RemoteParticipant, LocalParticipant } from 'livekit-client';

export interface CrisisAlert {
  type: 'crisis_alert';
  risk_level: 'moderate' | 'high' | 'imminent';
  category: 'suicide' | 'self_harm' | 'violence' | 'psychosis';
  reason: string;
  recommended_action: string;
  timestamp: number;
}

export interface EmotionSignal {
  dominant_emotion: string;
  confidence: number;
  agitation_level: number;
  sadness_level: number;
  anxiety_indicators: number;
}

export interface LiveKitSessionState {
  isConnected: boolean;
  isConnecting: boolean;
  agentConnected: boolean;
  error: string | null;
  crisisAlerts: CrisisAlert[];
  transcript: Array<{ speaker: 'agent' | 'user'; text: string; timestamp: number }>;
}

export function useLiveKitSession() {
  const [state, setState] = useState<LiveKitSessionState>({
    isConnected: false,
    isConnecting: false,
    agentConnected: false,
    error: null,
    crisisAlerts: [],
    transcript: [],
  });

  const roomRef = useRef<Room | null>(null);
  const tokenRef = useRef<string | null>(null);

  // Generate a new token for the session
  const generateToken = useCallback(async (roomName: string, identity: string): Promise<string> => {
    const url = import.meta.env.VITE_LIVEKIT_URL;
    const apiKey = import.meta.env.VITE_LIVEKIT_API_KEY;
    const apiSecret = import.meta.env.VITE_LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      throw new Error('LiveKit credentials not configured. Please set VITE_LIVEKIT_URL, VITE_LIVEKIT_API_KEY, and VITE_LIVEKIT_API_SECRET');
    }

    // For production, you'd call a backend endpoint to generate tokens
    // For development, we use a static token or call Supabase edge function
    const response = await fetch('/api/livekit-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, identity }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate token');
    }

    const data = await response.json();
    return data.token;
  }, []);

  // Connect to LiveKit room
  const connect = useCallback(async (roomName: string, token: string) => {
    const url = import.meta.env.VITE_LIVEKIT_URL;

    if (!url) {
      setState(prev => ({ ...prev, error: 'LiveKit URL not configured' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Handle data messages from agent (crisis alerts, etc.)
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const decoder = new TextDecoder();
          const message = JSON.parse(decoder.decode(payload));

          if (message.type === 'crisis_alert') {
            setState(prev => ({
              ...prev,
              crisisAlerts: [...prev.crisisAlerts, message as CrisisAlert],
            }));
          }
        } catch (e) {
          console.error('Failed to parse data message:', e);
        }
      });

      // Track when agent connects
      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        if (participant.identity.includes('agent') || participant.identity.includes('arden')) {
          setState(prev => ({ ...prev, agentConnected: true }));
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        if (participant.identity.includes('agent') || participant.identity.includes('arden')) {
          setState(prev => ({ ...prev, agentConnected: false }));
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          agentConnected: false,
        }));
      });

      await room.connect(url, token);

      roomRef.current = room;
      tokenRef.current = token;

      // Check if agent is already in room
      const agentParticipant = Array.from(room.remoteParticipants.values()).find(
        p => p.identity.includes('agent') || p.identity.includes('arden')
      );

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        agentConnected: !!agentParticipant,
      }));

    } catch (error) {
      console.error('Failed to connect to LiveKit:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect',
      }));
    }
  }, []);

  // Disconnect from room
  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isConnected: false,
      agentConnected: false,
      crisisAlerts: [],
    }));
  }, []);

  // Send emotion signals to agent via data channel
  const sendEmotionSignal = useCallback(async (emotion: EmotionSignal) => {
    if (!roomRef.current || !state.isConnected) return;

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      type: 'emotion_signal',
      ...emotion,
      timestamp: Date.now(),
    }));

    try {
      await roomRef.current.localParticipant.publishData(data, {
        reliable: true,
      });
    } catch (e) {
      console.error('Failed to send emotion signal:', e);
    }
  }, [state.isConnected]);

  // Clear crisis alerts
  const clearCrisisAlerts = useCallback(() => {
    setState(prev => ({ ...prev, crisisAlerts: [] }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    room: roomRef.current,
    connect,
    disconnect,
    sendEmotionSignal,
    clearCrisisAlerts,
    generateToken,
  };
}
