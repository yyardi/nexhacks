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

const OVERSHOOT_PROMPT = `Analyze the person's face and body language. Provide measurements:

emotion: ONE WORD (e.g., neutral, calm, anxious, sad, happy, stressed)
behavior: Observable behavior (e.g., "Still", "Fidgeting", "Gesturing")
engagement: Description (e.g., "Focused", "Distracted", "Engaged")
distress_signal: Only if visible distress, otherwise null
eye_contact: Percentage 0-100 of eye contact with camera
gaze_stability: Percentage 0-100 of gaze steadiness
breathing_rate: Breaths per minute (12-20 normal)
blink_rate: Blinks per minute (15-20 normal)
engagement_level: Percentage 0-100 of overall engagement`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    emotion: { type: ['string', 'null'] },
    behavior: { type: ['string', 'null'] },
    engagement: { type: ['string', 'null'] },
    distress_signal: { type: ['string', 'null'] },
    eye_contact: { type: ['number', 'null'] },
    gaze_stability: { type: ['number', 'null'] },
    breathing_rate: { type: ['number', 'null'] },
    blink_rate: { type: ['number', 'null'] },
    engagement_level: { type: ['number', 'null'] }
  },
  required: ['emotion', 'behavior', 'engagement', 'distress_signal', 'eye_contact', 'gaze_stability', 'breathing_rate', 'blink_rate', 'engagement_level']
};

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
      console.log('[Overshoot] Raw result received:', result);

      // Check if result is ok
      if (!result.ok) {
        console.error('[Overshoot] Result error:', result.error);
        setError(result.error || 'Inference failed');
        return;
      }

      // Parse the result
      const observation: VisualObservation = {
        timestamp: Date.now(),
        ...JSON.parse(result.result)
      };

      console.log('[Overshoot] Parsed observation:', observation);

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
        console.log('[Overshoot] Novel observation detected');
        if (onNovelObservation) {
          onNovelObservation(observation);
        }
      }

      // Periodically prune old memory entries
      if (Math.random() < 0.1) { // 10% chance on each result
        pruneMemory();
      }
    } catch (err) {
      console.error('[Overshoot] Failed to parse result:', err, 'Raw result:', result);
      setError('Failed to parse visual observation');
    }
  }, [onNovelObservation, onRawObservation]);

  const startVision = useCallback(async () => {
    try {
      setError(null);
      console.log('[Overshoot] Starting vision with API key:', apiKey ? 'Present' : 'MISSING');

      if (!apiKey) {
        throw new Error('VITE_OVERSHOOT_API_KEY not found in environment');
      }

      // Initialize Overshoot RealtimeVision
      console.log('[Overshoot] Initializing RealtimeVision...');
      const vision = new RealtimeVision({
        apiUrl: 'https://api.overshoot.ai',
        apiKey,
        backend: 'overshoot',
        model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
        debug: true,

        prompt: OVERSHOOT_PROMPT,
        outputSchema: OUTPUT_SCHEMA,

        processing: {
          sampling_ratio: 0.2,
          fps: 30,
          clip_length_seconds: 1,
          delay_seconds: 1
        },

        source: {
          type: 'camera',
          cameraFacing
        },

        onResult: handleResult,
        onError: (err: Error) => {
          console.error('[Overshoot] Error callback:', err);
          console.error('[Overshoot] Error name:', err.name);
          console.error('[Overshoot] Error message:', err.message);
          setError(err.message || 'Unknown error occurred');
        }
      });

      visionRef.current = vision;

      console.log('[Overshoot] Starting vision.start()...');
      await vision.start();
      console.log('[Overshoot] Vision started successfully!');
      setIsActive(true);
    } catch (err: any) {
      console.error('[Overshoot] Failed to start vision:', err);
      console.error('[Overshoot] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
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
