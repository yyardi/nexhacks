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
You are observing a person speaking to an AI mental health companion.

Report ONLY what is directly visible.

Output JSON:
{
  "emotion": string | null,
  "behavior": string | null,
  "engagement": string | null,
  "distress_signal": string | null
}

Rules:
- No diagnoses
- No inferred thoughts or intentions
- No repetition
- Use neutral, descriptive language
- Null if nothing notable
- For emotion, provide ONE WORD to describe the user's facial emotion (e.g., "calm", "sad", "anxious", "neutral")
- For distress_signal, only report if clear signs of distress are visible (e.g., "crying", "head in hands")
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
          sampling_ratio: 0.15,
          fps: 24,
          clip_length_seconds: 3,
          delay_seconds: 1
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
