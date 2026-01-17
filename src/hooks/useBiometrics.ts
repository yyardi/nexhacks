import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

export interface EmotionData {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

export interface BiometricData {
  eyeContact: number;
  gazeStability: number;
  breathingRate: number;
  blinkRate: number;
  headPose: { pitch: number; yaw: number; roll: number };
  emotions: EmotionData | null;
  dominantEmotion: string;
  faceDetected: boolean;
}

export const useBiometrics = (
  videoRef: React.RefObject<HTMLVideoElement>,
  isRecording: boolean
) => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyeContact, setEyeContact] = useState(0);
  const [gazeStability, setGazeStability] = useState(0);
  const [breathingRate, setBreathingRate] = useState(14);
  const [blinkRate, setBlinkRate] = useState(0);
  const [headPose, setHeadPose] = useState({ pitch: 0, yaw: 0, roll: 0 });
  const [emotions, setEmotions] = useState<EmotionData | null>(null);
  const [dominantEmotion, setDominantEmotion] = useState('neutral');

  const animationRef = useRef<number>();
  const lastPositionsRef = useRef<{ x: number; y: number }[]>([]);
  const blinkHistoryRef = useRef<{ timestamp: number; blinked: boolean }[]>([]);
  const eyeAspectRatioHistoryRef = useRef<number[]>([]);
  const chinPositionsRef = useRef<{ y: number; timestamp: number }[]>([]);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading face-api.js models...');
        const MODEL_URL = '/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        
        console.log('✅ Face-api.js models loaded');
        setModelsLoaded(true);
      } catch (error) {
        console.error('Failed to load face-api.js models:', error);
      }
    };

    loadModels();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Process video frames
  useEffect(() => {
    if (!isRecording || !modelsLoaded || !videoRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const detectFaces = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        animationRef.current = requestAnimationFrame(detectFaces);
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
          }))
          .withFaceExpressions();

        if (detection) {
          setFaceDetected(true);

          // Process emotions
          const expr = detection.expressions;
          const emotionData: EmotionData = {
            neutral: expr.neutral,
            happy: expr.happy,
            sad: expr.sad,
            angry: expr.angry,
            fearful: expr.fearful,
            disgusted: expr.disgusted,
            surprised: expr.surprised
          };
          setEmotions(emotionData);

          // Find dominant emotion
          const dominant = Object.entries(emotionData).reduce((a, b) => 
            a[1] > b[1] ? a : b
          );
          setDominantEmotion(dominant[0]);

          // Calculate eye contact based on face position in frame
          const box = detection.detection.box;
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          const videoCenter = { x: video.videoWidth / 2, y: video.videoHeight / 2 };
          
          const distanceFromCenter = Math.sqrt(
            Math.pow(centerX - videoCenter.x, 2) + 
            Math.pow(centerY - videoCenter.y, 2)
          );
          const maxDistance = Math.sqrt(
            Math.pow(video.videoWidth / 2, 2) + 
            Math.pow(video.videoHeight / 2, 2)
          );
          const eyeContactScore = Math.max(0, 100 - (distanceFromCenter / maxDistance) * 100);
          setEyeContact(Math.round(eyeContactScore));

          // Calculate gaze stability from position history
          lastPositionsRef.current.push({ x: centerX, y: centerY });
          if (lastPositionsRef.current.length > 30) {
            lastPositionsRef.current.shift();
          }
          
          if (lastPositionsRef.current.length >= 10) {
            const positions = lastPositionsRef.current;
            let totalVariance = 0;
            for (let i = 1; i < positions.length; i++) {
              totalVariance += Math.abs(positions[i].x - positions[i-1].x) + 
                               Math.abs(positions[i].y - positions[i-1].y);
            }
            const avgVariance = totalVariance / positions.length;
            const stabilityScore = Math.max(0, 100 - avgVariance * 2);
            setGazeStability(Math.round(stabilityScore));
          }

          // Estimate head pose from face box proportions
          const aspectRatio = box.width / box.height;
          const yaw = (aspectRatio - 1) * 30;
          const pitch = ((centerY / video.videoHeight) - 0.5) * 30;
          setHeadPose({ 
            pitch: Math.round(pitch), 
            yaw: Math.round(yaw), 
            roll: 0 
          });

          // Track breathing from chin movement
          const chinY = box.y + box.height;
          chinPositionsRef.current.push({ y: chinY, timestamp: Date.now() });
          if (chinPositionsRef.current.length > 60) {
            chinPositionsRef.current.shift();
          }
          
          if (chinPositionsRef.current.length >= 30) {
            const positions = chinPositionsRef.current;
            let peaks = 0;
            for (let i = 1; i < positions.length - 1; i++) {
              if (positions[i].y > positions[i-1].y && positions[i].y > positions[i+1].y) {
                peaks++;
              }
            }
            const timespan = (positions[positions.length - 1].timestamp - positions[0].timestamp) / 1000;
            const breathsPerMinute = (peaks / timespan) * 60;
            setBreathingRate(Math.round(Math.min(30, Math.max(8, breathsPerMinute))));
          }

          // Estimate blink rate from expression changes
          const currentEAR = 1 - (expr.surprised + expr.happy) / 2;
          eyeAspectRatioHistoryRef.current.push(currentEAR);
          if (eyeAspectRatioHistoryRef.current.length > 30) {
            eyeAspectRatioHistoryRef.current.shift();
          }

          const now = Date.now();
          if (eyeAspectRatioHistoryRef.current.length >= 5) {
            const recentEAR = eyeAspectRatioHistoryRef.current.slice(-5);
            const avg = recentEAR.reduce((a, b) => a + b, 0) / recentEAR.length;
            const prevEARSlice = eyeAspectRatioHistoryRef.current.slice(-10, -5);
            const prevAvg = prevEARSlice.length > 0 ? prevEARSlice.reduce((a, b) => a + b, 0) / prevEARSlice.length : avg;
            
            if (avg > prevAvg + 0.1) {
              blinkHistoryRef.current.push({ timestamp: now, blinked: true });
            }
          }

          blinkHistoryRef.current = blinkHistoryRef.current.filter(
            b => now - b.timestamp < 60000
          );
          
          const blinks = blinkHistoryRef.current.filter(b => b.blinked).length;
          setBlinkRate(blinks);

        } else {
          setFaceDetected(false);
        }
      } catch (error) {
        // Silently handle detection errors
      }

      animationRef.current = requestAnimationFrame(detectFaces);
    };

    detectFaces();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, modelsLoaded, videoRef]);

  return {
    modelsLoaded,
    faceDetected,
    eyeContact,
    gazeStability,
    breathingRate,
    blinkRate,
    headPose,
    emotions,
    dominantEmotion
  };
};
