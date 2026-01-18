/**
 * Overshoot Type Definitions for Arden
 * Milestone 1 & 2: Visual Observation and Temporal Memory
 * Enhanced with complete biometric measurements
 */

export interface VisualObservation {
  timestamp: number;

  // Emotion & Affect
  emotion: string;
  emotional_valence: string;
  arousal_level: number;
  micro_expressions: string | null;

  // Eye Behavior
  eye_contact: number;
  gaze_direction: string;
  gaze_stability: number;
  blink_rate: number;
  eye_widening: number;
  pupil_response: string;

  // Facial Tension
  eyebrow_position: string;
  forehead_tension: number;
  jaw_tension: number;
  lip_tension: number;

  // Head & Posture
  head_tilt: number;
  head_movement: string;
  posture: string;

  // Breathing & Physiology
  breathing_rate: number;
  breathing_depth: string;
  breathing_pattern: string;
  visible_tremor: string | null;
  skin_changes: string | null;

  // Behavior & Engagement
  fidgeting: number;
  self_soothing: string | null;
  hand_gestures: string;
  engagement_level: number;
  restlessness: number;

  // Distress Indicators
  distress_signal: string | null;
  confidence_score: number;
}

export interface TemporalMemoryConfig {
  memoryWindowMs: number; // How long to remember observations (default: 60000ms)
}

export interface OvershotResult {
  result: string;
  inference_latency_ms: number;
  total_latency_ms: number;
}
