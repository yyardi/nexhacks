/**
 * Milestone 1: Overshoot Emotional & Behavioral Visual Observer
 * Custom React hook for real-time visual emotion observation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeVision } from '@overshoot/sdk';
import { VisualObservation } from '@/types/overshoot';
import { isNovelObservation, pruneMemory, resetMemory } from '@/utils/temporalEmotionMemory';

interface UseOvershotVisionOptions {
  apiKey: string;
  onNovelObservation?: (observation: VisualObservation) => void;
  onRawObservation?: (observation: VisualObservation) => void;
  cameraFacing?: 'user' | 'environment';
}

interface UseOvershotVisionReturn {
  isActive: boolean;
  currentObservation: VisualObservation | null;
  latency: {
    inference_ms: number;
    total_ms: number;
  } | null;
  error: string | null;
  startVision: () => Promise<void>;
  stopVision: () => Promise<void>;
  resetSession: () => void;
}

const OVERSHOOT_PROMPT = `
You are a clinical biometric analysis system observing a patient in real-time.

Analyze the person's facial expressions, eye movements, breathing patterns, and physical indicators.

Output JSON with precise measurements:
{
  "emotion": string | null,
  "behavior": string | null,
  "engagement": string | null,
  "distress_signal": string | null,
  "eye_contact": number | null,
  "gaze_stability": number | null,
  "breathing_rate": number | null,
  "blink_rate": number | null,
  "engagement_level": number | null
}

MEASUREMENT GUIDELINES:

emotion: ONE WORD describing facial emotion (e.g., "neutral", "calm", "anxious", "sad", "happy", "distressed", "fearful")

behavior: Observable physical behavior (e.g., "Still posture", "Fidgeting", "Hand gestures", "Head movement")

engagement: Descriptive engagement quality (e.g., "Focused", "Distracted", "Engaged", "Withdrawn")

distress_signal: ONLY if clear distress visible (e.g., "Crying", "Head in hands", "Visible trembling", null otherwise)

eye_contact: Percentage (0-100) of time making direct eye contact with camera
- 80-100: Strong consistent eye contact
- 50-80: Moderate eye contact
- 20-50: Intermittent eye contact
- 0-20: Avoiding eye contact

gaze_stability: Percentage (0-100) measuring how stable/steady their gaze is
- 80-100: Very stable, focused gaze
- 50-80: Mostly stable with some movement
- 20-50: Frequent eye movements, scanning
- 0-20: Rapid, unstable eye movements

breathing_rate: Estimated breaths per minute (typical range: 12-20)
- Watch for chest/shoulder movement
- Normal: 12-18 breaths/min
- Fast/anxious: 20+ breaths/min
- Slow/calm: <12 breaths/min

blink_rate: Estimated blinks per minute (typical range: 15-20)
- Normal: 15-20 blinks/min
- Anxious/stressed: 25+ blinks/min
- Focused/calm: <15 blinks/min

engagement_level: Overall engagement percentage (0-100)
- 80-100: Highly engaged, attentive, responsive
- 50-80: Moderately engaged
- 20-50: Low engagement, distracted
- 0-20: Disengaged, withdrawn

CRITICAL RULES:
- Base measurements on VISIBLE indicators only
- If you cannot reliably measure something, use null
- Be precise with numerical values
- No diagnoses or psychological interpretations
- Focus on objective physical observations
`;

export function useOvershotVision({
  apiKey,
  onNovelObservation,
  onRawObservation,
  cameraFacing = 'user'
}: UseOvershotVisionOptions): UseOvershotVisionReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentObservation, setCurrentObservation] = useState<VisualObservation | null>(null);
  const [latency, setLatency] = useState<{ inference_ms: number; total_ms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visionRef = useRef<RealtimeVision | null>(null);

  const handleResult = useCallback((result: any) => {
    try {
      // Parse the result
      const observation: VisualObservation = {
        timestamp: Date.now(),
        ...JSON.parse(result.result)
      };

      // Update latency metrics
      setLatency({
        inference_ms: result.inference_latency_ms || 0,
        total_ms: result.total_latency_ms || 0
      });

      // Always update current observation
      setCurrentObservation(observation);

      // Call raw observation callback if provided
      if (onRawObservation) {
        onRawObservation(observation);
      }

      // Check if observation is novel (Milestone 2: Temporal Memory)
      if (isNovelObservation(observation)) {
        // This is a new emotional state - forward it
        if (onNovelObservation) {
          onNovelObservation(observation);
        }
      }

      // Periodically prune old memory entries
      if (Math.random() < 0.1) { // 10% chance on each result
        pruneMemory();
      }
    } catch (err) {
      console.error('Failed to parse Overshoot result:', err);
      setError('Failed to parse visual observation');
    }
  }, [onNovelObservation, onRawObservation]);

  const startVision = useCallback(async () => {
    try {
      setError(null);

      // Initialize Overshoot RealtimeVision
      const vision = new RealtimeVision({
        apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
        apiKey,
        backend: 'overshoot',
        model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',

        prompt: OVERSHOOT_PROMPT,

        processing: {
          sampling_ratio: 0.3,          // 30% sampling for high-quality biometric analysis
          fps: 30,                      // 30 FPS for smooth capture
          clip_length_seconds: 2,       // 2-second clips for faster results
          delay_seconds: 0.5            // Update every 0.5 seconds for real-time feel
        },

        source: {
          type: 'camera',
          cameraFacing
        },

        onResult: handleResult
      });

      visionRef.current = vision;

      await vision.start();
      setIsActive(true);
    } catch (err: any) {
      console.error('Failed to start Overshoot vision:', err);
      setError(err.message || 'Failed to start visual observation');
      setIsActive(false);
    }
  }, [apiKey, cameraFacing, handleResult]);

  const stopVision = useCallback(async () => {
    try {
      if (visionRef.current) {
        await visionRef.current.stop();
        visionRef.current = null;
      }
      setIsActive(false);
      setCurrentObservation(null);
    } catch (err: any) {
      console.error('Failed to stop Overshoot vision:', err);
      setError(err.message || 'Failed to stop visual observation');
    }
  }, []);

  const resetSession = useCallback(() => {
    resetMemory();
    setCurrentObservation(null);
    setLatency(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (visionRef.current) {
        visionRef.current.stop();
      }
    };
  }, []);

  return {
    isActive,
    currentObservation,
    latency,
    error,
    startVision,
    stopVision,
    resetSession
  };
}
