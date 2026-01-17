import { useEffect, useRef, useState, useCallback } from 'react';

interface PulseDataPoint {
  timestamp: number;
  brightness: number;
  bpm?: number;
}

export interface PulseEstimation {
  currentBPM: number | null;
  confidence: number;
  history: PulseDataPoint[];
  isCalibrating: boolean;
}

export const usePulseEstimation = (
  videoRef: React.RefObject<HTMLVideoElement>,
  isRecording: boolean
) => {
  const [currentBPM, setCurrentBPM] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState<PulseDataPoint[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number>();
  const brightnessHistoryRef = useRef<{ brightness: number; timestamp: number }[]>([]);
  const sampleCountRef = useRef(128);
  const lastBPMUpdateRef = useRef(0);

  // Initialize canvas for pixel analysis
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    canvasRef.current = canvas;
    ctxRef.current = canvas.getContext('2d', { willReadFrequently: true });
  }, []);

  // Calculate BPM from brightness history using peak detection
  const calculateBPM = useCallback(() => {
    const history = brightnessHistoryRef.current;
    if (history.length < 60) {
      setIsCalibrating(true);
      return null;
    }

    setIsCalibrating(false);

    // Get brightness values
    const values = history.map(h => h.brightness);
    const timestamps = history.map(h => h.timestamp);
    
    // Calculate mean and normalize
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const normalized = values.map(v => v - mean);
    
    // Simple peak detection
    const peaks: number[] = [];
    for (let i = 2; i < normalized.length - 2; i++) {
      const isPeak = normalized[i] > normalized[i - 1] && 
                     normalized[i] > normalized[i - 2] &&
                     normalized[i] > normalized[i + 1] && 
                     normalized[i] > normalized[i + 2];
      
      // Only count significant peaks
      const stdDev = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0) / normalized.length);
      if (isPeak && normalized[i] > stdDev * 0.3) {
        peaks.push(timestamps[i]);
      }
    }

    if (peaks.length < 2) return null;

    // Calculate average interval between peaks
    let totalInterval = 0;
    for (let i = 1; i < peaks.length; i++) {
      totalInterval += peaks[i] - peaks[i - 1];
    }
    const avgInterval = totalInterval / (peaks.length - 1);
    
    // Convert to BPM (interval is in ms, we want beats per minute)
    const bpm = Math.round(60000 / avgInterval);
    
    // Filter unrealistic values (normal resting HR is 60-100, but can be 40-180)
    if (bpm >= 40 && bpm <= 180) {
      // Calculate confidence based on consistency of peaks
      const intervals: number[] = [];
      for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
      }
      const intervalMean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const intervalVariance = intervals.reduce((sum, v) => sum + Math.pow(v - intervalMean, 2), 0) / intervals.length;
      const intervalStdDev = Math.sqrt(intervalVariance);
      const coeffOfVariation = intervalStdDev / intervalMean;
      
      // Lower variation = higher confidence
      const newConfidence = Math.max(0, Math.min(100, Math.round((1 - coeffOfVariation) * 100)));
      setConfidence(newConfidence);
      
      return bpm;
    }

    return null;
  }, []);

  // Main processing loop
  useEffect(() => {
    if (!isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    console.log('💓 Starting pulse estimation...');
    let isRunning = true;

    const processFrame = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;

      if (!video || !ctx || !canvas || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      try {
        // Sample a region of the face (forehead area is best for pulse)
        // Assuming mirrored video, we sample from center-top area
        const sx = video.videoWidth * 0.35; // Start X at 35% of width
        const sy = video.videoHeight * 0.15; // Start Y at 15% of height (forehead)
        const sw = video.videoWidth * 0.3;   // Width: 30% of video
        const sh = video.videoHeight * 0.15; // Height: 15% of video

        // Draw region to canvas
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 100, 100);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const pixels = imageData.data;

        // Calculate average brightness (using green channel - best for pulse detection)
        let greenSum = 0;
        for (let i = 1; i < pixels.length; i += 4) {
          greenSum += pixels[i]; // Green channel
        }
        const avgGreen = greenSum / (pixels.length / 4);

        const now = Date.now();
        brightnessHistoryRef.current.push({
          brightness: avgGreen,
          timestamp: now
        });

        // Keep only last N samples (about 4-5 seconds at 30fps)
        if (brightnessHistoryRef.current.length > sampleCountRef.current) {
          brightnessHistoryRef.current = brightnessHistoryRef.current.slice(-sampleCountRef.current);
        }

        // Update BPM every 500ms
        if (now - lastBPMUpdateRef.current > 500) {
          const bpm = calculateBPM();
          if (bpm !== null) {
            setCurrentBPM(bpm);
            
            // Add to history with timestamp
            setHistory(prev => {
              const newPoint: PulseDataPoint = {
                timestamp: now,
                brightness: avgGreen,
                bpm
              };
              const updated = [...prev, newPoint];
              // Keep last 10 minutes of data
              return updated.filter(p => now - p.timestamp < 600000);
            });
          }
          lastBPMUpdateRef.current = now;
        }
      } catch (error) {
        // Silent fail - video might not be ready
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => {
      console.log('💔 Stopping pulse estimation');
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, calculateBPM, videoRef]);

  // Reset when recording stops
  useEffect(() => {
    if (!isRecording) {
      brightnessHistoryRef.current = [];
      setIsCalibrating(true);
    }
  }, [isRecording]);

  return {
    currentBPM,
    confidence,
    history,
    isCalibrating
  };
};
