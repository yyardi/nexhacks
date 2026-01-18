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

const OVERSHOOT_PROMPT = `Analyze facial expressions, eye behavior, and body language for clinical mental health assessment.

Provide precise measurements:

EMOTION & AFFECT:
- emotion: Primary emotion (neutral/calm/anxious/stressed/sad/happy/angry/fearful)
- emotional_valence: Positive/negative/neutral emotional tone
- arousal_level: Energy level 0-100 (0=low energy, 100=high energy)
- micro_expressions: Brief involuntary expressions if visible, otherwise null

EYE BEHAVIOR:
- eye_contact: Direct eye contact percentage 0-100
- gaze_direction: Where looking (camera/away/down/up/left/right)
- gaze_stability: Steadiness 0-100 (0=darting, 100=steady)
- blink_rate: Blinks per minute (normal 15-20, anxiety >25)
- eye_widening: Eye openness 0-100 (0=narrow, 50=normal, 100=wide)
- pupil_response: Pupil size change (dilated/normal/constricted)

FACIAL TENSION:
- eyebrow_position: Raised/neutral/furrowed
- forehead_tension: Tension level 0-100
- jaw_tension: Clenching 0-100 (0=relaxed, 100=clenched)
- lip_tension: Pressing/biting 0-100

HEAD & POSTURE:
- head_tilt: Degrees from vertical (-90 to 90)
- head_movement: Still/nodding/shaking/frequent
- posture: Slouched/upright/leaning

BREATHING & PHYSIOLOGY:
- breathing_rate: Breaths per minute (12-20 normal, >20 anxious)
- breathing_depth: Shallow/normal/deep
- breathing_pattern: Regular/irregular/rapid
- visible_tremor: Any shaking/trembling, otherwise null
- skin_changes: Flushing/pallor/sweating visible, otherwise null

BEHAVIOR & ENGAGEMENT:
- fidgeting: Hand/finger movements 0-100
- self_soothing: Touching face/hair/neck, otherwise null
- hand_gestures: Expressive/minimal/restless/still
- engagement_level: Focus and presence 0-100
- restlessness: Overall movement 0-100

DISTRESS INDICATORS:
- distress_signal: Visible distress/crisis indicators, otherwise null
- confidence_score: Measurement confidence 0-100`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    // Emotion & Affect
    emotion: { type: 'string' },
    emotional_valence: { type: 'string' },
    arousal_level: { type: 'number' },
    micro_expressions: { type: ['string', 'null'] },

    // Eye Behavior
    eye_contact: { type: 'number' },
    gaze_direction: { type: 'string' },
    gaze_stability: { type: 'number' },
    blink_rate: { type: 'number' },
    eye_widening: { type: 'number' },
    pupil_response: { type: 'string' },

    // Facial Tension
    eyebrow_position: { type: 'string' },
    forehead_tension: { type: 'number' },
    jaw_tension: { type: 'number' },
    lip_tension: { type: 'number' },

    // Head & Posture
    head_tilt: { type: 'number' },
    head_movement: { type: 'string' },
    posture: { type: 'string' },

    // Breathing & Physiology
    breathing_rate: { type: 'number' },
    breathing_depth: { type: 'string' },
    breathing_pattern: { type: 'string' },
    visible_tremor: { type: ['string', 'null'] },
    skin_changes: { type: ['string', 'null'] },

    // Behavior & Engagement
    fidgeting: { type: 'number' },
    self_soothing: { type: ['string', 'null'] },
    hand_gestures: { type: 'string' },
    engagement_level: { type: 'number' },
    restlessness: { type: 'number' },

    // Distress Indicators
    distress_signal: { type: ['string', 'null'] },
    confidence_score: { type: 'number' }
  },
  required: [
    'emotion', 'emotional_valence', 'arousal_level', 'micro_expressions',
    'eye_contact', 'gaze_direction', 'gaze_stability', 'blink_rate', 'eye_widening', 'pupil_response',
    'eyebrow_position', 'forehead_tension', 'jaw_tension', 'lip_tension',
    'head_tilt', 'head_movement', 'posture',
    'breathing_rate', 'breathing_depth', 'breathing_pattern', 'visible_tremor', 'skin_changes',
    'fidgeting', 'self_soothing', 'hand_gestures', 'engagement_level', 'restlessness',
    'distress_signal', 'confidence_score'
  ]
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
        apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
        apiKey,
        model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',

        prompt: OVERSHOOT_PROMPT,
        outputSchema: OUTPUT_SCHEMA,

        processing: {
          sampling_ratio: 0.1,
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
