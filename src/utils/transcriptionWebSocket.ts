export interface TranscriptionMessage {
  type: string;
  text?: string;
  confidence?: number;
  words?: Array<{ word: string; start: number; end: number }>;
  speechMetrics?: {
    speechRate: number;
    pauseCount: number;
    avgPauseDuration: number;
    totalWords: number;
  };
  session_id?: string;
  message?: string;
  transcript?: string;
  turn_is_formatted?: boolean;
  speech_rate?: number;
  expires_at?: number;
  audio_duration_seconds?: number;
  session_duration_seconds?: number;
  error?: string;
}

export class TranscriptionWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;

  constructor(
    private supabaseUrl: string,
    private onMessage: (message: TranscriptionMessage) => void,
    private onError: (error: Error) => void,
    private onConnect: () => void,
    private onDisconnect: () => void
  ) {}

  connect(): void {
    try {
      // Convert HTTPS to WSS
      const wsUrl = this.supabaseUrl
        .replace('https://', 'wss://')
        .replace('http://', 'ws://');
      
      const url = `${wsUrl}/functions/v1/transcribe-audio`;
      console.log('Connecting to WebSocket:', url);

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.onConnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: TranscriptionMessage = JSON.parse(event.data);
          this.onMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        this.onError(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.onDisconnect();
        
        // Don't auto-reconnect - let user manually restart
        this.ws = null;
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.onError(error instanceof Error ? error : new Error('Failed to create WebSocket'));
    }
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send raw binary PCM data
      this.ws.send(audioData);
    }
  }

  disconnect(): void {
    if (this.ws) {
      // Send proper Terminate message for AssemblyAI v3
      this.ws.send(JSON.stringify({ type: 'Terminate' }));
      this.ws.close();
      this.ws = null;
    }
  }

  close(): void {
    this.disconnect();
  }
}
