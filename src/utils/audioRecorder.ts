export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  constructor(
    private onAudioData: (audioData: ArrayBuffer) => void,
    private onError: (error: Error) => void
  ) {}

  async start(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: 16000,
      });

      // Create source and processor
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const audioData = this.encodeAudioData(new Float32Array(inputData));
        this.onAudioData(audioData);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      console.log('Audio recording started');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      this.onError(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }

  stop(): void {
    try {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }

      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }

      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }

      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      console.log('Audio recording stopped');
    } catch (error) {
      console.error('Error stopping audio recording:', error);
    }
  }

  private encodeAudioData(float32Array: Float32Array): ArrayBuffer {
    // Convert Float32Array to Int16Array (PCM16)
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return int16Array.buffer;
  }
}
